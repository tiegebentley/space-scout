import type {
  Player, Ball, GameState, Possession, Restart, Score,
  MatchConfig, JoystickVector, PillState, Position, ZoneRule,
} from "@/types/game";
import {
  W, H, L, R, TOP, BOT, GX0, GX1, GOAL_W, ATT_THIRD, CONTACT,
  FORMATIONS, SPEED_MAP, ROLE_BOUNDS, THIRD_1_Y, THIRD_2_Y,
  GOALKICK_SETUPS, type GoalkickSetupDef,
  DEFAULT_USER_ROLE, JERSEY_NUMBERS, WINGER_X_BOUNDS,
} from "./constants";
import { TeamShapeEngine } from "./tactics/teamShape";
import { TACTIC_POSSESSION } from "./tactics/presets";
import { getTactic } from "./tactics/presets";

function rand(a: number, b: number) { return a + Math.random() * (b - a); }
function clamp(v: number, a: number, b: number) { return v < a ? a : v > b ? b : v; }
function dist(a: Position, b: Position) { return Math.hypot(a.x - b.x, a.y - b.y); }
function angDiff(a: number, b: number) { const d = Math.abs(a - b) % (2 * Math.PI); return d > Math.PI ? 2 * Math.PI - d : d; }

function segDist(px: number, py: number, ax: number, ay: number, bx: number, by: number) {
  const dx = bx - ax, dy = by - ay, l2 = dx * dx + dy * dy;
  let t = l2 ? ((px - ax) * dx + (py - ay) * dy) / l2 : 0;
  if (t < 0) t = 0; if (t > 1) t = 1;
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

// Convert a depth fraction (0=own goal, 1=opp goal) into real Y for a given side
function depthToY(side: "us" | "them", depth: number): number {
  return side === "us" ? (BOT - (BOT - TOP) * depth) : (TOP + (BOT - TOP) * depth);
}

export type EngineEvent =
  | { type: "goal"; team: "us" | "them"; score: Score }
  | { type: "pill"; text: string; pillType: "att" | "def" | "dead" }
  | { type: "coach"; message: string }
  | { type: "matchEnd"; score: Score }
  | { type: "stateChange"; state: GameState }
  | { type: "actionUpdate"; canPass: boolean; canShoot: boolean }
  | { type: "drill:objective"; objectiveId: string; value: number }
  | { type: "countdown"; value: "3" | "2" | "1" | "GO" | null };

export class GameEngine {
  readonly W = W;
  readonly H = H;

  you!: Player;
  mates: Player[] = [];
  opps: Player[] = [];
  gkUs!: Player;
  gkThem!: Player;
  ball!: Ball;

  running = false;
  paused = false;
  timeLeft = 180000;
  score: Score = { us: 0, them: 0 };
  poss: Possession = "us";
  gstate: GameState = "dead";
  youHasBall = false;
  PACE = 0.17;

  private deadTimer = 0;
  private restart: Restart | null = null;
  private firstKickoff = true;
  private countdownPhase: "3" | "2" | "1" | "GO" | null = null;
  private countdownTimer = 0;
  private passCooldown = 0;
  private stealImmunity = 0;
  private recentLoser: Player | null = null;   // the specific player who just lost the ball
  private recentLoserTimer = 0;                 // frames until that player can contest again
  private lastCarrierPos: { p: Player; x: number; y: number } | null = null;
  private config: MatchConfig;
  private eventQueue: EngineEvent[] = [];
  private goalkickSetupIdx = 0;
  private shapeUs: TeamShapeEngine;
  private shapeThem: TeamShapeEngine;
  private lastPoss: "us" | "them" = "us";
  private possChangedFrames = 0;

  showBuildoutLines = false;
  showZoneEditor = false;
  wingerBounds = { lw: { ...WINGER_X_BOUNDS.lw }, rw: { ...WINGER_X_BOUNDS.rw } };

  keys: Record<string, boolean> = {};
  joyVec: JoystickVector = { x: 0, y: 0, active: false };
  dragging = false;

  constructor(config?: Partial<MatchConfig>) {
    this.config = {
      duration: 180000,
      format: "5v5",
      speed: SPEED_MAP.default,
      aiDifficulty: "medium",
      ...config,
    };
    this.timeLeft = this.config.duration;
    this.showBuildoutLines = this.config.buildoutLines ?? false;
    const usTactic = (this.config.tacticId && getTactic(this.config.tacticId)) || TACTIC_POSSESSION;
    const themTactic = (this.config.oppTacticId && getTactic(this.config.oppTacticId)) || TACTIC_POSSESSION;
    this.shapeUs = new TeamShapeEngine(usTactic);
    this.shapeThem = new TeamShapeEngine(themTactic);
    this.applySpeed(this.config.speed);
    this.kickoffPositions();
  }

  get teamUs(): Player[] { return [this.you, ...this.mates, this.gkUs]; }
  get teamThem(): Player[] { return [...this.opps, this.gkThem]; }

  private emit(event: EngineEvent) { this.eventQueue.push(event); }

  flushEvents(): EngineEvent[] {
    const events = this.eventQueue;
    this.eventQueue = [];
    return events;
  }

  // ---------- Setup ----------

  private homeXY(side: "us" | "them", r: { fx: number; fy: number }): Position {
    const fx = side === "them" ? 1 - r.fx : r.fx;
    const x = L + (R - L) * fx;
    const y = depthToY(side, r.fy);
    return { x, y };
  }

  // Clamp a player's Y to their role's allowed zone
  private clampToRoleBounds(p: Player): void {
    if (p === this.you || p.gk) return;
    const bounds = ROLE_BOUNDS[p.home.role];
    if (!bounds) return;
    const yMin = depthToY(p.side, bounds.fyMax);
    const yMax = depthToY(p.side, bounds.fyMin);
    p.y = clamp(p.y, Math.min(yMin, yMax), Math.max(yMin, yMax));
  }

  // Clamp player to any zone rules configured for this match
  private clampToZoneRules(p: Player): void {
    if (p.gk) return;
    const rules = this.config.zoneRules;
    if (!rules || rules.length === 0) return;

    const roleKey = p === this.you
      ? (this.config.userRole || "")
      : p.id.replace("us-", "").replace("them-", "");

    for (const rule of rules) {
      if (rule.team !== p.side || rule.role !== roleKey) continue;

      // Convert fractional bounds to screen coordinates
      const screenXMin = L + (R - L) * rule.xMin;
      const screenXMax = L + (R - L) * rule.xMax;
      const screenYMin = depthToY(p.side, rule.yMax);
      const screenYMax = depthToY(p.side, rule.yMin);
      const yLo = Math.min(screenYMin, screenYMax);
      const yHi = Math.max(screenYMin, screenYMax);

      p.x = clamp(p.x, screenXMin, screenXMax);
      p.y = clamp(p.y, yLo, yHi);
    }
  }

  private kickoffPositions() {
    const formation = FORMATIONS[this.config.format] || FORMATIONS["5v5"];
    const roleKeys = Object.keys(formation);
    const userRole = this.config.userRole || DEFAULT_USER_ROLE[this.config.format] || roleKeys[0];

    // Build blue team: user takes one role, rest are AI mates
    this.you = {
      id: "you", side: "us", role: userRole as any, isUser: true,
      number: JERSEY_NUMBERS[userRole] || 10,
      home: formation[userRole] || Object.values(formation)[0],
      x: 0, y: 0, px: 0, py: 0, face: -Math.PI / 2,
    };

    this.mates = roleKeys
      .filter((k) => k !== userRole)
      .map((k) => ({
        id: `us-${k}`, side: "us" as const, role: k as any,
        number: JERSEY_NUMBERS[k] || 0,
        home: formation[k], x: 0, y: 0, px: 0, py: 0, face: -Math.PI / 2,
      }));

    // Red team gets ALL roles (same number of outfield players)
    this.opps = roleKeys.map((k) => ({
      id: `them-${k}`, side: "them" as const, role: k as any,
      number: JERSEY_NUMBERS[k] || 0,
      home: formation[k], x: 0, y: 0, px: 0, py: 0, face: Math.PI / 2,
    }));

    this.gkUs = {
      id: "gk-us", side: "us", role: "gk", gk: true, number: 1,
      home: { fx: 0.5, fy: 0, role: "gk" },
      x: W * 0.5, y: BOT - 16, px: W * 0.5, py: BOT - 16, face: -Math.PI / 2,
    };
    this.gkThem = {
      id: "gk-them", side: "them", role: "gk", gk: true, number: 1,
      home: { fx: 0.5, fy: 0, role: "gk" },
      x: W * 0.5, y: TOP + 16, px: W * 0.5, py: TOP + 16, face: Math.PI / 2,
    };

    // Place everyone at home positions, clamped to their own half for kickoff.
    // The defending team must also be outside the center circle (radius ~72).
    const midY = H / 2;
    const midX = W / 2;
    const circleR = 76; // slightly larger than drawn circle to give buffer
    [this.you, ...this.mates].forEach((p) => {
      const h = this.homeXY(p.side, p.home);
      p.x = h.x;
      p.y = Math.max(h.y, midY + 5);
      p.px = p.x; p.py = p.y;
      p.face = -Math.PI / 2;
    });
    this.opps.forEach((p) => {
      const h = this.homeXY(p.side, p.home);
      p.x = h.x;
      p.y = Math.min(h.y, midY - 5);
      // Push out of center circle if inside it
      const dx = p.x - midX, dy = p.y - midY;
      if (Math.hypot(dx, dy) < circleR) {
        const ang = Math.atan2(dy, dx);
        p.x = midX + Math.cos(ang) * circleR;
        p.y = Math.min(midY - 5, midY + Math.sin(ang) * circleR);
      }
      p.px = p.x; p.py = p.y;
      p.face = Math.PI / 2;
    });

    this.ball = {
      x: W / 2, y: H / 2, owner: null, flying: false,
      tx: 0, ty: 0, lastTouch: "us", onArrive: null,
    };
  }

  // ---------- Match lifecycle ----------

  start() {
    this.score = { us: 0, them: 0 };
    this.timeLeft = this.config.duration;
    this.paused = false;
    this.kickoffPositions();
    this.poss = "us";
    this.firstKickoff = true;
    this.countdownPhase = "3";
    this.countdownTimer = 60;
    this.gstate = "dead";
    this.ball.x = W / 2;
    this.ball.y = H / 2;
    this.running = true;
    this.emit({ type: "countdown", value: "3" });
    this.emitActionUpdate();
  }

  applySpeed(v: number) {
    this.PACE = SPEED_MAP.toPace(v);
    this.config.speed = v;
  }

  togglePause() {
    if (!this.running) return;
    this.paused = !this.paused;
  }

  toggleBuildoutLines() {
    this.showBuildoutLines = !this.showBuildoutLines;
  }

  setTactic(tacticId: string, team: "us" | "them" = "us") {
    const tactic = getTactic(tacticId);
    if (!tactic) return;
    if (team === "us") {
      this.shapeUs.setTactic(tactic);
      this.config.tacticId = tacticId;
    } else {
      this.shapeThem.setTactic(tactic);
      this.config.oppTacticId = tacticId;
    }
  }

  get currentTacticId(): string { return this.config.tacticId || "possession"; }
  get currentOppTacticId(): string { return this.config.oppTacticId || "possession"; }
  get zoneRules(): ZoneRule[] { return this.config.zoneRules || []; }

  // ---------- Update ----------

  update(dt: number) {
    if (!this.running || this.paused) return;

    // Countdown phase: 3-2-1-GO before the first kickoff
    if (this.countdownPhase) {
      this.countdownTimer--;
      if (this.countdownTimer <= 0) {
        const next: Record<string, "2" | "1" | "GO" | null> = { "3": "2", "2": "1", "1": "GO" };
        if (this.countdownPhase === "GO") {
          this.countdownPhase = null;
          this.emit({ type: "countdown", value: null });
          this.firstKickoff = false;
          this.setRestart({ type: "kickoff", team: "us", x: W / 2, y: H / 2 });
          this.deadTimer = 0;
        } else {
          this.countdownPhase = next[this.countdownPhase]!;
          this.countdownTimer = this.countdownPhase === "GO" ? 30 : 60;
          this.emit({ type: "countdown", value: this.countdownPhase });
        }
      }
      return;
    }

    // Tick frozen timers on all players
    for (const p of [...this.teamUs, ...this.teamThem]) {
      if (p.frozenTimer && p.frozenTimer > 0) p.frozenTimer--;
    }

    if (this.gstate === "live") {
      this.keyMove();
      this.checkCarrierOutOfBounds();
      // Track possession changes for tactic triggers
      if (this.poss !== this.lastPoss) {
        this.possChangedFrames = 180; // ~3 seconds of "just changed" state
        this.lastPoss = this.poss;
      }
      if (this.possChangedFrames > 0) this.possChangedFrames--;
      const attackers = this.poss === "us" ? this.mates : this.opps;
      const defenders = this.poss === "us" ? this.opps : this.mates;
      this.moveTeam(attackers, true);
      this.moveTeam(defenders, false);
      this.moveGK(this.gkUs);
      this.moveGK(this.gkThem);
      this.pressCarrier();
      if (this.passCooldown > 0) this.passCooldown--;
      this.aiConsiderPass();
      this.moveBall();
    } else {
      this.keyMove();
      this.moveGK(this.gkUs);
      this.moveGK(this.gkThem);
      if (this.deadTimer > 0) {
        this.deadTimer--;
      } else {
        if (this.restart?._pending) {
          this.kickoffKeepScore(this.restart.team);
        } else if (this.restart) {
          this.resumeFromRestart();
        }
      }
    }

    this.timeLeft -= dt;
    if (this.timeLeft < 0) this.timeLeft = 0;
    if (this.timeLeft <= 0) this.endMatch();

    this.updateFacingAll();
  }

  // If the ball carrier (player or AI) runs out of bounds, trigger appropriate restart
  private checkCarrierOutOfBounds() {
    const carrier = this.ball.owner;
    if (!carrier || this.ball.flying) return;
    const bx = this.ball.x, by = this.ball.y;

    // Side lines → throw-in to the other team
    if (bx <= L || bx >= R) {
      const toTeam = carrier.side === "us" ? "them" : "us";
      const rx = bx <= L ? L + 18 : R - 18;
      this.ball.flying = false;
      this.ball.owner = null;
      this.setRestart({ type: "throwin", team: toTeam, x: rx, y: clamp(by, TOP + 20, BOT - 20) });
      return;
    }

    // End lines
    if (by <= TOP || by >= BOT) {
      const edge = by <= TOP ? "top" : "bottom";
      const defendingTeam = edge === "top" ? "them" : "us";
      this.ball.flying = false;
      this.ball.owner = null;
      if (carrier.side !== defendingTeam) {
        // Attacker ran it out → goal kick to defenders
        const cy = edge === "top" ? TOP + 40 : BOT - 40;
        this.setRestart({ type: "goalkick", team: defendingTeam, x: W / 2, y: cy });
      } else {
        // Defender ran it out → corner to attackers
        const atkTeam = defendingTeam === "us" ? "them" : "us";
        const cx = bx < W / 2 ? L + 18 : R - 18;
        const cy = edge === "top" ? TOP + 18 : BOT - 18;
        this.setRestart({ type: "corner", team: atkTeam, x: cx, y: cy });
      }
      return;
    }
  }

  // ---------- Restart handling ----------

  private setRestart(r: Restart) {
    this.gstate = "dead";
    this.restart = r;
    this.deadTimer = r.type === "kickoff" ? 120 : Math.round(70 / this.PACE);
    this.youHasBall = false;
    this.ball.flying = false;
    this.ball.owner = null;
    this.ball.x = r.x;
    this.ball.y = r.y;
    this.poss = r.team;
    this.emitActionUpdate();

    const labels: Record<string, string> = {
      kickoff: "Kick off", throwin: "Throw-in",
      goalkick: "Goal kick", corner: "Corner", goal: "GOAL!",
    };
    this.emitPill(labels[r.type] || "Restart", r.team);

    const taker = this.nearestTeammateTo(r.team, r.x, r.y, true);
    r.taker = taker || undefined;
    if (taker) {
      taker.x = clamp(r.x, L, R);
      taker.y = clamp(r.y, TOP, BOT);
    }

    // Move teammates to space for the restart
    this.positionForRestart(r);

    this.coachRestart(r);
    this.emit({ type: "stateChange", state: "dead" });
  }

  // Position teammates intelligently for restarts — find open space to receive
  private positionForRestart(r: Restart) {
    const team = r.team === "us" ? this.teamUs : this.teamThem;
    const enemies = r.team === "us" ? this.teamThem : this.teamUs;
    const oppTeamArr = r.team === "us" ? this.opps : this.mates;
    const dir = this.attackDir(r.team);

    // === GOALKICK: position OPPOSITION first (using setup rotations) ===
    if (r.type === "goalkick") {
      this.positionOppositionForGoalkick(r.team, oppTeamArr);
    }

    for (const p of team) {
      if (p.gk || p === r.taker || p === this.you) continue;

      if (r.type === "goalkick") {
        // On goalkicks: spread wide and find space to play out from the back
        const bestSpot = this.findOpenSpace(p, r.x, r.y, enemies, r.team);
        p.x = bestSpot.x;
        p.y = bestSpot.y;
      } else if (r.type === "throwin") {
        // On throw-ins: two players show short, one goes long
        const h = this.homeXY(p.side, p.home);
        const showShort = Math.abs(h.x - r.x) < (R - L) * 0.3;
        if (showShort) {
          // come close to the thrower to offer a short option
          p.x = clamp(r.x + (h.x > r.x ? 60 : -60), L + 30, R - 30);
          p.y = clamp(r.y - dir * rand(30, 80), TOP + 20, BOT - 20);
        } else {
          // go long — push forward into space
          p.x = h.x;
          p.y = clamp(r.y - dir * rand(80, 160), TOP + 20, BOT - 20);
        }
      } else if (r.type === "corner") {
        // On corners: get into the box
        const boxY = r.team === "us" ? TOP + 60 : BOT - 60;
        p.x = clamp(GX0 + rand(-40, GOAL_W + 40), L + 30, R - 30);
        p.y = clamp(boxY + rand(-30, 30), TOP + 20, BOT - 20);
      } else {
        // Kickoff: go to home positions
        const h = this.homeXY(p.side, p.home);
        p.x = h.x;
        p.y = h.y;
      }
    }
  }

  // Find the best open pocket of space for a player near a reference point
  private findOpenSpace(p: Player, refX: number, refY: number, enemies: Player[], side: "us" | "them"): Position {
    const dir = this.attackDir(side);
    const h = this.homeXY(p.side, p.home);
    let bestSpot = { x: h.x, y: h.y };
    let bestScore = -1;

    const bounds = ROLE_BOUNDS[p.home.role] || { fyMin: 0.1, fyMax: 0.9 };
    const effFx = p.side === "them" ? 1 - p.home.fx : p.home.fx;
    for (let i = 0; i < 12; i++) {
      const fx = clamp(effFx + rand(-0.2, 0.2), 0.08, 0.92);
      const fy = clamp(rand(bounds.fyMin, bounds.fyMax), bounds.fyMin, bounds.fyMax);
      const cx = L + (R - L) * fx;
      const cy = depthToY(side, fy);

      let minEnemyDist = 1e9;
      for (const e of enemies) {
        const dd = Math.hypot(cx - e.x, cy - e.y);
        if (dd < minEnemyDist) minEnemyDist = dd;
      }
      const openness = clamp(minEnemyDist / 120, 0, 1);

      const distFromRef = Math.hypot(cx - refX, cy - refY);
      const reachable = clamp(1 - distFromRef / (H * 0.6), 0, 1);

      const laneFit = clamp(1 - Math.abs(fx - effFx) * 3, 0, 1);

      const score = openness * 0.5 + reachable * 0.3 + laneFit * 0.2;
      if (score > bestScore) {
        bestScore = score;
        bestSpot = { x: cx, y: cy };
      }
    }
    return bestSpot;
  }

  // Position the opposition for a goalkick — rotate through preset setups
  private positionOppositionForGoalkick(goalkickTeam: "us" | "them", oppPlayers: Player[]) {
    const oppSide = goalkickTeam === "us" ? "them" : "us";
    const setup = GOALKICK_SETUPS[this.goalkickSetupIdx % GOALKICK_SETUPS.length];
    this.goalkickSetupIdx++;

    // Buildout line: opponents must stay behind it
    // If "us" has the goalkick (ball at BOT), opponents must be above THIRD_2_Y
    // If "them" has the goalkick (ball at TOP), opponents must be below THIRD_1_Y
    const buildoutY = goalkickTeam === "us" ? THIRD_2_Y : THIRD_1_Y;

    for (const opp of oppPlayers) {
      if (opp.gk || opp === this.you) continue;

      // Find matching setup position by role
      const match = setup.positions.find(sp => opp.home.role === sp.role)
        || setup.positions.find(sp => opp.id.includes(sp.role));

      if (match) {
        const x = L + (R - L) * match.fx;
        const y = depthToY(oppSide, match.fy);
        opp.x = clamp(x, L + 20, R - 20);

        // Enforce buildout line when enabled
        if (this.showBuildoutLines) {
          if (goalkickTeam === "us") {
            opp.y = clamp(y, TOP + 10, buildoutY - 10);
          } else {
            opp.y = clamp(y, buildoutY + 10, BOT - 10);
          }
        } else {
          opp.y = clamp(y, TOP + 10, BOT - 10);
        }
      } else {
        // Fallback: go to home position behind buildout
        const h = this.homeXY(oppSide, opp.home);
        opp.x = h.x;
        if (this.showBuildoutLines) {
          if (goalkickTeam === "us") {
            opp.y = clamp(h.y, TOP + 10, buildoutY - 10);
          } else {
            opp.y = clamp(h.y, buildoutY + 10, BOT - 10);
          }
        } else {
          opp.y = h.y;
        }
      }
    }
  }

  private resumeFromRestart() {
    this.gstate = "live";
    if (this.restart?.taker) {
      this.giveBall(this.restart.taker);
    } else {
      this.giveBall(this.poss === "us" ? this.mates[0] : this.opps[0]);
    }
    this.passCooldown = Math.round(30 / this.PACE);
    this.emitPill(this.poss === "us" ? "Your ball" : "Reds attacking", this.poss);
    this.restart = null;
    this.emit({ type: "stateChange", state: "live" });
  }

  // ---------- Ball possession ----------

  private nearestTeammateTo(team: "us" | "them", x: number, y: number, outfieldOnly: boolean): Player | null {
    const arr = team === "us" ? this.teamUs : this.teamThem;
    let best: Player | null = null, d = 1e9;
    for (const p of arr) {
      if (outfieldOnly && p.gk) continue;
      const dd = Math.hypot(p.x - x, p.y - y);
      if (dd < d) { d = dd; best = p; }
    }
    return best;
  }

  protected giveBall(p: Player) {
    this.ball.owner = p;
    this.ball.flying = false;
    this.ball.x = p.x;
    this.ball.y = p.y;
    this.poss = p.side;
    this.youHasBall = p === this.you;
    this.ball.lastTouch = p.side;
    this.emitActionUpdate();
  }

  private winBall(p: Player) {
    const loser = this.ball.owner;
    this.emitCoach(
      p.side === "us"
        ? "Won it back! Now keep it and build an attack."
        : "Reds won the ball — get goal-side and defend!"
    );

    if (loser && loser !== p && !loser.gk) {
      this.recentLoser = loser;
      this.recentLoserTimer = Math.round(120 / Math.max(0.5, this.PACE));
      // Freeze the loser in place for 2 seconds
      loser.frozenTimer = 120;
      // Push loser well clear so the carrier has space to dribble away
      const pushAng = Math.atan2(loser.y - p.y, loser.x - p.x);
      loser.x = clamp(loser.x + Math.cos(pushAng) * 45, L, R);
      loser.y = clamp(loser.y + Math.sin(pushAng) * 45, TOP, BOT);
      loser.backoff = Math.round(90 / Math.max(0.5, this.PACE));
    }

    this.giveBall(p);
    this.stealImmunity = 90;
    this.passCooldown = Math.round(18 / this.PACE);
    this.emitPill(p.side === "us" ? "Your ball" : "Reds attacking", p.side);
  }

  // ---------- Scoring / availability ----------

  private enemiesOf(side: "us" | "them"): Player[] {
    return side === "us" ? this.teamThem : this.teamUs;
  }

  private nearestEnemy(x: number, y: number, side: "us" | "them"): number {
    const e = this.enemiesOf(side);
    let d = 1e9;
    for (const p of e) d = Math.min(d, Math.hypot(x - p.x, y - p.y));
    return d;
  }

  private laneClear(x: number, y: number, fx: number, fy: number, side: "us" | "them"): number {
    const e = this.enemiesOf(side);
    let d = 1e9;
    for (const p of e) d = Math.min(d, segDist(p.x, p.y, fx, fy, x, y));
    return d;
  }

  private attackDir(side: "us" | "them"): number {
    return side === "us" ? -1 : 1;
  }

  private availability(p: { x: number; y: number; side: "us" | "them"; gk?: boolean }, from: Position & { side?: string }): number {
    if (p.gk) {
      const lane = clamp(this.laneClear(p.x, p.y, from.x, from.y, p.side) / 26, 0, 1);
      const d = dist(p, from);
      const range = d < 55 ? d / 55 : d > 400 ? 0.1 : 1;
      return clamp(lane * 0.6 + range * 0.4, 0, 0.7);
    }
    const open = clamp(this.nearestEnemy(p.x, p.y, p.side) / 70, 0, 1);
    const lane = clamp(this.laneClear(p.x, p.y, from.x, from.y, p.side) / 26, 0, 1);
    const d = dist(p, from);
    const range = d < 55 ? d / 55 : d > 340 ? Math.max(0, 1 - (d - 340) / 200) : 1;
    const fwd = clamp(((from.y - p.y) * this.attackDir(p.side)) / (H * 0.5), 0, 1) * 0.5 + 0.5;
    return clamp(open * 0.36 + lane * 0.40 + range * 0.14 + fwd * 0.10, 0, 1);
  }

  // ---------- Player input ----------

  private keyMove() {
    if (this.you.frozenTimer && this.you.frozenTimer > 0) return;
    const sp = (this.youHasBall ? 2.9 : 3.6) * this.PACE;
    let dx = 0, dy = 0;
    if (this.keys["arrowup"]) dy--;
    if (this.keys["arrowdown"]) dy++;
    if (this.keys["arrowleft"]) dx--;
    if (this.keys["arrowright"]) dx++;

    if (this.joyVec.active && (this.joyVec.x || this.joyVec.y)) {
      dx = this.joyVec.x;
      dy = this.joyVec.y;
    }

    if (dx || dy) {
      const m = Math.hypot(dx, dy);
      if (m > 0) {
        this.you.x = clamp(this.you.x + (dx / m) * sp, 8, W - 8);
        this.you.y = clamp(this.you.y + (dy / m) * sp, 8, H - 8);
        this.you.face = Math.atan2(dy, dx);
      }
    }
    this.clampToZoneRules(this.you);
  }

  handleDrag(fieldX: number, fieldY: number) {
    if (!this.running) return;
    if (this.you.frozenTimer && this.you.frozenTimer > 0) return;
    const nx = clamp(fieldX, 8, W - 8);
    const ny = clamp(fieldY, 8, H - 8);
    const ddx = nx - this.you.x;
    const ddy = ny - this.you.y;
    if (Math.hypot(ddx, ddy) > 1.2) {
      this.you.face = Math.atan2(ddy, ddx);
    }
    this.you.x = nx;
    this.you.y = ny;
    this.clampToZoneRules(this.you);
  }

  canDrag(fieldX: number, fieldY: number): boolean {
    return Math.hypot(fieldX - this.you.x, fieldY - this.you.y) < 50;
  }

  // ---------- AI Movement ----------

  private closestOutfieldToBall(arr: Player[]): Player | null {
    let best: Player | null = null, d = 1e9;
    for (const p of arr) {
      if (p.gk || p === this.you) continue;
      if (p.frozenTimer && p.frozenTimer > 0) continue;
      const dd = dist(p, this.ball);
      if (dd < d) { d = dd; best = p; }
    }
    return best;
  }

  private moveTeam(arr: Player[], attacking: boolean) {
    const carrier = this.ball.owner;
    const ballChaser = this.closestOutfieldToBall(arr);
    const dir = this.attackDir(arr[0]?.side || "us");
    const side = arr[0]?.side || "us";

    for (const m of arr) {
      if (m === this.you || m.gk) continue;
      if (m.frozenTimer && m.frozenTimer > 0) continue;

      // ===== AI CARRIER: dribble toward goal, avoiding defenders =====
      if (m === carrier) {
        const goalX = W / 2;
        const goalY = m.side === "us" ? TOP : BOT;

        const en = this.enemiesOf(m.side);
        let nearbyEnemies = 0;
        let closestDist = 1e9, closestDx = 0, closestDy = 0;
        for (const e of en) {
          if (e.gk) continue;
          if (e.frozenTimer && e.frozenTimer > 0) continue;
          const dd = dist(e, m);
          if (dd < 80) nearbyEnemies++;
          if (dd < closestDist) { closestDist = dd; closestDx = m.x - e.x; closestDy = m.y - e.y; }
        }

        // Congested: hold and let pass logic fire
        if (nearbyEnemies >= 2 && closestDist < 55) {
          const awayAng = Math.atan2(closestDy, closestDx);
          m.face = awayAng;
          const csp = 0.6 * this.PACE;
          m.x += Math.cos(awayAng) * csp;
          m.y += Math.sin(awayAng) * csp;
          continue;
        }

        const toGoalAng = Math.atan2(goalY - m.y, goalX - m.x);
        let ax = Math.cos(toGoalAng);
        let ay = Math.sin(toGoalAng);

        // Steer AROUND nearby defenders instead of through them
        if (closestDist < 90) {
          const defAng = Math.atan2(-closestDy, -closestDx); // angle FROM me TO defender
          const goalAng = toGoalAng;
          // How much the defender blocks the path to goal
          const blockage = Math.cos(defAng - goalAng); // 1 = directly in path, -1 = behind me

          if (blockage > 0.1 && closestDist < 80) {
            // Defender is in the way — steer perpendicular to dodge around them
            // Pick the side that keeps us more central / toward goal
            const perpL = defAng + Math.PI / 2;
            const perpR = defAng - Math.PI / 2;
            // Score each dodge direction: prefer the one closer to goal direction
            const dotL = Math.cos(perpL - goalAng);
            const dotR = Math.cos(perpR - goalAng);
            const dodgeAng = dotL > dotR ? perpL : perpR;

            // Stronger dodge when defender is closer
            const dodgeStr = clamp((80 - closestDist) / 50, 0.3, 1.0);
            ax = Math.cos(goalAng) * (1 - dodgeStr) + Math.cos(dodgeAng) * dodgeStr;
            ay = Math.sin(goalAng) * (1 - dodgeStr) + Math.sin(dodgeAng) * dodgeStr;
          }
        }

        const al2 = Math.hypot(ax, ay) || 1;
        // Slow down when a defender is close to give more time to react/pass
        const speedMul = closestDist < 50 ? 0.7 : closestDist < 70 ? 0.85 : 1.0;
        const csp = 2.7 * this.PACE * speedMul;
        m.x += (ax / al2) * csp;
        m.y += (ay / al2) * csp;
        m.face = Math.atan2(ay, ax);
        continue;
      }

      const h = this.homeXY(m.side, m.home);
      let tx: number, ty: number;

      if (attacking) {
        if (m === ballChaser) {
          // Support runner: find space ahead of the ball toward goal
          const refx = carrier?.x ?? this.ball.x;
          const refy = carrier?.y ?? this.ball.y;
          let best = { x: m.x, y: m.y, s: -1 };
          for (let a = 0; a < 9; a++) {
            const ang = (a / 8) * Math.PI - Math.PI / 2;
            const rr = 90;
            const nx = clamp(refx + Math.sin(ang) * rr, L + 24, R - 24);
            const ny = clamp(refy - dir * Math.cos(ang) * rr, TOP + 24, BOT - 24);
            const sp0 = this.availability({ x: nx, y: ny, side: m.side }, carrier || m);
            const prog = m.side === "us" ? (BOT - ny) / (BOT - TOP) : (ny - TOP) / (BOT - TOP);
            const sc = sp0 * 0.45 + prog * 0.55;
            if (sc > best.s) best = { x: nx, y: ny, s: sc };
          }
          tx = best.x; ty = best.y;
        } else {
          // TACTIC ENGINE: calculate position based on active tactic preset
          const roleKey = m.id.replace("us-", "").replace("them-", "");
          const shape = m.side === "us" ? this.shapeUs : this.shapeThem;
          const ctx = TeamShapeEngine.buildContext(
            m.side, true, this.ball.x, this.ball.y,
            carrier, carrier ? this.nearestEnemy(carrier.x, carrier.y, carrier.side) : 999,
            this.possChangedFrames > 0,
            this.score.us, this.score.them,
            m.side === "us" ? this.teamUs : this.teamThem,
            m.side === "us" ? this.teamThem : this.teamUs,
            this.wingerBounds,
          );
          const pos = shape.calcTargetPosition(m, roleKey, ctx);
          tx = pos.x;
          ty = pos.y;
        }
      } else {
        // ===== DEFENDING: pressure-aware zone positioning =====
        const pc = this.pressureConfig;
        const distToBall = dist(m, this.ball);
        // Determine if this player should press: closest N players within press radius
        const shouldPress = m === ballChaser || (
          pc.pressers > 1 && distToBall < pc.pressRadius &&
          this.isNthClosestToBall(m, arr, pc.pressers)
        );

        if (shouldPress) {
          tx = carrier?.x ?? this.ball.x;
          ty = (carrier?.y ?? this.ball.y) - dir * 15;
        } else {
          // Use tactic engine for defensive positioning too
          const roleKey = m.id.replace("us-", "").replace("them-", "");
          const defShape = m.side === "us" ? this.shapeUs : this.shapeThem;
          const defCtx = TeamShapeEngine.buildContext(
            m.side, false, this.ball.x, this.ball.y,
            carrier, carrier ? this.nearestEnemy(carrier.x, carrier.y, carrier.side) : 999,
            this.possChangedFrames > 0,
            this.score.us, this.score.them,
            m.side === "us" ? this.teamUs : this.teamThem,
            m.side === "us" ? this.teamThem : this.teamUs,
            this.wingerBounds,
          );
          // Blend tactic position with zone-marking position
          const tacticPos = defShape.calcTargetPosition(m, roleKey, defCtx);
          const zonePos = this.calcDefensivePosition(m, side, carrier);
          // Tactic controls shape, zone-marking adjusts for threats
          tx = tacticPos.x * 0.4 + zonePos.x * 0.6;
          ty = tacticPos.y * 0.4 + zonePos.y * 0.6;
        }
      }

      tx = clamp(tx, L + 10, R - 10);
      ty = clamp(ty, TOP + 10, BOT - 10);

      const backoff = m.backoff && m.backoff > 0;
      if (backoff) m.backoff!--;

      const sp = (m === ballChaser ? (attacking ? 2.1 : 2.8) : (attacking ? 1.8 : 1.6)) * this.PACE * (backoff ? 0.5 : 1);
      const ang = Math.atan2(ty - m.y, tx - m.x);
      const dd = Math.hypot(tx - m.x, ty - m.y);
      if (dd > 1.5) {
        m.x += Math.cos(ang) * Math.min(dd, sp);
        m.y += Math.sin(ang) * Math.min(dd, sp);
      }

      this.clampToRoleBounds(m);
      this.clampToZoneRules(m);
      m.x = clamp(m.x, L, R);
    }

    // Enforce tactic spacing rules across the whole team
    const teamShape = side === "us" ? this.shapeUs : this.shapeThem;
    const spacingCtx = TeamShapeEngine.buildContext(
      side, attacking, this.ball.x, this.ball.y,
      this.ball.owner, this.ball.owner ? this.nearestEnemy(this.ball.owner.x, this.ball.owner.y, this.ball.owner.side) : 999,
      this.possChangedFrames > 0,
      this.score.us, this.score.them,
      side === "us" ? this.teamUs : this.teamThem,
      side === "us" ? this.teamThem : this.teamUs,
      this.wingerBounds,
    );
    teamShape.enforceSpacing(arr, spacingCtx);
    for (const m of arr) {
      if (m !== this.you && !m.gk && !(m.frozenTimer && m.frozenTimer > 0)) {
        this.clampToRoleBounds(m);
        this.clampToZoneRules(m);
        m.x = clamp(m.x, L, R);
      }
    }
  }

  // Zone-based defensive positioning: each non-pressing defender marks the most dangerous
  // attacker in their zone OR covers the passing lane to that attacker.
  private calcDefensivePosition(m: Player, defSide: "us" | "them", carrier: Player | null): Position {
    const atkSide = defSide === "us" ? "them" : "us";
    const dir = this.attackDir(defSide);
    const ownGoalX = W / 2;
    const ownGoalY = defSide === "us" ? BOT : TOP;
    const h = this.homeXY(m.side, m.home);

    // Find the most dangerous attacker in this defender's zone (by horizontal lane)
    const attackers = atkSide === "us" ? this.teamUs : this.teamThem;
    let bestThreat: Player | null = null;
    let bestDanger = -1;

    for (const atk of attackers) {
      if (atk.gk) continue;
      // How dangerous is this attacker? Based on:
      // 1. How close they are to our goal
      const distToGoal = Math.hypot(atk.x - ownGoalX, atk.y - ownGoalY);
      const goalProximity = clamp(1 - distToGoal / (H * 0.8), 0, 1);
      // 2. How much open space they have (no other defender covering them)
      const coveredByOthers = this.isAlreadyCoveredBy(atk, m, defSide);
      // 3. How close they are to this defender's lane
      const laneDist = Math.abs(atk.x - h.x) / (R - L);
      const inMyLane = clamp(1 - laneDist * 2, 0, 1);

      const danger = goalProximity * 0.4 + inMyLane * 0.35 + (coveredByOthers ? 0 : 0.25);
      if (danger > bestDanger) { bestDanger = danger; bestThreat = atk; }
    }

    if (bestThreat) {
      // Position between the threat and our goal, slightly toward the ball
      const midX = (bestThreat.x + ownGoalX) / 2;
      const midY = (bestThreat.y + ownGoalY) / 2;
      // Bias toward the threat (closer to them than to the goal)
      const biasFrac = 0.65;
      let tx = midX * (1 - biasFrac) + bestThreat.x * biasFrac;
      let ty = midY * (1 - biasFrac) + bestThreat.y * biasFrac;
      // Slight shift toward ball side
      tx += (this.ball.x - tx) * 0.08;
      return { x: tx, y: ty };
    }

    // No specific threat: hold defensive shape between ball and goal
    const pc = this.pressureConfig;
    const ballDepthFrac = defSide === "us"
      ? (BOT - this.ball.y) / (BOT - TOP)
      : (this.ball.y - TOP) / (BOT - TOP);
    // Higher pressure = defensive line sits higher up the pitch
    const defDepth = clamp(ballDepthFrac * pc.lineDepth + m.home.fy * (1 - pc.lineDepth), 0, 1);
    return {
      x: h.x + (this.ball.x - W / 2) * pc.shiftToBall,
      y: depthToY(m.side, defDepth),
    };
  }

  // Check if an attacker is already being marked by another defender (not `excludeDef`)
  private isAlreadyCoveredBy(atk: Player, excludeDef: Player, defSide: "us" | "them"): boolean {
    const defenders = defSide === "us" ? [...this.mates] : [...this.opps];
    for (const d of defenders) {
      if (d === excludeDef || d.gk || d === this.you) continue;
      if (dist(d, atk) < 60) return true;
    }
    return false;
  }

  // Player activation: where should this player move based on ball location and their role?
  // Wide players push forward when ball is on their side, FWD drops to link when ball is deep, etc.
  private calcActivationPosition(m: Player, carrier: Player | null): Position {
    const h = this.homeXY(m.side, m.home);
    const dir = this.attackDir(m.side);
    const ballX = carrier?.x ?? this.ball.x;
    const ballY = carrier?.y ?? this.ball.y;

    // Ball depth: 0 = at own goal, 1 = at opponent goal
    const ballDepth = m.side === "us"
      ? (BOT - ballY) / (BOT - TOP)
      : (ballY - TOP) / (BOT - TOP);

    // Effective fx (mirrored for "them" so all logic is from the team's own perspective)
    const homeFx = m.side === "them" ? 1 - m.home.fx : m.home.fx;
    const ballSide = m.side === "them"
      ? 1 - (ballX - L) / (R - L)
      : (ballX - L) / (R - L);

    const role = m.home.role;
    let targetFx = homeFx;
    let targetFy = m.home.fy;

    if (role === "fwd") {
      if (ballDepth < 0.35) {
        targetFy = clamp(m.home.fy - 0.15, 0.40, 0.65);
      } else if (ballDepth > 0.6) {
        targetFy = clamp(m.home.fy + 0.12, 0.65, 0.95);
        targetFx = clamp(targetFx + (ballSide - 0.5) * 0.15, 0.3, 0.7);
      }
    } else if (role === "wide") {
      const isLeftSide = homeFx < 0.5;
      const ballOnMySide = isLeftSide ? ballSide < 0.45 : ballSide > 0.55;
      const wb = isLeftSide ? this.wingerBounds.lw : this.wingerBounds.rw;
      const wideMin = wb.min;
      const wideMax = wb.max;

      if (ballOnMySide && ballDepth > 0.4) {
        targetFy = clamp(m.home.fy + 0.20, 0.45, 0.90);
        targetFx = isLeftSide ? clamp(homeFx - 0.06, 0.05, 0.20) : clamp(homeFx + 0.06, 0.80, 0.95);
      } else if (!ballOnMySide && ballDepth > 0.5) {
        // Far-side winger: drift slightly inside but stay in wide channel
        targetFx = isLeftSide ? clamp(homeFx + 0.08, wideMin, wideMax) : clamp(homeFx - 0.08, wideMin, wideMax);
        targetFy = clamp(m.home.fy + 0.10, 0.50, 0.78);
      } else if (ballDepth < 0.3) {
        targetFy = clamp(m.home.fy - 0.12, 0.20, 0.45);
        targetFx = clamp(homeFx, wideMin, wideMax);
      } else {
        targetFx = clamp(homeFx, wideMin, wideMax);
      }
    } else if (role === "hold") {
      targetFx = clamp(homeFx + (ballSide - 0.5) * 0.2, 0.3, 0.7);
      if (ballDepth > 0.6) {
        targetFy = clamp(m.home.fy + 0.08, 0.25, 0.48);
      }
    } else if (role === "mid") {
      targetFy = clamp(m.home.fy + (ballDepth - 0.5) * 0.2, 0.25, 0.70);
      targetFx = clamp(homeFx + (ballSide - 0.5) * 0.15, 0.2, 0.8);
    }

    // Convert back to screen coordinates (mirror back for "them")
    const screenFx = m.side === "them" ? 1 - targetFx : targetFx;
    const x = L + (R - L) * screenFx + (ballX - W / 2) * 0.06;
    const y = depthToY(m.side, targetFy);
    return { x: clamp(x, L + 20, R - 20), y: clamp(y, TOP + 20, BOT - 20) };
  }

  // Get the effective defensive pressure setting
  private get defPressure(): import("@/types/game").DefensivePressure {
    return this.config.defensivePressure || "medium";
  }

  // Pressure config affects how many defenders press and how aggressively
  private get pressureConfig() {
    switch (this.defPressure) {
      case "low":   return { pressers: 1, pressRadius: 100, lineDepth: 0.30, shiftToBall: 0.08 };
      case "medium":return { pressers: 1, pressRadius: 140, lineDepth: 0.45, shiftToBall: 0.12 };
      case "high":  return { pressers: 2, pressRadius: 180, lineDepth: 0.55, shiftToBall: 0.18 };
      case "full":  return { pressers: 3, pressRadius: 250, lineDepth: 0.65, shiftToBall: 0.25 };
    }
  }

  // Check if player m is among the N closest outfield players to the ball in their team
  private isNthClosestToBall(m: Player, arr: Player[], n: number): boolean {
    const dists = arr
      .filter(p => p !== this.you && !p.gk && !(p.frozenTimer && p.frozenTimer > 0))
      .map(p => ({ p, d: dist(p, this.ball) }))
      .sort((a, b) => a.d - b.d);
    const idx = dists.findIndex(e => e.p === m);
    return idx >= 0 && idx < n;
  }

  // ---------- Steal / press ----------

  private carrierMoveDir(carrier: Player): Position {
    if (carrier === this.you) {
      return { x: Math.cos(this.you.face), y: Math.sin(this.you.face) };
    }
    if (this.lastCarrierPos && this.lastCarrierPos.p === carrier) {
      const dx = carrier.x - this.lastCarrierPos.x;
      const dy = carrier.y - this.lastCarrierPos.y;
      if (Math.hypot(dx, dy) > 0.3) return { x: dx, y: dy };
    }
    return { x: 0, y: this.attackDir(carrier.side) };
  }

  // The defender must approach from the FRONT of the carrier's movement direction.
  // Contact from behind or the side doesn't win the ball.
  private isFrontTackle(defender: Position, carrier: Position, mv: Position): boolean {
    const dx = defender.x - carrier.x, dy = defender.y - carrier.y;
    const d = Math.hypot(dx, dy);
    if (d < 1) return true;
    const mvlen = Math.hypot(mv.x, mv.y);
    if (mvlen < 0.01) return true; // carrier stationary, any contact works
    // dot product: positive = defender is AHEAD of the carrier's movement
    const dot = (dx * mv.x + dy * mv.y) / (d * mvlen);
    return dot > 0.15; // must be roughly in front of movement direction
  }

  private pressCarrier() {
    const carrier = this.ball.owner;
    if (!carrier || this.ball.flying) {
      this.lastCarrierPos = carrier ? { p: carrier, x: carrier.x, y: carrier.y } : null;
      return;
    }

    // Tick down recent loser timer
    if (this.recentLoserTimer > 0) this.recentLoserTimer--;
    if (this.recentLoserTimer <= 0) this.recentLoser = null;

    // Steal immunity: carrier can't be tackled right after winning the ball
    if (this.stealImmunity > 0) {
      this.stealImmunity--;
      this.lastCarrierPos = { p: carrier, x: carrier.x, y: carrier.y };
      return;
    }

    const mv = this.carrierMoveDir(carrier);
    const defSide = carrier.side === "us" ? "them" : "us";
    const defenders = [...(defSide === "us" ? this.teamUs : this.teamThem)];
    if (carrier.side !== this.you.side && !defenders.includes(this.you)) {
      defenders.push(this.you);
    }

    for (const dq of defenders) {
      if (dq.gk) continue;
      if (dq === this.recentLoser) continue;
      if (dq.frozenTimer && dq.frozenTimer > 0) continue;
      if (dist(dq, carrier) < CONTACT && this.isFrontTackle(dq, carrier, mv)) {
        this.winBall(dq);
        this.lastCarrierPos = null;
        return;
      }
    }
    this.lastCarrierPos = { p: carrier, x: carrier.x, y: carrier.y };
  }

  // ---------- Goalkeeper ----------

  private moveGK(gk: Player) {
    if (this.ball.owner === gk && !this.ball.flying) {
      gk.holdT = (gk.holdT || 0) + 1;
      // GK holds the ball and looks for the best open option — plays around pressure
      const holdTime = Math.round(50 / Math.max(0.5, this.PACE));
      if (gk.holdT > holdTime) {
        gk.holdT = 0;
        const team = gk.side === "us" ? this.teamUs : this.teamThem;

        // Score each teammate: openness + lane clarity + prefer short passes to wide players
        const opts: { p: Player; sc: number }[] = [];
        for (const p of team) {
          if (p === gk || p.gk) continue;
          const av = this.availability(p, gk);
          const d = dist(p, gk);
          // Prefer shorter passes (playing out) over long balls
          const shortBonus = d < 200 ? 0.2 : d < 350 ? 0.1 : 0;
          // Prefer wide players (more space to receive)
          const wideBonus = (p.home.role === "wide") ? 0.15 : 0;
          // Avoid passing to players under heavy pressure
          const enemyNear = this.nearestEnemy(p.x, p.y, p.side);
          const pressurePenalty = enemyNear < 40 ? -0.3 : enemyNear < 60 ? -0.1 : 0;
          const sc = av + shortBonus + wideBonus + pressurePenalty;
          opts.push({ p, sc });
        }
        opts.sort((a, b) => b.sc - a.sc);

        if (opts.length > 0 && opts[0].sc > 0.15) {
          // Play the best open option
          this.doPass(gk, opts[0].p);
        } else {
          // No good option — play it safe, clear it wide
          const dir = this.attackDir(gk.side);
          const side = Math.random() < 0.5 ? -1 : 1;
          const tx = clamp(W / 2 + side * rand(150, 250), L + 30, R - 30);
          const ty = clamp(gk.y - dir * rand(120, 200), TOP + 30, BOT - 30);
          this.launchBall(gk, tx, ty, "pass", null);
        }
      } else if (gk.holdT > holdTime * 0.5) {
        // While holding, GK moves laterally to open up angles
        const enemies = this.enemiesOf(gk.side);
        let nearestX = W / 2;
        let nearD = 1e9;
        for (const e of enemies) {
          const d = dist(e, gk);
          if (d < nearD) { nearD = d; nearestX = e.x; }
        }
        // Move away from nearest presser laterally
        const moveDir = gk.x > nearestX ? 1 : -1;
        gk.x = clamp(gk.x + moveDir * 0.8 * this.PACE, GX0 - 30, GX1 + 30);
      }
      return;
    } else {
      gk.holdT = 0;
    }

    const lineY = gk.side === "us" ? BOT - 16 : TOP + 16;
    gk.y += (lineY - gk.y) * 0.1;
    const tx = clamp(this.ball.x, GX0 + 6, GX1 - 6);
    gk.x += (tx - gk.x) * 0.06 * Math.max(1, this.PACE * 2);
    gk.x = clamp(gk.x, GX0, GX1);

    if (this.ball.flying && this.ball.kind === "shot" && dist(gk, this.ball) < 16) {
      this.keeperSave(gk);
    }
  }

  private keeperSave(gk: Player) {
    this.ball.flying = false;
    this.emitCoach(
      gk.side === "us"
        ? "Your keeper saves it! Quick — get open for the throw out."
        : "Saved by the Reds keeper."
    );
    this.setRestart({
      type: "goalkick", team: gk.side,
      x: W / 2, y: gk.side === "us" ? BOT - 40 : TOP + 40,
    });
  }

  // ---------- AI Passing & Shooting ----------

  private shouldShoot(carrier: Player): boolean {
    const goalY = carrier.side === "us" ? TOP : BOT;
    const distToGoal = Math.abs(carrier.y - goalY);
    const lateralToGoal = Math.abs(carrier.x - W / 2);

    // Too far or too wide — don't shoot
    if (distToGoal > H * 0.45) return false;
    if (lateralToGoal > GOAL_W * 3) return false;

    const nearestDef = this.nearestEnemy(carrier.x, carrier.y, carrier.side);
    const enemies = this.enemiesOf(carrier.side);

    // Count outfield defenders between carrier and goal
    let blockersInPath = 0;
    for (const e of enemies) {
      if (e.gk) continue;
      const eDepth = carrier.side === "us" ? (carrier.y - e.y) : (e.y - carrier.y);
      if (eDepth > 0 && eDepth < distToGoal && Math.abs(e.x - carrier.x) < 70) {
        blockersInPath++;
      }
    }

    // ALWAYS shoot if: close to goal + open space (no defenders nearby or in path)
    if (distToGoal < H * 0.30 && nearestDef > 40 && blockersInPath === 0) return true;
    // Shoot if inside the box area and only lightly blocked
    if (distToGoal < H * 0.20 && blockersInPath <= 1) return true;
    // Around the box edge with open space — take the shot
    if (distToGoal < H * 0.35 && lateralToGoal < GOAL_W * 1.5 && nearestDef > 55 && blockersInPath === 0) return true;
    // Random chance when in range with space
    if (distToGoal < H * 0.38 && nearestDef > 35 && Math.random() < 0.15) return true;

    return false;
  }

  private aiConsiderPass() {
    const carrier = this.ball.owner;
    if (!carrier || carrier === this.you || carrier.gk || this.ball.flying || this.passCooldown > 0 || this.gstate !== "live") return;

    // Shooting takes priority
    if (this.shouldShoot(carrier)) {
      this.aiShoot(carrier);
      return;
    }

    const team = carrier.side === "us" ? this.teamUs : this.teamThem;
    const dir = this.attackDir(carrier.side);

    // Build pass options (include GK as back-pass target)
    const opts: { p: Player; s: number; score: number }[] = [];
    for (const p of team) {
      if (p === carrier) continue;
      const av = this.availability(p, carrier);
      const forward = ((carrier.y - p.y) * dir) / H;
      const sc = av * 0.6 + clamp(forward + 0.3, 0, 1) * 0.4;
      opts.push({ p, s: av, score: sc });
    }
    opts.sort((a, b) => b.score - a.score);

    const pressure = this.nearestEnemy(carrier.x, carrier.y, carrier.side);
    const best = opts[0];
    if (!best) return;

    // Back pass to keeper under heavy pressure deep in own half
    const ownGoalY = carrier.side === "us" ? BOT : TOP;
    const deepInOwnHalf = Math.abs(carrier.y - ownGoalY) < H * 0.32;
    if (deepInOwnHalf && pressure < 55 && (!best || best.s < 0.4)) {
      const gk = carrier.side === "us" ? this.gkUs : this.gkThem;
      if (gk && this.nearestEnemy(gk.x, gk.y, carrier.side) > 50) {
        this.doPass(carrier, gk);
        return;
      }
    }

    // On a breakaway (no defender ahead within range), keep dribbling — don't pass backwards
    const goalY = carrier.side === "us" ? TOP : BOT;
    const distToGoal = Math.abs(carrier.y - goalY);
    const enemies = this.enemiesOf(carrier.side);
    let defenderAhead = false;
    for (const e of enemies) {
      if (e.gk) continue;
      const eDepth = carrier.side === "us" ? (carrier.y - e.y) : (e.y - carrier.y);
      if (eDepth > 0 && eDepth < distToGoal * 0.7 && Math.abs(e.x - carrier.x) < 120) {
        defenderAhead = true;
        break;
      }
    }
    if (!defenderAhead && distToGoal < H * 0.65) return; // breakaway — keep running

    // Pass eagerness scales with pressure — don't hold it into a tackle
    const passChance = pressure < 50 ? 0.85 : pressure < 80 ? 0.5 : pressure < 120 ? 0.15 : 0.06;
    const wantPass = Math.random() < passChance || best.s > 0.5;
    if (!wantPass) return;
    if (best.s < 0.15) return;

    let pick = best.p;
    if (opts.length > 1 && Math.random() < 0.2 && opts[1].s > 0.4) pick = opts[1].p;
    this.doPass(carrier, pick);
  }

  private aiShoot(carrier: Player) {
    const goalY = carrier.side === "us" ? TOP - 1 : BOT + 1;
    const aimX = clamp(W / 2 + rand(-GOAL_W * 0.4, GOAL_W * 0.4), GX0 + 6, GX1 - 6);
    this.launchBall(carrier, aimX, goalY, "shot");
    this.emitCoach(carrier.side === "us" ? "Shot by your team!" : "Reds are shooting!");
  }

  private doPass(from: Player, to: Player) {
    this.launchBall(from, to.x, to.y, "pass", to);
  }

  private launchBall(from: Player, tx: number, ty: number, kind: "pass" | "shot", toPlayer?: Player | null) {
    this.ball.flying = true;
    this.ball.owner = null;
    this.ball.x = from.x;
    this.ball.y = from.y;
    this.ball.tx = tx;
    this.ball.ty = ty;
    this.ball.lastTouch = from.side;
    this.ball.kind = kind;
    this.ball.targetPlayer = toPlayer || null;
    this.youHasBall = false;
    this.emitActionUpdate();

    this.ball.onArrive = () => {
      if (kind === "shot") {
        this.resolveShotMiss(from.side);
        return;
      }
      if (toPlayer) {
        this.giveBall(toPlayer);
        this.passCooldown = toPlayer === this.you ? 9999 : Math.round(rand(32, 64) / this.PACE);
        if (toPlayer === this.you) {
          this.emitCoach("It's yours! Dribble into space, then Pass or Shoot.");
        }
      } else {
        const all = [...this.teamUs, ...this.teamThem];
        let best: Player | null = null, bd = 1e9;
        for (const p of all) {
          if (p.gk) continue;
          const dd = dist(p, this.ball);
          if (dd < bd) { bd = dd; best = p; }
        }
        if (best) this.giveBall(best);
      }
    };
  }

  private resolveShotMiss(side: "us" | "them") {
    this.setRestart({
      type: "goalkick",
      team: side === "us" ? "them" : "us",
      x: W / 2,
      y: side === "us" ? TOP + 40 : BOT - 40,
    });
  }

  // ---------- Ball movement ----------

  private moveBall() {
    if (!this.ball.flying) {
      if (this.ball.owner) {
        const targetX = this.ball.owner.x + Math.cos(this.ball.owner.face) * 12;
        const targetY = this.ball.owner.y + Math.sin(this.ball.owner.face) * 12;
        // Right after a steal, lerp the ball to the new carrier to avoid a visual pop
        if (this.stealImmunity > 60) {
          this.ball.x += (targetX - this.ball.x) * 0.3;
          this.ball.y += (targetY - this.ball.y) * 0.3;
        } else {
          this.ball.x = targetX;
          this.ball.y = targetY;
        }
      }
      return;
    }

    const ang = Math.atan2(this.ball.ty - this.ball.y, this.ball.tx - this.ball.x);
    const d = Math.hypot(this.ball.tx - this.ball.x, this.ball.ty - this.ball.y);
    const sp = 9 * this.PACE;

    if (d <= sp) {
      this.ball.x = this.ball.tx;
      this.ball.y = this.ball.ty;
    } else {
      this.ball.x += Math.cos(ang) * sp;
      this.ball.y += Math.sin(ang) * sp;
    }

    if (this.checkBounds()) return;
    if (this.ball.kind === "pass" && this.checkInterception()) return;
    if (d <= sp) {
      this.ball.flying = false;
      const f = this.ball.onArrive;
      this.ball.onArrive = null;
      if (f) f();
    }
  }

  private checkInterception(): boolean {
    const passerSide = this.ball.lastTouch;
    const oppTeam = passerSide === "us" ? this.teamThem : this.teamUs;
    const pool = [...oppTeam];
    if (this.you.side !== passerSide && !pool.includes(this.you)) pool.push(this.you);

    for (const p of pool) {
      if (p.gk) continue;
      if (p.frozenTimer && p.frozenTimer > 0) continue;
      if (Math.hypot(p.x - this.ball.x, p.y - this.ball.y) < 16) {
        this.ball.flying = false;
        this.ball.onArrive = null;
        this.winBall(p);
        this.emitCoach(
          p.side === "us"
            ? "Intercepted! You read the pass — great anticipation."
            : "Reds cut out the pass. Tighten your passing lanes."
        );
        return true;
      }
    }
    return false;
  }

  private checkBounds(): boolean {
    if (this.ball.y <= TOP + 2 && this.ball.x > GX0 && this.ball.x < GX1) {
      this.scoreGoal("us");
      return true;
    }
    if (this.ball.y >= BOT - 2 && this.ball.x > GX0 && this.ball.x < GX1) {
      this.scoreGoal("them");
      return true;
    }
    if (this.ball.x <= L) { this.outThrow(L + 18, this.ball.y); return true; }
    if (this.ball.x >= R) { this.outThrow(R - 18, this.ball.y); return true; }
    if (this.ball.y <= TOP) { this.endLineOut("top"); return true; }
    if (this.ball.y >= BOT) { this.endLineOut("bottom"); return true; }
    return false;
  }

  private outThrow(x: number, y: number) {
    this.ball.flying = false;
    const toTeam = this.ball.lastTouch === "us" ? "them" : "us";
    this.setRestart({
      type: "throwin", team: toTeam,
      x: clamp(x, L + 12, R - 12), y: clamp(y, TOP + 20, BOT - 20),
    });
  }

  private endLineOut(edge: "top" | "bottom") {
    this.ball.flying = false;
    const defendingTeam = edge === "top" ? "them" : "us";
    if (this.ball.lastTouch === defendingTeam) {
      const atkTeam = defendingTeam === "us" ? "them" : "us";
      const cx = this.ball.x < W / 2 ? L + 16 : R - 16;
      const cy = edge === "top" ? TOP + 18 : BOT - 18;
      this.setRestart({ type: "corner", team: atkTeam, x: cx, y: cy });
    } else {
      const cy = edge === "top" ? TOP + 40 : BOT - 40;
      this.setRestart({ type: "goalkick", team: defendingTeam, x: W / 2, y: cy });
    }
  }

  private scoreGoal(team: "us" | "them") {
    this.score[team]++;
    this.gstate = "celebrate";
    this.deadTimer = Math.round(100 / this.PACE);
    this.emitPill("GOAL!", team);
    this.emitCoach(
      team === "us"
        ? "GOOOAL! Brilliant team play. Reset for kick off."
        : "Reds scored. Heads up — we go again from kick off."
    );
    this.ball.flying = false;
    this.ball.owner = null;
    // Conceding team gets the kickoff
    this.restart = { type: "kickoff", team: team === "us" ? "them" : "us", x: W / 2, y: H / 2, _pending: true };
    this.emit({ type: "goal", team, score: { ...this.score } });
    this.emit({ type: "stateChange", state: "celebrate" });
  }

  // ---------- Player actions ----------

  doPlayerPass(): boolean {
    if (!this.youHasBall || this.gstate !== "live") return false;

    // Include GK as a pass target
    const gk = this.you.side === "us" ? this.gkUs : this.gkThem;
    const targets = [...this.mates, gk];

    const PASS_CONE = Math.PI * 0.45; // ~81 degrees total cone
    const GK_CONE = Math.PI * 0.7;   // wider cone for back-pass to keeper
    let best: Player | null = null, bestScore = -1;
    for (const mt of targets) {
      const cone = mt.gk ? GK_CONE : PASS_CONE;
      const ang = Math.atan2(mt.y - this.you.y, mt.x - this.you.x);
      const off = angDiff(ang, this.you.face);
      if (off > cone) continue;
      const av = this.availability(mt, this.you);
      const aim = 1 - off / cone;
      const sc = av * 0.5 + aim * 0.5;
      if (sc > bestScore) { bestScore = sc; best = mt; }
    }

    if (!best) {
      // No teammate in the cone — errant pass that goes out of bounds or to no one
      const passLen = rand(100, 220);
      const tx = this.you.x + Math.cos(this.you.face) * passLen;
      const ty = this.you.y + Math.sin(this.you.face) * passLen;
      // Don't clamp — let it fly out of bounds, checkBounds will handle the restart
      this.launchBall(this.you, tx, ty, "pass", null);
      this.youHasBall = false;
      this.passCooldown = Math.round(rand(40, 70) / this.PACE);
      this.emitCoach("No one in that direction! Face a teammate before you pass.");
      this.emitActionUpdate();
      return true;
    }

    if (best.gk) {
      this.emitCoach("Back to the keeper! Good composure — let them find the open player.");
    } else {
      this.emitCoach("Good ball! You passed the way you were facing. Now find space again.");
    }
    this.doPass(this.you, best);
    this.passCooldown = Math.round(rand(40, 70) / this.PACE);
    this.emitActionUpdate();
    return true;
  }

  doPlayerShoot(): boolean {
    if (!this.youHasBall || this.gstate !== "live") return false;
    if (this.you.y >= ATT_THIRD) {
      this.emitCoach("Get into the attacking third (past the dotted line) to shoot.");
      return false;
    }

    const fx = Math.cos(this.you.face), fy = Math.sin(this.you.face);
    if (fy > -0.15) {
      this.emitCoach("Face toward the goal before you shoot — steer upward, then press S.");
      return false;
    }

    const dy = (TOP - 1) - this.you.y;
    const tX = this.you.x + fx * (dy / fy);
    const aimX = clamp(tX, GX0 - 30, GX1 + 30);
    this.launchBall(this.you, aimX, TOP - 1, "shot");
    this.emitCoach("You're shooting! Great to get into a shooting spot.");
    this.emitActionUpdate();
    return true;
  }

  get canPass(): boolean {
    return this.youHasBall && this.gstate === "live";
  }

  get canShoot(): boolean {
    return this.youHasBall && this.gstate === "live" && this.you.y < ATT_THIRD;
  }

  // ---------- Facing ----------

  private updateFacingAll() {
    const all = [...this.teamUs, ...this.teamThem];
    for (const p of all) {
      if (p === this.you) { p.px = p.x; p.py = p.y; continue; } // user facing is set by input
      const dx = p.x - (p.px ?? p.x);
      const dy = p.y - (p.py ?? p.y);
      if (Math.hypot(dx, dy) > 0.4) p.face = Math.atan2(dy, dx);
      p.px = p.x;
      p.py = p.y;
    }
  }

  // ---------- Match end ----------

  private kickoffKeepScore(team: "us" | "them") {
    const midY = H / 2;
    const midX = W / 2;
    const circleR = 76;
    const kickTeam = team; // team taking kickoff
    [this.you, ...this.mates].forEach((p) => {
      const h = this.homeXY(p.side, p.home);
      p.x = h.x;
      p.y = Math.max(h.y, midY + 5);
      // If blues are NOT kicking off, push out of center circle
      if (kickTeam !== "us") {
        const dx = p.x - midX, dy = p.y - midY;
        if (Math.hypot(dx, dy) < circleR) {
          const ang = Math.atan2(dy, dx);
          p.x = midX + Math.cos(ang) * circleR;
          p.y = Math.max(midY + 5, midY + Math.sin(ang) * circleR);
        }
      }
    });
    this.opps.forEach((p) => {
      const h = this.homeXY(p.side, p.home);
      p.x = h.x;
      p.y = Math.min(h.y, midY - 5);
      if (kickTeam !== "them") {
        const dx = p.x - midX, dy = p.y - midY;
        if (Math.hypot(dx, dy) < circleR) {
          const ang = Math.atan2(dy, dx);
          p.x = midX + Math.cos(ang) * circleR;
          p.y = Math.min(midY - 5, midY + Math.sin(ang) * circleR);
        }
      }
    });
    this.gkUs.x = W * 0.5; this.gkUs.y = BOT - 16;
    this.gkThem.x = W * 0.5; this.gkThem.y = TOP + 16;
    this.setRestart({ type: "kickoff", team, x: W / 2, y: H / 2 });
  }

  private endMatch() {
    this.running = false;
    this.emit({ type: "matchEnd", score: { ...this.score } });
  }

  // ---------- Event helpers ----------

  private emitCoach(message: string) {
    this.emit({ type: "coach", message });
  }

  private emitPill(text: string, team: "us" | "them") {
    const pillType: PillState["type"] =
      text === "GOAL!" ? "dead"
        : text === "Your ball" || (team === "us" && text !== "Reds attacking") ? "att"
          : team === "them" ? "def" : "dead";
    this.emit({ type: "pill", text, pillType });
  }

  private emitActionUpdate() {
    this.emit({ type: "actionUpdate", canPass: this.canPass, canShoot: this.canShoot });
  }

  private coachRestart(r: Restart) {
    const msgs: Record<string, string> = {
      kickoff: "Kick off! Spread out and get the ball moving.",
      throwin: r.team === "us" ? "Our throw-in. Show for it in space." : "Reds throw-in — mark up and get goal-side.",
      goalkick: r.team === "us" ? "Our goal kick. Drop into space to receive." : "Reds goal kick — press high or hold your shape.",
      corner: r.team === "us" ? "Our corner! Find a pocket of space in the box." : "Defending a corner — mark a Red and watch the ball.",
      goal: "",
    };
    if (msgs[r.type]) this.emitCoach(msgs[r.type]);
  }

  get clockDisplay(): string {
    const s = Math.ceil(this.timeLeft / 1000);
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
  }
}
