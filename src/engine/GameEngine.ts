import type {
  Player, Ball, GameState, Possession, Restart, Score,
  MatchConfig, JoystickVector, PillState, Position, ZoneRule,
} from "@/types/game";
import {
  W, H, L, R, TOP, BOT, GX0, GX1, GOAL_W, ATT_THIRD, CONTACT, BOX_H, BOX_HALF_W,
  TURNOVER_FREEZE,
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
  // Fired on every possession change (the giveBall chokepoint). Feeds the live
  // Scenario objective tracker. sameTeam=true is a completed pass; fromRestart
  // marks restart deliveries; role/coords let zone + role objectives evaluate.
  | { type: "possession"; fromId: string | null; fromRole: string | null; toId: string; toRole: string; toSide: "us" | "them"; sameTeam: boolean; fromRestart: boolean; x: number; y: number }
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
  // When true, a dead ball won't be taken until you step into the objective zone
  // (the "enter-zone" start trigger). Set in setRestart, cleared once you enter.
  private waitingForZoneStart = false;
  // True once the ball has been received in the receiveInZone target box (by the
  // objective's role). The renderer hides the highlight box once this is set; it
  // clears on resetRep so the box reappears for the next rep.
  private receivedInZone = false;
  private restart: Restart | null = null;
  private firstKickoff = true;
  private countdownPhase: "3" | "2" | "1" | "GO" | null = null;
  private countdownTimer = 0;
  // When a 3-2-1 countdown is running to restart play AFTER A GOAL, this holds the
  // team taking the kickoff. The countdown's GO routes to kickoffKeepScore(team)
  // instead of the first-whistle open. Null for the opening countdown.
  private pendingKickoffTeam: "us" | "them" | null = null;
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

  // The specific role key for a player ("lw", "rw", "hold", "fwd", ...).
  // Player.role is the coarse role type; rules key off the specific slot, so we
  // recover it from the user config or the encoded id (us-lw / them-fwd).
  private roleKeyOf(p: Player): string {
    if (p.gk) return "gk"; // ids are gk-us / gk-them (suffix), normalize to "gk"
    if (p === this.you) return this.config.userRole || "";
    return p.id.replace("us-", "").replace("them-", "");
  }

  // First teammate on `team` whose role key matches `role` (GK included). Used by
  // restart logic to pick takers/receivers by position (e.g. the winger takes the
  // corner, the #6 receives the kickoff). Returns null if that role isn't on the
  // pitch in the current format.
  private teammateByRole(team: "us" | "them", role: string): Player | null {
    const arr = team === "us" ? this.teamUs : this.teamThem;
    return arr.find((p) => this.roleKeyOf(p) === role) ?? null;
  }

  // Is a zone rule's condition active right now, from the rule's team's POV?
  private zoneRuleActive(rule: ZoneRule): boolean {
    const when = rule.when ?? "always";
    if (when === "always") return true;

    const teamHasBall = this.poss === rule.team;
    if (when === "attacking") return teamHasBall;
    if (when === "defending") return !teamHasBall;

    // Carrier-identity conditions: a specific player (by team + role) has the ball.
    // carrierTeam/carrierRole are set on the rule alongside `when`.
    if (when === "carrier_is") {
      const owner = this.ball.owner;
      if (!owner || owner.gk) return false;
      return owner.side === rule.carrierTeam
        && this.roleKeyOf(owner) === rule.carrierRole;
    }

    // Ball half, relative to this team. depthToY maps depth 0.5 to the halfway
    // line for either side, so compare the ball's Y against that midpoint.
    const halfwayY = depthToY(rule.team, 0.5);
    const ballInOwnHalf = rule.team === "us"
      ? this.ball.y > halfwayY   // us defends the bottom; larger Y = own half
      : this.ball.y < halfwayY;  // them defends the top; smaller Y = own half
    if (when === "ball_own_half") return ballInOwnHalf;
    if (when === "ball_opp_half") return !ballInOwnHalf;

    return true;
  }

  // The active zone rule governing this player right now, or null. Last matching
  // active rule wins (row order = priority): scanning in reverse and taking the
  // first hit means exactly ONE box governs the player each frame, so two
  // non-overlapping conditional layers can never fight over position.
  private activeZoneRuleFor(p: Player): ZoneRule | null {
    if (p.gk) return null;
    const rules = this.config.zoneRules;
    if (!rules || rules.length === 0) return null;
    const roleKey = this.roleKeyOf(p);
    for (let i = rules.length - 1; i >= 0; i--) {
      const rule = rules[i];
      if (rule.team !== p.side || rule.role !== roleKey) continue;
      if (!this.zoneRuleActive(rule)) continue;
      return rule;
    }
    return null;
  }

  // Hard-clamp a player inside their active zone box. Always safe to call — it's
  // the boundary guarantee, run after movement each frame.
  private clampToZoneRules(p: Player): void {
    const rule = this.activeZoneRuleFor(p);
    if (!rule) return;
    const screenXMin = L + (R - L) * rule.xMin;
    const screenXMax = L + (R - L) * rule.xMax;
    const screenYMin = depthToY(p.side, rule.yMax);
    const screenYMax = depthToY(p.side, rule.yMin);
    const yLo = Math.min(screenYMin, screenYMax);
    const yHi = Math.max(screenYMin, screenYMax);
    p.x = clamp(p.x, screenXMin, screenXMax);
    p.y = clamp(p.y, yLo, yHi);
  }

  // Move a player AROUND inside their zone box so they use the whole space,
  // instead of parking on the nearest edge. Called only for idle players (not
  // the ball-chaser / presser). Honors the rule's `movement` mode:
  //   roam (default) → drift to random interior points, re-rolled on arrival/timeout
  //   center         → ease toward the box middle
  //   free           → do nothing (the box stays a pure boundary)
  // Returns true if it took control of the player's motion this frame.
  private roamInZone(p: Player, rule: ZoneRule): boolean {
    const mode = rule.movement ?? "roam";
    if (mode === "free") return false;

    const xMin = L + (R - L) * rule.xMin;
    const xMax = L + (R - L) * rule.xMax;
    const yA = depthToY(p.side, rule.yMax);
    const yB = depthToY(p.side, rule.yMin);
    const yLo = Math.min(yA, yB), yHi = Math.max(yA, yB);
    const sp = 1.4 * this.PACE; // gentle wander pace (slower than chasing)

    if (mode === "center") {
      this.easeToward(p, (xMin + xMax) / 2, (yLo + yHi) / 2, sp);
      return true;
    }

    // roam: keep a small inset so targets aren't right on the edge.
    const insetX = Math.min(16, (xMax - xMin) / 2);
    const insetY = Math.min(16, (yHi - yLo) / 2);
    const haveTarget = p.roamX !== undefined && p.roamY !== undefined;
    const reached = haveTarget && Math.hypot(p.roamX! - p.x, p.roamY! - p.y) < 8;
    p.roamTimer = (p.roamTimer ?? 0) - 1;
    if (!haveTarget || reached || p.roamTimer <= 0) {
      p.roamX = xMin + insetX + Math.random() * Math.max(0, xMax - xMin - 2 * insetX);
      p.roamY = yLo + insetY + Math.random() * Math.max(0, yHi - yLo - 2 * insetY);
      p.roamTimer = 90 + Math.floor(Math.random() * 150); // ~1.5-4s at 60fps
    }
    this.easeToward(p, p.roamX!, p.roamY!, sp);
    return true;
  }

  // Step a player toward (tx,ty), capped at speed `sp`; updates facing.
  private easeToward(p: Player, tx: number, ty: number, sp: number): void {
    const dx = tx - p.x, dy = ty - p.y;
    const d = Math.hypot(dx, dy);
    if (d > 1) {
      p.x += (dx / d) * Math.min(d, sp);
      p.y += (dy / d) * Math.min(d, sp);
      p.face = Math.atan2(dy, dx);
    }
  }

  // The X (width) the ball-carrier should aim for. With no active zone box, that's
  // goal-center (unchanged behavior). Inside a box, it's a chosen lane within the
  // box — re-picked toward open space every ~2s or when the current lane is
  // blocked by a defender — so the carrier uses the whole box width (attack the
  // outside, or cut inside) instead of hugging the inside line.
  private carryLaneX(p: Player): number {
    const rule = this.activeZoneRuleFor(p);
    if (!rule || (rule.movement ?? "roam") === "free") {
      p.carryTimer = 0; // forget any lane so it re-picks next time we're boxed
      return W / 2;
    }
    const xMin = L + (R - L) * rule.xMin;
    const xMax = L + (R - L) * rule.xMax;
    const inset = Math.min(18, (xMax - xMin) / 2);
    const lo = xMin + inset, hi = xMax - inset;

    // Is the current lane blocked? (a defender close on the path ahead)
    const blocked = p.carryLaneX !== undefined &&
      this.laneBlockedAhead(p, p.carryLaneX);
    p.carryTimer = (p.carryTimer ?? 0) - 1;

    if (p.carryLaneX === undefined || p.carryTimer <= 0 || blocked) {
      // Sample a few candidate lanes across the box; pick the one with the most
      // space ahead (fewest/most-distant enemies in that channel).
      let best = (lo + hi) / 2, bestScore = -1;
      for (let i = 0; i < 5; i++) {
        const cx = lo + (hi - lo) * (i / 4); // 5 lanes spanning the box width
        const score = this.laneOpenness(p, cx);
        if (score > bestScore) { bestScore = score; best = cx; }
      }
      p.carryLaneX = best;
      p.carryTimer = 90 + Math.floor(Math.random() * 90); // ~1.5-3s before re-evaluating
    }
    return clamp(p.carryLaneX, lo, hi);
  }

  // Higher = more open: distance to the nearest enemy in the channel between the
  // carrier and the goal-ward point at width `laneX`.
  private laneOpenness(p: Player, laneX: number): number {
    const goalY = p.side === "us" ? TOP : BOT;
    const en = this.enemiesOf(p.side);
    let nearest = 1e9;
    for (const e of en) {
      if (e.gk || (e.frozenTimer && e.frozenTimer > 0)) continue;
      // only enemies ahead (goal-ward) of the carrier matter for a forward lane
      const ahead = (goalY - e.y) * this.attackDir(p.side) > -20;
      if (!ahead) continue;
      const d = segDist(e.x, e.y, p.x, p.y, laneX, goalY);
      if (d < nearest) nearest = d;
    }
    return nearest;
  }

  // True if a defender sits close on the path from the carrier toward its lane.
  private laneBlockedAhead(p: Player, laneX: number): boolean {
    return this.laneOpenness(p, laneX) < 34;
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

    // Authored starting positions override the formation defaults for the players
    // the author placed. Applied AFTER the kickoff half-clamp/circle push-out so a
    // scenario can intentionally put, say, a presser in our half — the author's
    // placement wins. Undragged players keep their formation spot above.
    this.applyStartPositions();
  }

  // The authored start spot for a player (engine px), or null if none. Keyed
  // "us:<role>" / "them:<role>" (role incl. "gk"). No half-clamp — authored
  // intent wins. This is the single source of truth for overrides, used by both
  // initial spawn (applyStartPositions) and per-restart repositioning.
  private startPosFor(p: Player): Position | null {
    const sp = this.config.scenarioSetup?.startPositions;
    if (!sp) return null;
    const pos = sp[`${p.side}:${p.gk ? "gk" : p.role}`];
    if (!pos) return null;
    const h = this.homeXY(p.side, { fx: pos.fx, fy: pos.fy });
    return { x: clamp(h.x, L, R), y: clamp(h.y, TOP, BOT) };
  }

  // Move the players the author explicitly placed to their authored spawn spots.
  private applyStartPositions() {
    if (!this.config.scenarioSetup?.startPositions) return;
    const all = [this.you, ...this.mates, this.gkUs, ...this.opps, this.gkThem];
    for (const p of all) {
      if (!p) continue;
      const pos = this.startPosFor(p);
      if (!pos) continue;
      p.x = pos.x; p.y = pos.y; p.px = p.x; p.py = p.y;
    }
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
  // Public for the renderer: the active scenario objective, if any. Lets the
  // canvas highlight a receiveInZone target box so the player can see where to
  // show for the ball.
  get objective(): MatchConfig["objective"] { return this.config.objective; }
  // Public for the renderer: has the ball been received in the objective box?
  // When true the highlight box is hidden (its job is done for this rep).
  get hasReceivedInZone(): boolean { return this.receivedInZone; }

  // Is the player you control standing inside the receiveInZone objective box?
  // Used by the "enter-zone" start trigger to know when to take the ball.
  private inObjectiveZone(): boolean {
    const obj = this.config.objective;
    if (!obj || obj.type !== "receiveInZone" || !this.you) return false;
    const z = obj.zone;
    return this.you.x >= z.x && this.you.x <= z.x + z.w && this.you.y >= z.y && this.you.y <= z.y + z.h;
  }
  // Public for the renderer: is this rule currently governing its player?
  isZoneRuleActive(rule: ZoneRule): boolean { return this.zoneRuleActive(rule); }
  // Replace the whole rule set live (used when the UI edits/removes rules).
  setZoneRules(rules: ZoneRule[]) {
    this.config.zoneRules = rules;
  }

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
          if (this.pendingKickoffTeam) {
            // Post-goal restart: the conceding team kicks off after the countdown.
            const team = this.pendingKickoffTeam;
            this.pendingKickoffTeam = null;
            this.kickoffKeepScore(team);
          } else {
            // Scenario steps that configure a restart (e.g. "every restart is a
            // throw-in by us") OPEN on that restart instead of a center kickoff —
            // so the drill begins from the situation being taught. setRestart()
            // sets the dead-ball "get set" pause (incl. restartDelaySec); don't
            // zero it here or the ball would be taken instantly.
            this.openScenarioOrKickoff();
          }
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
      // "enter-zone" start: once YOU step into the receive zone (after a short
      // grace so it can't fire on frame 0 if you spawn in it), stop waiting and
      // arm a short get-set delay so the ball is played in a beat LATER — you
      // settle in the box, THEN it comes. restartDelaySec drives that delay (2.5s
      // default). Until entry the deadTimer ticks as a ~12s safety cap below.
      if (this.waitingForZoneStart && this.deadTimer < 12 * 60 - 30 && this.inObjectiveZone()) {
        this.waitingForZoneStart = false;
        const delaySec = this.config.scenarioSetup?.restartDelaySec ?? 2.5;
        this.deadTimer = Math.round(delaySec * 60);
      }
      if (this.deadTimer > 0) {
        this.deadTimer--;
      } else {
        this.waitingForZoneStart = false;
        if (this.restart?._pending) {
          // Post-goal: after the brief celebration, run a visible 3-2-1 countdown
          // (with the "Restarting with a kickoff" prompt already shown) before the
          // conceding team kicks off. startKickoffCountdown stashes the team; the
          // countdown's GO calls kickoffKeepScore.
          this.startKickoffCountdown(this.restart.team);
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

  // Open the match (or a rep reset) on the scenario's configured restart if one
  // is set; otherwise the normal center kickoff. setRestart() applies the forced
  // type / team / fixed point. We pass a non-kickoff seed type so the override
  // (which deliberately skips kickoffs) actually fires.
  private openScenarioOrKickoff() {
    const setup = this.config.scenarioSetup;
    if (setup?.forcedRestart) {
      const team = setup.restartTeam ?? "us";
      // Seed at the fixed point if given, else a sensible default. For a throw-in
      // with no authored point, default to the LEFT sideline at mid-depth in our
      // build-up half. setRestart() normalizes type/team/point + sideline snap.
      const x = setup.restartX ?? (setup.forcedRestart === "throwin" ? L + 18 : W / 2);
      const y = setup.restartY ?? (team === "us" ? H * 0.62 : H * 0.38);
      this.setRestart({ type: setup.forcedRestart, team, x, y }, true);
    } else {
      this.setRestart({ type: "kickoff", team: "us", x: W / 2, y: H / 2 });
    }
  }

  // Rep-based scenario drilling: reset to a fresh configured restart WITHOUT
  // touching score/objective progress, so a scenario can run repeated reps
  // (throw-in → play → reset → throw-in …). Called by the lesson Scenario UI on
  // a successful rep or when the per-rep timer expires.
  resetRep() {
    if (!this.running) return;
    this.receivedInZone = false; // fresh rep → show the highlight box again
    this.ball.flying = false;
    this.ball.owner = null;
    this.ball.launchedBy = null;
    this.youHasBall = false;
    this.kickoffPositions();
    // openScenarioOrKickoff() → setRestart() sets the dead-ball "get set" pause
    // (incl. restartDelaySec). Do NOT zero it here, or reps would resume the ball
    // instantly with no time to reposition.
    this.openScenarioOrKickoff();
  }

  // `forceScenario` is true ONLY for the drill open/reset (openScenarioOrKickoff),
  // where a scenario's forcedRestart should shape the delivery so the drill loops
  // (e.g. "always restart with a throw-in"). A GENUINE out-of-bounds during play
  // (the ball actually crossing a line) calls setRestart WITHOUT it, so the real
  // restart type stands: a throw-in stays where it went out, a ball over your own
  // goal line is a corner to the other team — never coerced into the drill type.
  private setRestart(r: Restart, forceScenario = false) {
    // Scenario override: force the configured restart type for the drill reset
    // only. Kickoffs (first whistle / post-goal) are always left alone.
    const setup = this.config.scenarioSetup;
    const forced = forceScenario ? setup?.forcedRestart : undefined;
    const hasFixedPoint = forced && setup?.restartX != null && setup?.restartY != null;
    if (forced && r.type !== "kickoff" && forced !== r.type) {
      r = { ...r, type: forced };
      if (setup?.restartTeam) r.team = setup.restartTeam;
      // With NO authored point, a throw-in defaults to a SIDELINE (you can't
      // throw from mid-pitch). When a point IS set, the author wins (below) and
      // we don't snap — the ball starts exactly where it was placed.
      if (forced === "throwin" && !hasFixedPoint) r.x = r.x < W / 2 ? L + 18 : R - 18;
    }
    // Fixed restart point (Scenario authoring): take it EXACTLY from here every
    // time — no sideline snap, so the ball starts where the marker was dropped.
    if (hasFixedPoint) {
      r = { ...r, x: clamp(setup!.restartX!, L, R), y: clamp(setup!.restartY!, TOP, BOT) };
    }
    this.gstate = "dead";
    this.restart = r;
    // Dead-ball "get set" pause (ticks 1/frame @ 60fps). A scenario can set an
    // explicit restartDelaySec so the player has time to move into position
    // before the ball is taken; otherwise use the defaults.
    const delaySec = setup?.restartDelaySec;
    this.deadTimer = delaySec != null && r.type !== "kickoff"
      ? Math.round(delaySec * 60)
      : (r.type === "kickoff" ? 120 : Math.round(70 / this.PACE));
    // "enter-zone" start trigger: hold the ball until YOU step into the receive
    // zone, rather than firing on the timer. Only armed for non-kickoff restarts
    // that have a receiveInZone objective to watch. The deadTimer above still runs
    // as a SAFETY CAP — but stretched to at least ~12s so you have time to move in
    // (without it, a short get-set value would reset the rep before you arrive).
    const wantZoneStart = setup?.startTrigger === "enter-zone"
      && r.type !== "kickoff"
      && this.config.objective?.type === "receiveInZone";
    this.waitingForZoneStart = !!wantZoneStart;
    if (wantZoneStart) this.deadTimer = Math.max(this.deadTimer, 12 * 60);
    this.youHasBall = false;
    this.ball.flying = false;
    this.ball.owner = null;
    this.ball.x = r.x;
    this.ball.y = r.y;
    this.poss = r.team;
    // Clear any leftover restart-hold so a new dead ball never freezes a stale
    // taker from the previous play/rep.
    for (const p of [...this.teamUs, ...this.teamThem]) p.restartHoldTimer = 0;
    this.emitActionUpdate();

    const labels: Record<string, string> = {
      kickoff: "Kick off", throwin: "Throw-in",
      goalkick: "Goal kick", corner: "Corner", goal: "GOAL!",
    };
    this.emitPill(labels[r.type] || "Restart", r.team);

    // Pick the taker by restart type so the right player stands over the ball:
    //  • goal kick → the goalkeeper plays it out
    //  • corner    → the winger on the side the ball went out (lw on the left,
    //                rw on the right), falling back to the nearer teammate
    //  • everything else → the nearest teammate to the spot
    let taker: Player | null;
    if (r.type === "goalkick") {
      taker = (r.team === "us" ? this.gkUs : this.gkThem) ?? this.nearestTeammateTo(r.team, r.x, r.y, true);
    } else if (r.type === "corner") {
      const wingRole = r.x < W / 2 ? "lw" : "rw";
      taker = this.teammateByRole(r.team, wingRole) ?? this.nearestTeammateTo(r.team, r.x, r.y, true);
    } else {
      taker = this.nearestTeammateTo(r.team, r.x, r.y, true);
    }
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

      // Authored start position wins over the restart-type repositioning below,
      // so a player you placed (e.g. the #10 pushed up to press) stays put on
      // every restart/rep instead of being dragged back to its formation spot.
      const authored = this.startPosFor(p);
      if (authored) { p.x = authored.x; p.y = authored.y; continue; }

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
        // On corners give the attacking side a real shape around the taker so
        // there's support, not a random scatter. The opp goal line is r.team's
        // attacking end; the corner is taken from the near corner at r.x.
        const goalY = r.team === "us" ? TOP : BOT;
        const nearPost = r.x < W / 2;                 // which side the corner is on
        const role = this.roleKeyOf(p);
        if (role === "hold") {
          // #6 supports SHORT — a few steps off the taker for the give-and-go.
          p.x = clamp(r.x + (nearPost ? 70 : -70), L + 24, R - 24);
          p.y = clamp(goalY - dir * 70, TOP + 20, BOT - 20);
        } else if (role === "fwd") {
          // Striker attacks the goal — central, right in front of the net.
          p.x = clamp(W / 2 + rand(-20, 20), GX0, GX1);
          p.y = clamp(goalY - dir * 36, TOP + 16, BOT - 16);
        } else if (role === "lw" || role === "rw") {
          // The OTHER winger holds the FAR post (opposite the taker's corner).
          p.x = clamp(nearPost ? GX1 + 24 : GX0 - 24, L + 24, R - 24);
          p.y = clamp(goalY - dir * 30, TOP + 16, BOT - 16);
        } else {
          // Any other role (e.g. 7v7 mids): get into the box.
          const boxY = goalY - dir * 60;
          p.x = clamp(GX0 + rand(-40, GOAL_W + 40), L + 30, R - 30);
          p.y = clamp(boxY + rand(-30, 30), TOP + 20, BOT - 20);
        }
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
    const type = this.restart?.type;
    const taker = this.restart?.taker ?? (this.poss === "us" ? this.mates[0] : this.opps[0]);
    this.giveBall(taker, true);
    this.passCooldown = Math.round(30 / this.PACE);
    this.emitPill(this.poss === "us" ? "Your ball" : "Reds attacking", this.poss);
    this.restart = null;
    this.emit({ type: "stateChange", state: "live" });

    // After a throw-in / kick-in, the thrower plays the ball FROM where they took
    // it — hold their spot briefly so they don't flash back inside to formation
    // the instant the ball is live. (Goal kicks/corners have their own shape.)
    if (taker && taker !== this.you && type === "throwin") {
      taker.restartHoldTimer = 72; // ~1.2s
    }

    // Restarts begin with a PASS, not a dribble — corners, goal kicks and
    // kickoffs all play a first ball to a teammate. We skip the auto-pass only
    // when the HUMAN is the taker, so they make the pass themselves (they keep
    // the ball and choose). The AI taker delivers to the type-appropriate
    // receiver below.
    if (taker && taker !== this.you) {
      const target = this.restartReceiver(taker, type);
      if (target && target !== taker) this.doPass(taker, target);
    }
  }

  // Who an AI-taken restart should be played to:
  //  • a scenario objective's named receiver role always wins (drill intent)
  //  • kickoff  → pass back to the #6 (hold) to start the build-up
  //  • goalkick → the most open outfield teammate (play out from the back)
  //  • corner   → the striker (fwd) attacking the goal, else the supporting #6
  //  • throw-in / other → the most open teammate
  // Returns null when there's no sensible target (taker keeps it).
  private restartReceiver(taker: Player, type?: Restart["type"]): Player | null {
    const team = taker.side === "us" ? this.teamUs : this.teamThem;

    // Scenario-named receiver (e.g. "#6 receives in the zone") takes precedence.
    const objRole = (this.config.objective as { role?: string } | undefined)?.role;
    if (objRole) {
      const named = team.find((p) => p !== taker && !p.gk && this.roleKeyOf(p) === objRole);
      if (named) return named;
    }

    const byRole = (role: string) =>
      team.find((p) => p !== taker && this.roleKeyOf(p) === role) ?? null;
    const mostOpen = () => {
      let best: Player | null = null, bestAv = -Infinity;
      for (const p of team) {
        if (p === taker || p.gk) continue;
        const av = this.availability(p, taker);
        if (av > bestAv) { bestAv = av; best = p; }
      }
      return best;
    };

    if (type === "kickoff") return byRole("hold") ?? mostOpen();
    if (type === "corner") return byRole("fwd") ?? byRole("hold") ?? mostOpen();
    // goalkick, throwin, and anything else: play to the most open teammate.
    return mostOpen();
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

  // `fromRestart` skips the turnover-freeze (kickoffs, throw-ins, goal kicks
  // aren't "losing the ball" — nobody should be penalised on a restart).
  protected giveBall(p: Player, fromRestart = false) {
    // Who lost it: the current owner, or — when the ball is in flight (a pass or
    // shot nulls `owner` on launch) — whoever last kicked it. Without the
    // fallback, an interception or loose-ball pickup reaches here with
    // `owner === null` and the passer escapes the freeze. `launchedBy` is
    // consumed here so a settled ball doesn't keep pointing at a stale loser.
    const prev = this.ball.owner ?? this.ball.launchedBy ?? null;
    this.ball.launchedBy = null;
    // Turnover rule: whenever possession changes to the OTHER team during open
    // play, the player who lost it pauses before they can engage again. This is
    // the single chokepoint for every possession change (tackle, interception,
    // AND loose-ball pickup), so the freeze can't be bypassed.
    if (!fromRestart && prev && prev !== p && prev.side !== p.side && !prev.gk) {
      this.recentLoser = prev;
      this.recentLoserTimer = Math.round(TURNOVER_FREEZE / Math.max(0.5, this.PACE));
      prev.frozenTimer = TURNOVER_FREEZE;
      prev.backoff = Math.round((TURNOVER_FREEZE * 0.75) / Math.max(0.5, this.PACE));
    }

    this.ball.owner = p;
    this.ball.flying = false;
    this.ball.x = p.x;
    this.ball.y = p.y;
    this.poss = p.side;
    this.youHasBall = p === this.you;
    this.ball.lastTouch = p.side;
    // Possession-change event for the live Scenario objective tracker. Emitted
    // for every change incl. restarts; `sameTeam` (and not a restart) marks a
    // completed pass.
    this.emit({
      type: "possession",
      fromId: prev?.id ?? null,
      fromRole: prev ? this.roleKeyOf(prev) : null,
      toId: p.id,
      toRole: this.roleKeyOf(p),
      toSide: p.side,
      sameTeam: !!prev && prev.side === p.side,
      fromRestart,
      x: p.x,
      y: p.y,
    });
    // Mirror the scenarioObjective receiveInZone check so the renderer can hide
    // the highlight box the moment the ball is received in it (by the objective's
    // role). Cleared on resetRep so each rep gets a fresh box.
    const obj = this.config.objective;
    if (obj && obj.type === "receiveInZone" && this.roleKeyOf(p) === obj.role) {
      const z = obj.zone;
      if (p.x >= z.x && p.x <= z.x + z.w && p.y >= z.y && p.y <= z.y + z.h) {
        this.receivedInZone = true;
      }
    }
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
      // Push loser well clear so the carrier has space to dribble away.
      // (The turnover freeze itself is applied centrally in giveBall.)
      const pushAng = Math.atan2(loser.y - p.y, loser.x - p.x);
      loser.x = clamp(loser.x + Math.cos(pushAng) * 45, L, R);
      loser.y = clamp(loser.y + Math.sin(pushAng) * 45, TOP, BOT);
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

      // Restart taker holds their spot briefly after a throw-in / kick-in, so
      // they stay where they played it from instead of flashing back inside to
      // their formation slot. Skipped once they're the carrier (then they move
      // normally). Ticks down here.
      if (m.restartHoldTimer && m.restartHoldTimer > 0) {
        if (m === carrier) { m.restartHoldTimer = 0; }
        else { m.restartHoldTimer--; m.face = this.attackDir(m.side) < 0 ? -Math.PI / 2 : Math.PI / 2; continue; }
      }

      // ===== AI CARRIER: dribble toward goal, avoiding defenders =====
      if (m === carrier) {
        const goalY = m.side === "us" ? TOP : BOT;
        // Default aim is goal-center. But if the carrier is inside a zone box,
        // aim X at a chosen WIDTH-LANE inside that box instead of dead center —
        // otherwise they always drift to the inside (central) line and hug it.
        // The lane is re-picked toward open space, so they attack outside when
        // the inside is covered and cut in when the outside is covered.
        const goalX = this.carryLaneX(m);

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

      // If this idle player (not the ball-chaser/presser) sits in a zone box set
      // to roam/center, let it wander the box instead of parking on the tactic
      // target — so it uses the whole space. The ball-chaser keeps its job.
      const zr = m === ballChaser ? null : this.activeZoneRuleFor(m);

      // Off-the-ball zone tendency: while WE have the ball, drive the player
      // toward a tendency target instead of roaming. `hold_width` pins them to
      // the wide edge of their box (stretch the defense); `drop_deep` pulls them
      // toward the ball to offer a short option. It's a strong lean rather than a
      // hard lock — enforceSpacing still moderates it to keep team shape sane.
      const offBall = zr?.offBall ?? "default";
      let offBallActive = false;
      if (zr && attacking && offBall !== "default") {
        const zXMin = L + (R - L) * zr.xMin, zXMax = L + (R - L) * zr.xMax;
        const zYMin = TOP + (BOT - TOP) * zr.yMin, zYMax = TOP + (BOT - TOP) * zr.yMax;
        if (offBall === "hold_width") {
          // Drive to whichever side edge of the box is nearer the touchline.
          const targetX = (Math.abs(zXMin - L) <= Math.abs(R - zXMax)) ? zXMin + 6 : zXMax - 6;
          this.easeToward(m, targetX, clamp(m.y, zYMin, zYMax), 2.0 * this.PACE);
          offBallActive = true;
        } else if (offBall === "drop_deep") {
          // Drive toward the ball (a short receiving option), staying in the box.
          const targetX = clamp(m.x + (this.ball.x - m.x) * 0.6, zXMin, zXMax);
          const targetY = clamp(m.y + (this.ball.y - m.y) * 0.6, zYMin, zYMax);
          this.easeToward(m, targetX, targetY, 2.0 * this.PACE);
          offBallActive = true;
        }
      }

      const roamed = offBallActive || (zr ? this.roamInZone(m, zr) : false);

      if (!roamed) {
        const sp = (m === ballChaser ? (attacking ? 2.1 : 2.8) : (attacking ? 1.8 : 1.6)) * this.PACE * (backoff ? 0.5 : 1);
        const ang = Math.atan2(ty - m.y, tx - m.x);
        const dd = Math.hypot(tx - m.x, ty - m.y);
        if (dd > 1.5) {
          m.x += Math.cos(ang) * Math.min(dd, sp);
          m.y += Math.sin(ang) * Math.min(dd, sp);
        }
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
    // Track the ball's x, but NOT instantly — a smart placement into the corner
    // should be able to beat the keeper. The lerp lags the ball so a well-placed
    // shot leaves a real gap; a tame shot down the middle still gets covered.
    const tx = clamp(this.ball.x, GX0 + 6, GX1 - 6);
    gk.x += (tx - gk.x) * 0.045 * Math.max(1, this.PACE * 1.6);
    gk.x = clamp(gk.x, GX0, GX1);

    // A shot crossing the keeper's line is a save CHANCE, not an automatic save.
    // Trigger when the ball reaches the goal line (within the keeper's diving
    // range laterally); keeperSave then rolls the odds.
    if (
      this.ball.flying && this.ball.kind === "shot" &&
      Math.abs(this.ball.y - gk.y) < 18 && Math.abs(this.ball.x - gk.x) < 110
    ) {
      this.keeperSave(gk);
    }
  }

  // A shot has reached the keeper's line — decide save vs goal by SHOT QUALITY:
  //  • placement: the further the ball is from where the keeper is standing, the
  //    harder to reach — a corner finish away from the keeper usually beats them.
  //  • distance:  close-range shots give less reaction time (harder to save);
  //    long-range efforts are easier to read.
  //  • angle:     a tight/wide angle is a worse shooting position → easier save.
  // A good shot to the open corner goes in most of the time; a poor-angle or
  // long-range effort is saved ~4 out of 5. The save is never a flat certainty.
  private keeperSave(gk: Player) {
    // Off-target shots aren't the keeper's problem — let them fly out (checkBounds
    // turns it into a goal kick / corner). Only on-target shots are saved/scored.
    const onTarget = this.ball.x > GX0 - 6 && this.ball.x < GX1 + 6;
    if (!onTarget) return;

    this.ball.flying = false;
    const from = this.ball.shotFrom ?? { x: this.ball.x, y: gk.side === "us" ? TOP : BOT };

    // Placement gap (px) the keeper must cover to where the ball crosses. The
    // keeper comfortably covers ~26px; reach falls off out to a ~110px dive.
    const gap = Math.abs(this.ball.x - gk.x);
    const placement = clamp((gap - 26) / 84, 0, 1); // 0 = at the keeper, 1 = far corner

    // Shot distance to goal (normalized over a full half ≈ H/2). Close = 0.
    const goalY = gk.side === "us" ? BOT : TOP;
    const distN = clamp(Math.abs(from.y - goalY) / (H * 0.5), 0, 1);

    // Angle quality: lateral offset of the shooter from goal-center vs the goal
    // mouth. Central (good angle) → 0; out near the post (bad angle) → 1.
    const angleBad = clamp((Math.abs(from.x - W / 2) - GOAL_W / 2) / (W * 0.32), 0, 1);

    // Base save chance: a tame, central, close shot AT the keeper is almost
    // always saved. Good placement is the dominant beat-the-keeper factor;
    // distance and a poor angle push the save chance back UP.
    let saveChance =
      0.92                       // tame shot straight at the keeper
      - placement * 0.85         // placed away from the keeper → much likelier goal
      + distN * 0.30             // struck from distance → easier to save
      + angleBad * 0.28;         // poor (wide) angle → easier to save
    saveChance = clamp(saveChance, 0.05, 0.97);

    const saved = Math.random() < saveChance;
    if (saved) {
      this.emitCoach(
        gk.side === "us"
          ? "Your keeper saves it! Quick — get open for the throw out."
          : "Saved by the Reds keeper."
      );
      this.setRestart({
        type: "goalkick", team: gk.side,
        x: W / 2, y: gk.side === "us" ? BOT - 40 : TOP + 40,
      });
    } else {
      // Beaten — the shot is on target and finds the net.
      this.scoreGoal(gk.side === "us" ? "them" : "us");
    }
  }

  // ---------- AI Passing & Shooting ----------

  // `eager` (a `shoot` zone tendency) relaxes the range/lateral gate for THIS
  // carrier only — they'll have a go from the edge of the box / from a tighter
  // angle. The global "no shots from distance" gate is unchanged elsewhere.
  private shouldShoot(carrier: Player, eager = false): boolean {
    const goalY = carrier.side === "us" ? TOP : BOT;
    const distToGoal = Math.abs(carrier.y - goalY);
    const lateralToGoal = Math.abs(carrier.x - W / 2);

    // HARD GATE: shots are only allowed from INSIDE the penalty box (the box
    // drawn on the pitch). Anywhere outside it — even with open space — the
    // carrier dribbles in instead of shooting from distance. A `shoot` zone
    // extends the range (long-range efforts) and angle for this player.
    const maxDist = eager ? BOX_H * 1.8 : BOX_H;
    const maxLateral = eager ? BOX_HALF_W * 1.35 : BOX_HALF_W;
    if (distToGoal > maxDist) return false;
    if (lateralToGoal > maxLateral) return false;

    const enemies = this.enemiesOf(carrier.side);

    // Count outfield defenders between carrier and goal
    let blockersInPath = 0;
    for (const e of enemies) {
      if (e.gk) continue;
      const eDepth = carrier.side === "us" ? (carrier.y - e.y) : (e.y - carrier.y);
      if (eDepth > 0 && eDepth < distToGoal && Math.abs(e.x - carrier.x) < 60) {
        blockersInPath++;
      }
    }

    // Inside the box: shoot when the path is clear, or when only lightly blocked
    // and in close (we're already in the box, so be willing to pull the trigger).
    // An eager shooter will also pull the trigger through a single blocker at any
    // range inside its (extended) window — backing themselves to hit the target.
    if (blockersInPath === 0) return true;
    if (eager && blockersInPath <= 1) return true;
    if (distToGoal < BOX_H * 0.6 && blockersInPath <= 1) return true;
    return false;
  }

  // Cross from a wide attacking zone: find the best teammate inside the
  // opponent's penalty box and deliver to them. Returns false (no cross made)
  // when there's nobody worth aiming at, so the caller falls back to normal
  // carrier logic. The delivery goes through doPass → launchBall, so it can be
  // intercepted and obeys the same turnover rules as any other pass.
  private tryCross(carrier: Player): boolean {
    // Opponent goal line + box geometry. The box extends BOX_H INTO the field
    // from the goal line: us attacks the TOP goal so its box is y∈[TOP, TOP+BOX_H];
    // them attacks BOT so its box is y∈[BOT-BOX_H, BOT]. Width is centered on goal.
    const goalY = carrier.side === "us" ? TOP : BOT;
    const boxFarY = carrier.side === "us" ? goalY + BOX_H : goalY - BOX_H;
    const inBox = (p: Player) =>
      Math.abs(p.x - W / 2) <= BOX_HALF_W &&
      (carrier.side === "us" ? p.y <= boxFarY : p.y >= boxFarY);

    const team = carrier.side === "us" ? this.teamUs : this.teamThem;
    let best: Player | null = null;
    let bestScore = -Infinity;
    for (const m of team) {
      if (m === carrier || m.gk || (m.frozenTimer && m.frozenTimer > 0)) continue;
      if (!inBox(m)) continue;
      // Prefer central, unmarked targets — a header/tap from the spot.
      const central = 1 - Math.min(1, Math.abs(m.x - W / 2) / BOX_HALF_W);
      const space = clamp(this.nearestEnemy(m.x, m.y, m.side) / 60, 0, 1);
      const score = central * 0.6 + space * 0.4;
      if (score > bestScore) { bestScore = score; best = m; }
    }
    if (!best) return false;
    this.doPass(carrier, best);
    this.emitCoach(
      carrier.side === "us"
        ? "Cross into the box — get a runner on the end of it!"
        : "Reds whip one into the box."
    );
    return true;
  }

  // Recycle: release to the most open teammate (the safest pass, regardless of
  // direction). Returns false when there's nobody safe enough — the caller then
  // falls back to normal carrier logic. Like every pass it goes through doPass.
  private tryRecycle(carrier: Player): boolean {
    const team = carrier.side === "us" ? this.teamUs : this.teamThem;
    let best: Player | null = null;
    let bestAv = -Infinity;
    for (const m of team) {
      if (m === carrier || m.gk || (m.frozenTimer && m.frozenTimer > 0)) continue;
      const av = this.availability(m, carrier);
      if (av > bestAv) { bestAv = av; best = m; }
    }
    if (!best || bestAv < 0.35) return false; // no genuinely safe option
    this.doPass(carrier, best);
    return true;
  }

  private aiConsiderPass() {
    const carrier = this.ball.owner;
    if (!carrier || carrier === this.you || carrier.gk || this.ball.flying || this.passCooldown > 0 || this.gstate !== "live") return;

    // Zone tendency: what this carrier prefers to DO in their active zone.
    // Biases the existing carrier levers (shoot gate, dribble gate, pass
    // eagerness). Omitted/"default" → unchanged behavior.
    const action = this.activeZoneRuleFor(carrier)?.action ?? "default";

    // Shooting takes priority. A `shoot` zone relaxes the gate (this zone only).
    if (this.shouldShoot(carrier, action === "shoot")) {
      this.aiShoot(carrier);
      return;
    }

    // Cross tendency: from this zone the carrier looks to deliver into the box.
    // If there's a teammate to aim at, cross and return; otherwise fall through
    // to the normal carrier logic so they don't get stuck holding the ball.
    if (action === "cross" && this.tryCross(carrier)) return;

    // Recycle tendency: play it safe — look to release to the most open teammate
    // (even square/backward) rather than dribble or force it forward. Checked
    // BEFORE the dribble/breakaway gates so it actually keeps possession instead
    // of running into space. Falls through if nobody's safe to give it to.
    if (action === "recycle" && this.tryRecycle(carrier)) return;

    const team = carrier.side === "us" ? this.teamUs : this.teamThem;
    const dir = this.attackDir(carrier.side);

    // Build outfield pass options. The GK is deliberately EXCLUDED here — the
    // keeper is only ever reachable via the gated back-pass block below, never
    // as a "best option", so the carrier can't keep dumping it backwards.
    const opts: { p: Player; s: number; score: number }[] = [];
    for (const p of team) {
      if (p === carrier || p.gk) continue;
      const av = this.availability(p, carrier);
      const forward = ((carrier.y - p.y) * dir) / H;
      // Reward forward options, penalize backward ones — bias the attack upfield.
      const sc = av * 0.55 + clamp(forward + 0.3, 0, 1) * 0.45;
      opts.push({ p, s: av, score: sc });
    }
    opts.sort((a, b) => b.score - a.score);

    const pressure = this.nearestEnemy(carrier.x, carrier.y, carrier.side);
    const best = opts[0];
    if (!best) return;

    const goalY = carrier.side === "us" ? TOP : BOT;
    const distToGoal = Math.abs(carrier.y - goalY);
    const enemies = this.enemiesOf(carrier.side);

    // ===== GOAL-LINE DECISION =====
    // Once the carrier has dribbled right up to the opponent's goal line (byline),
    // they must DO something — without this they keep trying to dribble forward
    // into the corner with nowhere to go and get stuck. The angle to goal picks
    // the action: from a wide position whip a CROSS into the box; from a central
    // position (roughly in front of the goal frame) pull the trigger and SHOOT.
    // Checked BEFORE the "keep dribbling" breakaway gates below so it can't be
    // preempted. Falls through to normal logic only if the chosen action can't be
    // executed (e.g. a cross with nobody to aim at).
    const atGoalLine = distToGoal < BOX_H * 0.7;
    if (atGoalLine) {
      const lateral = Math.abs(carrier.x - W / 2);
      // "Wide" = out past the goal frame (a crossing position); "inside" = within
      // the goal-mouth width, a shooting angle.
      const wide = lateral > GOAL_W / 2;
      if (wide) {
        if (this.tryCross(carrier)) return;
        // No cross target available — if we're not hopelessly tight on the byline,
        // a near-post shot is better than dribbling into the corner.
        if (lateral < BOX_HALF_W) { this.aiShoot(carrier); return; }
      } else {
        this.aiShoot(carrier);
        return;
      }
    }

    // Is there open space to advance into? Check the lane straight ahead and the
    // two flanks ahead of the carrier — if any is clear of defenders, they can
    // attack forward (drive through, or go around their marker on the open side)
    // and should NOT retreat.
    const aheadClear = (offsetX: number): boolean => {
      const tx = carrier.x + offsetX;
      const ty = carrier.y + (goalY - carrier.y) * 0.35; // a point ~35% toward goal
      for (const e of enemies) {
        if (e.gk || (e.frozenTimer && e.frozenTimer > 0)) continue;
        const eDepth = (carrier.y - e.y) * dir; // >0 = enemy is goal-ward of carrier
        if (eDepth <= 0) continue;               // ignore defenders behind the carrier
        if (segDist(e.x, e.y, carrier.x, carrier.y, tx, ty) < 38) return false;
      }
      return true;
    };
    const canGoForward = aheadClear(0);      // straight ahead is open
    const canGoOutside = aheadClear(110);    // space to one flank
    const canGoInside = aheadClear(-110);    // space to the other flank
    const hasSpaceAhead = canGoForward || canGoOutside || canGoInside;

    // Back pass to keeper ONLY when in their OWN THIRD and genuinely trapped:
    // a defender right on them (within ~26px) with no lane ahead to advance or
    // beat the marker. Anywhere past the own third, retreating to the GK is
    // never allowed — they must attack or play a forward/square ball.
    const ownGoalY = carrier.side === "us" ? BOT : TOP;
    const inOwnThird = Math.abs(carrier.y - ownGoalY) < H / 3;
    const trapped = pressure < 26 && !hasSpaceAhead;
    if (inOwnThird && trapped) {
      const gk = carrier.side === "us" ? this.gkUs : this.gkThem;
      if (gk && this.nearestEnemy(gk.x, gk.y, carrier.side) > 50) {
        this.doPass(carrier, gk);
        return;
      }
    }

    // `dribble` zone: back themselves to carry it. Hold the ball through tighter
    // pressure than usual as long as there's any space ahead — only let go when a
    // defender is right on top of them. `recycle` does the opposite (below): it
    // never holds for a dribble, always looking for the safe release.
    if (action === "dribble" && hasSpaceAhead && pressure > 14) return;

    // Given any space ahead and not tightly pressed, KEEP ATTACKING — don't pass.
    // The carrier-lane dribble drives them forward / around the defender. This is
    // the main "be aggressive" lever: only a defender right on them (<24px) stops
    // a carrier with open space from continuing.
    if (hasSpaceAhead && pressure > 24 && distToGoal < H * 0.9) return;

    // Breakaway: no defender ahead at all → definitely keep running.
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

    // Pass eagerness scales with pressure — don't hold it into a tackle. A
    // `dribble` zone cuts that eagerness so the carrier keeps it more often.
    const dribbleBias = action === "dribble" ? 0.35 : 1;
    const passChance = (pressure < 50 ? 0.85 : pressure < 80 ? 0.5 : pressure < 120 ? 0.15 : 0.06) * dribbleBias;
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
    this.ball.launchedBy = from; // preserve the kicker for the turnover freeze
    this.ball.x = from.x;
    this.ball.y = from.y;
    this.ball.tx = tx;
    this.ball.ty = ty;
    this.ball.lastTouch = from.side;
    this.ball.kind = kind;
    this.ball.targetPlayer = toPlayer || null;
    this.ball.shotFrom = kind === "shot" ? { x: from.x, y: from.y } : null;
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
    // Brief goal celebration (~1.5s, pace-independent) before the kickoff prompt
    // + 3-2-1 countdown takes over.
    this.deadTimer = 90;
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

  // Post-goal: show the "restarting with a kickoff" prompt, set the teams up at
  // their kickoff spots, then start a visible 3-2-1 countdown. The countdown's GO
  // (in update()) calls kickoffKeepScore(team) to put the ball in play.
  private startKickoffCountdown(team: "us" | "them") {
    this.restart = null;
    this.pendingKickoffTeam = team;
    // Stand everyone in their kickoff shape now so the countdown plays over a set
    // pitch. positionKickoff places players without putting the ball live.
    this.positionKickoff(team);
    this.emitPill("Restarting with a kickoff", team);
    this.emitCoach(
      team === "us"
        ? "Restarting with a kickoff — get ready, here we go."
        : "Reds restart with a kickoff — stay switched on."
    );
    this.gstate = "dead";
    this.emit({ type: "stateChange", state: "dead" });
    // Kick off the 3-2-1 overlay (same mechanism as the opening whistle).
    this.countdownPhase = "3";
    this.countdownTimer = 60;
    this.emit({ type: "countdown", value: "3" });
  }

  private kickoffKeepScore(team: "us" | "them") {
    this.positionKickoff(team);
    this.setRestart({ type: "kickoff", team, x: W / 2, y: H / 2 });
  }

  // Position both teams (and keepers) in their kickoff shape for `team` taking
  // the kick. Pulled out of kickoffKeepScore so the post-goal countdown can set
  // the pitch before play resumes.
  private positionKickoff(team: "us" | "them") {
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
