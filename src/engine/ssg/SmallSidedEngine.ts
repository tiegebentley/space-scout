// Small-sided games engine: rondos and possession games in a box.
//
// Runs at a fixed 60 steps/sec (driven by FrameDriver). World units are yards.
// AI uses the same smooth-steering model as the match engine: players
// accelerate, ease into spots and only re-judge their spot a few times a second
// (with a "clearly better" margin), so movement reads as purposeful.
import type { SsgBall, SsgConfig, SsgEvent, SsgPlayer, SsgSide, SsgStats } from "./types";

const HZ = 60;
const BODY = 0.75;           // player radius (yd)
const REACH = 1.25;          // control / tackle reach (yd)
const BUMPER_OUT = 1.3;      // bumpers stand this far outside the line
const OUT_MARGIN = 2.2;      // ball this far outside the box = out of play

type Diff = { press: number; tackle: number; intercept: number; read: number; anticipate: number };
const DIFF: Record<SsgConfig["difficulty"], Diff> = {
  // press yd/s · tackle chance/frame in contact · intercept chance (one go per pass)
  // read: frames between lane re-reads · anticipate: frames before reacting to a pass
  easy:   { press: 4.3, tackle: 0.018, intercept: 0.22, read: 22, anticipate: 16 },
  medium: { press: 5.0, tackle: 0.032, intercept: 0.36, read: 14, anticipate: 10 },
  hard:   { press: 5.6, tackle: 0.05,  intercept: 0.5,  read: 9,  anticipate: 6 },
  elite:  { press: 6.2, tackle: 0.075, intercept: 0.66, read: 6,  anticipate: 3 },
};

function clamp(v: number, a: number, b: number) { return v < a ? a : v > b ? b : v; }
function hyp(x: number, y: number) { return Math.hypot(x, y); }
function d2(a: { x: number; y: number }, b: { x: number; y: number }) { return Math.hypot(a.x - b.x, a.y - b.y); }
function segDist(px: number, py: number, ax: number, ay: number, bx: number, by: number) {
  const dx = bx - ax, dy = by - ay, L2 = dx * dx + dy * dy;
  const t = L2 ? clamp(((px - ax) * dx + (py - ay) * dy) / L2, 0, 1) : 0;
  return Math.hypot(px - (ax + dx * t), py - (ay + dy * t));
}
// Do segments AB and CD cross?
function crosses(ax: number, ay: number, bx: number, by: number, cx: number, cy: number, dx: number, dy: number) {
  const o = (px: number, py: number, qx: number, qy: number, rx: number, ry: number) => Math.sign((qx - px) * (ry - py) - (qy - py) * (rx - px));
  return o(ax, ay, bx, by, cx, cy) !== o(ax, ay, bx, by, dx, dy) && o(cx, cy, dx, dy, ax, ay) !== o(cx, cy, dx, dy, bx, by);
}

export const DEFAULT_SSG: SsgConfig = {
  name: "Rondo 4v1", mode: "rondo", boxW: 12, boxH: 12, teamA: 4, teamB: 1, neutrals: 0, bumpers: 0,
  perimeter: true, swapOnTurnover: true, passesForPoint: 10, touchLimit: 2, duration: 120,
  userTeam: "A", difficulty: "medium", speed: 1,
};

export class SmallSidedEngine {
  cfg: SsgConfig;
  players: SsgPlayer[] = [];
  ball!: SsgBall;
  user!: SsgPlayer;
  poss: "A" | "B" = "A";
  running = false;
  paused = false;
  over = false;
  countdown = 0;            // frames left in the 3-2-1
  timeLeft: number;         // ms
  dead = 0;                 // frames of dead ball after a turnover / out
  callFrames = 0;           // you tapped to call for the ball
  joyVec = { x: 0, y: 0, active: false };
  keys: Record<string, boolean> = {};
  stats: SsgStats = {
    points: { A: 0, B: 0 }, streak: 0, best: 0, passes: { A: 0, B: 0 }, attempts: { A: 0, B: 0 },
    splits: 0, wins: 0, userPasses: 0, userAttempts: 0, userLost: 0, userWon: 0,
  };
  private events: SsgEvent[] = [];
  private presser: SsgPlayer | null = null;
  private laneT = 0;
  private lanes = new Map<SsgPlayer, { x: number; y: number }>();
  private deadTaker: SsgPlayer | null = null;
  private deadWait = 0;
  private looseFrames = 0;
  private middleFrames = 0;   // how long YOU've been stuck in the middle (rondo)
  private rolled = new Set<SsgPlayer>(); // defenders who've had their go at this pass
  private slotCount = 0;

  constructor(cfg: SsgConfig) {
    this.cfg = { ...DEFAULT_SSG, ...cfg };
    this.timeLeft = this.cfg.duration * 1000;
    this.setup();
  }

  // ---------- geometry ----------
  get W() { return this.cfg.boxW; }
  get H() { return this.cfg.boxH; }
  get P() { return 2 * (this.W + this.H); }
  /** Point on the box outline at perimeter distance t (clockwise from top-left). */
  perimPoint(t: number) {
    const W = this.W, H = this.H, P = this.P;
    t = ((t % P) + P) % P;
    if (t < W) return { x: t, y: 0 };
    if (t < W + H) return { x: W, y: t - W };
    if (t < 2 * W + H) return { x: W - (t - W - H), y: H };
    return { x: 0, y: H - (t - 2 * W - H) };
  }
  /** Perimeter distance of the outline point nearest (x,y). */
  perimT(x: number, y: number) {
    const W = this.W, H = this.H;
    const c = [
      { t: clamp(x, 0, W), d: Math.abs(y) + (x < 0 ? -x : x > W ? x - W : 0) },
      { t: W + clamp(y, 0, H), d: Math.abs(x - W) + (y < 0 ? -y : y > H ? y - H : 0) },
      { t: W + H + (W - clamp(x, 0, W)), d: Math.abs(y - H) + (x < 0 ? -x : x > W ? x - W : 0) },
      { t: 2 * W + H + (H - clamp(y, 0, H)), d: Math.abs(x) + (y < 0 ? -y : y > H ? y - H : 0) },
    ];
    c.sort((a, b) => a.d - b.d);
    return c[0].t;
  }
  slotHomeT(slot: number) { return this.W / 2 + (slot * this.P) / Math.max(1, this.slotCount); }
  onPerimeter(p: SsgPlayer) { return this.cfg.mode === "rondo" && this.cfg.perimeter && p.side === "A" && p.slot !== undefined && !p.joining; }
  edgeLine(edge: number) {
    const W = this.W, H = this.H, o = BUMPER_OUT;
    if (edge === 0) return { ax: 1, ay: -o, bx: W - 1, by: -o };
    if (edge === 1) return { ax: W + o, ay: 1, bx: W + o, by: H - 1 };
    if (edge === 2) return { ax: 1, ay: H + o, bx: W - 1, by: H + o };
    return { ax: -o, ay: 1, bx: -o, by: H - 1 };
  }

  // ---------- setup ----------
  private setup() {
    const c = this.cfg;
    const mk = (id: string, side: SsgSide, number: number, x: number, y: number, extra: Partial<SsgPlayer> = {}): SsgPlayer => ({
      id, side, number, bumper: false, isUser: false, x, y, vx: 0, vy: 0, face: 0,
      evalT: 0, hold: 0, holdLimit: 0, react: 0, immune: 0, cool: 0, ...extra,
    });
    this.players = [];
    const blueNums = [4, 8, 6, 10, 7, 11, 9, 3, 5];
    const redNums = [5, 2, 3, 6, 8, 4, 9, 11, 7];
    const rand = (a: number, b: number) => a + Math.random() * (b - a);

    // Blues
    const perim = c.mode === "rondo" && c.perimeter;
    this.slotCount = c.teamA;
    for (let i = 0; i < c.teamA; i++) {
      if (perim) {
        const pt = this.perimPoint(this.W / 2 + (i * this.P) / c.teamA);
        this.players.push(mk(`A${i}`, "A", blueNums[i % 9], pt.x, pt.y, { slot: i }));
      } else {
        this.players.push(mk(`A${i}`, "A", blueNums[i % 9], 0, 0));
      }
    }
    for (let i = 0; i < c.teamB; i++) this.players.push(mk(`B${i}`, "B", redNums[i % 9], 0, 0));
    for (let i = 0; i < c.neutrals; i++) this.players.push(mk(`N${i}`, "N", 12 + i, 0, 0));
    const edgeOrder: Array<0 | 1 | 2 | 3> = c.bumpers === 1 ? [0] : c.bumpers === 3 ? [0, 2, 3] : [0, 2, 3, 1];
    for (let i = 0; i < Math.min(4, c.bumpers); i++) {
      const edge = edgeOrder[i];
      const ln = this.edgeLine(edge);
      this.players.push(mk(`E${i}`, "N", 16 + i, (ln.ax + ln.bx) / 2, (ln.ay + ln.by) / 2, { bumper: true, edge }));
    }

    // Scatter the inside players on a jittered grid (Blues/Reds/neutrals interleaved).
    const inside = this.players.filter((p) => !p.bumper && p.slot === undefined);
    if (c.mode === "rondo") {
      // Defenders start in the middle of the circle.
      const reds = inside.filter((p) => p.side === "B");
      reds.forEach((p, i) => {
        const a = (i / Math.max(1, reds.length)) * Math.PI * 2;
        p.x = this.W / 2 + Math.cos(a) * (reds.length > 1 ? 1.6 : 0);
        p.y = this.H / 2 + Math.sin(a) * (reds.length > 1 ? 1.6 : 0);
      });
    }
    const toPlace = inside.filter((p) => !(c.mode === "rondo" && p.side === "B"));
    const n = toPlace.length;
    if (n) {
      const cols = Math.max(1, Math.round(Math.sqrt((n * this.W) / this.H)));
      const rows = Math.ceil(n / cols);
      // Alternate sides so teams start mixed, not in two clumps.
      const order = [...toPlace].sort((a, b) => (a.side === b.side ? 0 : a.side === "A" ? -1 : 1));
      const mixed: SsgPlayer[] = [];
      const qA = order.filter((p) => p.side === "A"), qB = order.filter((p) => p.side === "B"), qN = order.filter((p) => p.side === "N");
      while (qA.length || qB.length || qN.length) { if (qA.length) mixed.push(qA.shift()!); if (qB.length) mixed.push(qB.shift()!); if (qN.length) mixed.push(qN.shift()!); }
      mixed.forEach((p, i) => {
        const cx = i % cols, cy = Math.floor(i / cols);
        p.x = clamp(((cx + 0.5) / cols) * this.W + rand(-0.8, 0.8), 1.2, this.W - 1.2);
        p.y = clamp(((cy + 0.5) / rows) * this.H + rand(-0.8, 0.8), 1.2, this.H - 1.2);
      });
    }

    // You
    const mine = this.players.filter((p) => p.side === c.userTeam);
    this.user = mine[0] ?? this.players[0];
    this.user.isUser = true;

    // Ball to a Blue (prefer an AI so you watch the first pass… unless you're the only Blue).
    const starter = this.players.find((p) => p.side === "A" && !p.isUser) ?? this.players.find((p) => p.side === "A")!;
    this.poss = "A";
    this.ball = { x: starter.x, y: starter.y, vx: 0, vy: 0, owner: null, passing: false, target: null, passer: null, passFrames: 0, lastTouch: starter };
    this.giveBall(starter, true);
    for (const p of this.players) p.face = Math.atan2(this.H / 2 - p.y, this.W / 2 - p.x);
  }

  start() {
    this.running = true;
    this.countdown = 3 * HZ;
  }
  togglePause() { if (this.running && !this.over) this.paused = !this.paused; }
  flushEvents() { const e = this.events; this.events = []; return e; }
  private pill(text: string, tone: "good" | "bad" | "info") { this.events.push({ type: "pill", text, tone }); }

  // FrameDriver hooks
  interpEntities() { return [...this.players, this.ball]; }
  facingEntities() { return this.players; }

  // ---------- helpers ----------
  /** Players who play with the ball right now (possession side + neutrals/bumpers). */
  onBall(p: SsgPlayer) { return p.side === this.poss || p.side === "N"; }
  isOpp(p: SsgPlayer, side: "A" | "B") { return p.side !== "N" && p.side !== side; }
  private oppsOf(side: "A" | "B") { return this.players.filter((q) => this.isOpp(q, side)); }
  private sp(yps: number) { return (yps / HZ) * this.cfg.speed; }
  private get diff() { return DIFF[this.cfg.difficulty] ?? DIFF.medium; }
  /** Defending skill for a side: the difficulty setting is the OPPONENTS'
   *  level; your own AI teammates always defend at the normal level. */
  private diffFor(side: SsgSide): Diff {
    return side === this.cfg.userTeam ? DIFF.medium : this.diff;
  }
  private touchFrames() {
    const t = this.cfg.touchLimit;
    return t === 1 ? Math.round(1.0 * HZ) : t === 2 ? Math.round(2.0 * HZ) : 0;
  }
  /** Seconds-fraction left on your touch limit (1 → 0), or null when free play / not on the ball. */
  get userTouchLeft(): number | null {
    const lim = this.touchFrames();
    if (!lim || this.ball.owner !== this.user || this.dead > 0) return null;
    return clamp(1 - this.user.hold / (lim / this.cfg.speed), 0, 1);
  }
  get userHasBall() { return this.ball.owner === this.user; }
  get canPass() { return this.userHasBall && this.dead <= 0 && this.countdown <= 0; }

  private giveBall(p: SsgPlayer, quiet = false) {
    const b = this.ball;
    b.owner = p; b.passing = false; b.target = null; b.vx = 0; b.vy = 0;
    b.lastTouch = p;
    p.hold = 0;
    p.immune = Math.round(0.3 * HZ);
    // AI touch: settle, then decide within the touch limit.
    const lim = this.touchFrames();
    p.react = Math.round((0.22 + Math.random() * 0.18) * HZ);
    const think = Math.round((0.7 + Math.random() * 0.9) * HZ);
    p.holdLimit = lim ? Math.min(think, Math.round(lim * 0.8)) : think + Math.round(0.8 * HZ);
    if (p.side !== "N" && p.side !== this.poss) {
      this.poss = p.side;
      if (!quiet) this.events.push({ type: "stats" });
    }
  }

  // ---------- main loop ----------
  update(dt: number) {
    if (!this.running || this.paused || this.over) return;
    if (this.countdown > 0) { this.countdown--; return; }

    this.timeLeft -= dt;
    if (this.timeLeft <= 0) { this.timeLeft = 0; this.endGame(); return; }
    if (this.callFrames > 0) this.callFrames--;
    for (const p of this.players) { if (p.immune > 0) p.immune--; if (p.cool > 0) p.cool--; }

    this.rotateOutAfterTimeout();
    this.moveUser();
    this.moveAI();
    this.separate();
    this.constrainAll();

    if (this.dead > 0) { this.followOwner(); this.updateDead(); this.updateFacing(); return; }

    this.updateBall();
    this.updateFacing();
  }

  /** Rondo kindness rule: 30s in the middle and you rotate back out. */
  private rotateOutAfterTimeout() {
    const u = this.user;
    if (this.cfg.mode !== "rondo" || u.side !== "B" || this.cfg.userTeam !== "A") { this.middleFrames = 0; return; }
    if (++this.middleFrames < 30 * HZ || this.dead > 0 || this.ball.passing) return;
    const out = this.players.find((p) => p.side === "A" && !p.isUser && p !== this.ball.owner && !p.joining);
    if (!out) return;
    this.middleFrames = 0;
    const slot = out.slot;
    out.side = "B"; out.slot = undefined; out.spotX = undefined; out.cool = Math.round(1.6 * HZ);
    u.side = "A"; u.slot = slot; u.spotX = undefined; u.joining = this.cfg.perimeter;
    this.pill(`Time's up in the middle — #${out.number} swaps in`, "info");
    this.lanes.clear();
    this.events.push({ type: "stats" });
  }

  private endGame() {
    this.over = true;
    this.running = false;
    this.events.push({ type: "end" });
  }

  // ---------- user ----------
  private moveUser() {
    const u = this.user;
    let dx = 0, dy = 0;
    if (this.keys["arrowup"]) dy--;
    if (this.keys["arrowdown"]) dy++;
    if (this.keys["arrowleft"]) dx--;
    if (this.keys["arrowright"]) dx++;
    if (this.joyVec.active && (this.joyVec.x || this.joyVec.y)) { dx = this.joyVec.x; dy = this.joyVec.y; }
    const sp = this.sp(this.userHasBall ? 4.4 : 5.4);
    let wx = 0, wy = 0;
    const m = hyp(dx, dy);
    if (m > 0) { wx = (dx / m) * sp; wy = (dy / m) * sp; u.face = Math.atan2(dy, dx); }
    const k = m > 0 ? 0.3 : 0.4;
    u.vx += (wx - u.vx) * k; u.vy += (wy - u.vy) * k;
    if (u.joining && u.slot !== undefined) {
      // After winning it in the middle: auto-walk you out to your slot.
      const h = this.perimPoint(this.slotHomeT(u.slot));
      const dx2 = h.x - u.x, dy2 = h.y - u.y, dd = hyp(dx2, dy2);
      if (dd > 0.05) { u.vx = (dx2 / dd) * Math.min(dd, this.sp(4.6)); u.vy = (dy2 / dd) * Math.min(dd, this.sp(4.6)); u.face = Math.atan2(dy2, dx2); }
      u.x += u.vx; u.y += u.vy;
    } else if (this.onPerimeter(u)) {
      // Rondo: you play from the outside line — slide along it.
      const t = this.perimT(u.x + u.vx * 3, u.y + u.vy * 3);
      const pt = this.perimPoint(t);
      const step = d2(pt, u);
      const lim = hyp(u.vx, u.vy);
      if (step > 0) { u.x += ((pt.x - u.x) / step) * Math.min(step, lim); u.y += ((pt.y - u.y) / step) * Math.min(step, lim); }
    } else {
      u.x += u.vx; u.y += u.vy;
    }
    if (u === this.ball.owner && this.dead <= 0 && !u.joining) u.hold++;
    // Touch limit for you.
    const lim = this.touchFrames();
    if (lim && u === this.ball.owner && this.dead <= 0 && u.hold > lim / this.cfg.speed) {
      this.pill(this.cfg.touchLimit === 1 ? "One touch — move it quicker!" : "Too many touches!", "bad");
      this.turnover(u, null, "touches");
    }
  }

  /** Your pass. `target` from a tap; otherwise the teammate you're facing. */
  userPass(target?: SsgPlayer | null) {
    if (!this.canPass) return false;
    const u = this.user;
    const to = target && target !== u && this.onBall(target) ? target : this.aimTarget();
    if (!to) return false;
    this.strike(u, to);
    return true;
  }

  /** Who the Pass button would pick right now (drawn as an aim line). */
  aimTarget(): SsgPlayer | null {
    const u = this.user;
    if (!this.userHasBall) return null;
    const mates = this.players.filter((q) => q !== u && this.onBall(q));
    let best: SsgPlayer | null = null, bs = 1e9;
    const fx = Math.cos(u.face), fy = Math.sin(u.face);
    for (const q of mates) {
      const dx = q.x - u.x, dy = q.y - u.y, d = hyp(dx, dy);
      if (d < 0.5) continue;
      const cos = (dx * fx + dy * fy) / d;
      const ang = Math.acos(clamp(cos, -1, 1));
      if (ang > 1.0) continue;
      const s = ang * 6 + d * 0.06;
      if (s < bs) { bs = s; best = q; }
    }
    if (best) return best;
    return this.passOptions(u)[0]?.p ?? mates[0] ?? null;
  }

  /** Tap on the field: pass to a tapped teammate, or call for the ball. */
  tapAt(x: number, y: number) {
    if (this.userHasBall) {
      let best: SsgPlayer | null = null, bd = 2.6;
      for (const q of this.players) {
        if (q === this.user || !this.onBall(q)) continue;
        const d = Math.hypot(q.x - x, q.y - y);
        if (d < bd) { bd = d; best = q; }
      }
      if (best) return this.userPass(best);
      return false;
    }
    if (this.onBall(this.user)) { this.callFrames = Math.round(1.2 * HZ); this.pill("Calling for it!", "info"); }
    return false;
  }

  // ---------- AI ----------
  /** Ranked pass options for a carrier. */
  passOptions(c: SsgPlayer) {
    const side = c.side === "N" ? this.poss : c.side;
    const opps = this.oppsOf(side);
    const res: Array<{ p: SsgPlayer; s: number; split: boolean; lx: number; ly: number }> = [];
    const maxLen = Math.hypot(this.W, this.H) * 1.05;
    for (const r of this.players) {
      if (r === c || !this.onBall(r)) continue;
      const d = d2(c, r);
      if (d < 2.2 || d > maxLen) continue;
      const lx = r.x + r.vx * 10, ly = r.y + r.vy * 10;
      // Time-aware lane: how much room each defender has left once you count
      // how far they can travel (after reacting) while the ball is on its way.
      const vBall = clamp(11 + d * 0.4, 11, 18);
      let lane = 1e9, laneM = 1e9, open = 1e9;
      const ldx = lx - c.x, ldy = ly - c.y, L2 = ldx * ldx + ldy * ldy || 1;
      for (const o of opps) {
        const od = this.diffFor(o.side);
        const t = clamp(((o.x - c.x) * ldx + (o.y - c.y) * ldy) / L2, 0, 1);
        const sd = Math.hypot(o.x - (c.x + ldx * t), o.y - (c.y + ldy * t));
        const tc = (t * Math.sqrt(L2)) / vBall;
        const reach = REACH * 0.8 + od.press * Math.max(0, tc - od.anticipate / HZ) * 0.8;
        lane = Math.min(lane, sd);
        laneM = Math.min(laneM, sd - reach);
        const T = d / vBall;
        open = Math.min(open, d2(o, r) - od.press * T * 0.5);
      }
      const laneS = clamp((laneM + 0.4) / 2.2, 0, 1);
      const openS = clamp((open - 0.5) / 3.5, 0, 1);
      const distS = clamp(1 - Math.abs(d - 8) / 14, 0, 1);
      let split = false;
      for (let i = 0; i < opps.length; i++) for (let j = i + 1; j < opps.length; j++) {
        const a = opps[i], b = opps[j];
        if (d2(a, b) < 7 && crosses(c.x, c.y, lx, ly, a.x, a.y, b.x, b.y)) split = true;
      }
      let s = laneS * 0.5 + openS * 0.3 + distS * 0.2;
      if (lane < 0.9) s -= 0.4;
      if (split && lane > 1.3) s += 0.15;
      if (r.isUser) s += 0.1 + (this.callFrames > 0 ? 0.35 : 0);
      if (r.id === c.lastFrom) s -= 0.08;
      res.push({ p: r, s, split, lx, ly });
    }
    return res.sort((a, b) => b.s - a.s);
  }

  private steer(p: SsgPlayer, tx: number, ty: number, maxSp: number, resp = 1) {
    if (p.tgx === undefined || p.tgy === undefined || hyp(tx - p.tgx, ty - p.tgy) > 8) { p.tgx = tx; p.tgy = ty; }
    else { const k = Math.min(1, 0.18 * resp); p.tgx += (tx - p.tgx) * k; p.tgy += (ty - p.tgy) * k; }
    const dx = p.tgx - p.x, dy = p.tgy - p.y, d = hyp(dx, dy);
    let want = d < 0.05 ? 0 : maxSp * Math.min(1, d / 1.6);
    if (resp <= 1.1) {
      if (p.settled) { if (d > 0.9) p.settled = false; }
      else if (d < 0.2 && hyp(p.vx, p.vy) < maxSp * 0.2) p.settled = true;
      if (p.settled) want = 0;
    } else p.settled = false;
    const wx = d > 0 ? (dx / d) * want : 0, wy = d > 0 ? (dy / d) * want : 0;
    const ax = wx - p.vx, ay = wy - p.vy, al = hyp(ax, ay);
    const acc = maxSp * 0.1 * resp;
    if (al > acc) { p.vx += (ax / al) * acc; p.vy += (ay / al) * acc; } else { p.vx = wx; p.vy = wy; }
    if (this.onPerimeter(p)) {
      // Slide along the outside line.
      const pt = this.perimPoint(this.perimT(p.x + p.vx, p.y + p.vy));
      const st = d2(pt, p), lim = hyp(p.vx, p.vy) + 0.001;
      if (st > 0) { p.x += ((pt.x - p.x) / st) * Math.min(st, lim); p.y += ((pt.y - p.y) / st) * Math.min(st, lim); }
    } else { p.x += p.vx; p.y += p.vy; }
  }

  private moveAI() {
    const b = this.ball;
    const carrier = b.owner;
    // Lane assignments for defenders are re-read on a cadence (difficulty).
    if (--this.laneT <= 0) { this.laneT = this.diffFor(this.poss === "A" ? "B" : "A").read; this.assignDefence(); }

    for (const p of this.players) {
      if (p.isUser) continue;
      if (p === carrier) { this.aiCarrier(p); continue; }
      // Intended receiver attacks the ball.
      if (b.passing && b.target === p) {
        this.steer(p, b.x + b.vx * 8, b.y + b.vy * 8, this.sp(5.2), 2.4);
        continue;
      }
      // Loose ball: nearest one or two players of each side go for it.
      if (!b.owner && !b.passing && this.dead <= 0 && this.isChaser(p)) {
        // An outside rondo player may step in to collect, then walks back out.
        if (this.onPerimeter(p) && d2(this.perimPoint(this.perimT(b.x, b.y)), b) > 0.6) p.joining = true;
        this.steer(p, b.x, b.y, this.sp(5.6), 2.4);
        continue;
      }
      if (this.dead > 0 && p === this.deadTaker && b.deadX !== undefined) {
        this.steer(p, b.deadX, b.deadY!, this.sp(5.2), 2);
        continue;
      }
      if (p.side !== "N" && p.side !== this.poss) this.aiDefend(p);
      else this.aiSupport(p);
    }
  }

  private isChaser(p: SsgPlayer) {
    const b = this.ball;
    if (p.bumper) {
      // A bumper collects a loose ball that's run out over THEIR line.
      const e = p.edge;
      return (e === 0 && b.y < 0) || (e === 1 && b.x > this.W) || (e === 2 && b.y > this.H) || (e === 3 && b.x < 0);
    }
    const same = this.players.filter((q) => !q.bumper && (p.side === "N" ? q.side === "N" : q.side === p.side));
    same.sort((a, c) => d2(a, b) - d2(c, b));
    return same.indexOf(p) < (p.side === "N" ? 1 : 2);
  }

  private aiCarrier(p: SsgPlayer) {
    if (this.dead <= 0 && !p.joining) p.hold++;
    const side = p.side === "N" ? this.poss : p.side;
    const opps = this.oppsOf(side);
    let near: SsgPlayer | null = null, nd = 1e9;
    for (const o of opps) { const d = d2(o, p); if (d < nd) { nd = d; near = o; } }
    if (this.dead > 0 || p.joining) {
      if (p.joining && p.slot !== undefined) { const h = this.perimPoint(this.slotHomeT(p.slot)); this.steer(p, h.x, h.y, this.sp(4.2), 1.6); if (this.dead > 0) return; }
      else if (this.dead > 0) { this.steer(p, p.x, p.y, this.sp(3), 1.5); return; }
    }

    if (p.hold > p.react) {
      const opts = this.passOptions(p);
      const best = opts[0];
      const mustGo = p.hold >= p.holdLimit;
      const pressed = nd < 2.4;
      if (best && (best.s > 0.62 || (pressed && best.s > 0.3) || mustGo || (p.bumper && p.hold > p.react + 10))) {
        // Real players don't always find the best ball — especially when pressed.
        const alt = opts[1];
        const pick = alt && alt.s > 0.25 && Math.random() < (pressed ? 0.25 : 0.1) ? alt : best;
        this.strike(p, pick.p, pick.lx, pick.ly);
        return;
      }
      // Never stall: well past the hold limit with no "good" option, play
      // the nearest teammate anyway.
      if (p.hold > p.holdLimit + 45) {
        const any = this.players.filter((q) => q !== p && this.onBall(q)).sort((a, c) => d2(a, p) - d2(c, p))[0];
        if (any) { this.strike(p, any); return; }
      }
    }
    // Hold / shield: drift away from pressure, toward the middle of our space.
    let tx = p.x, ty = p.y;
    if (near && nd < 5) {
      const ax = p.x - near.x, ay = p.y - near.y, al = hyp(ax, ay) || 1;
      tx = p.x + (ax / al) * 2.5; ty = p.y + (ay / al) * 2.5;
    }
    if (p.bumper && p.edge !== undefined) {
      const ln = this.edgeLine(p.edge);
      const t = clamp(((tx - ln.ax) * (ln.bx - ln.ax) + (ty - ln.ay) * (ln.by - ln.ay)) / (hyp(ln.bx - ln.ax, ln.by - ln.ay) ** 2 || 1), 0, 1);
      tx = ln.ax + (ln.bx - ln.ax) * t; ty = ln.ay + (ln.by - ln.ay) * t;
    }
    this.steer(p, tx, ty, this.sp(3.4), 1.3);
  }

  /** Where an off-ball player on the ball side should be: an open passing angle. */
  private aiSupport(p: SsgPlayer) {
    const b = this.ball;
    if (p.joining && p.slot !== undefined) {
      const h = this.perimPoint(this.slotHomeT(p.slot));
      this.steer(p, h.x, h.y, this.sp(4.6), 1.6);
      return;
    }
    const ref = b.owner ?? (b.passing && b.target ? { x: b.target.x, y: b.target.y } : { x: b.x, y: b.y });
    const side = this.poss;
    const opps = this.oppsOf(side);
    if (--p.evalT <= 0 || p.spotX === undefined) {
      p.evalT = 10 + Math.floor(Math.random() * 6);
      const cands: Array<{ x: number; y: number }> = [];
      if (this.onPerimeter(p)) {
        const home = this.slotHomeT(p.slot!);
        const range = (this.P / Math.max(1, this.slotCount)) * 0.3;
        for (let i = -4; i <= 4; i++) cands.push(this.perimPoint(home + (i / 4) * range));
      } else if (p.bumper && p.edge !== undefined) {
        const ln = this.edgeLine(p.edge);
        for (let i = 0; i <= 8; i++) cands.push({ x: ln.ax + ((ln.bx - ln.ax) * i) / 8, y: ln.ay + ((ln.by - ln.ay) * i) / 8 });
      } else {
        const nx = 6, ny = 6;
        for (let i = 0; i < nx; i++) for (let j = 0; j < ny; j++) {
          cands.push({ x: 1.2 + ((this.W - 2.4) * (i + 0.5)) / nx, y: 1.2 + ((this.H - 2.4) * (j + 0.5)) / ny });
        }
      }
      if (p.spotX !== undefined) cands.push({ x: p.spotX, y: p.spotY! });
      const mates = this.players.filter((q) => q !== p && this.onBall(q));
      const diag = Math.hypot(this.W, this.H);
      let best = cands[0], bs = -1e9;
      for (const c of cands) {
        let lane = 1e9, open = 1e9, space = 1e9;
        for (const o of opps) { lane = Math.min(lane, segDist(o.x, o.y, ref.x, ref.y, c.x, c.y)); open = Math.min(open, d2(o, c)); }
        for (const m of mates) if (m !== b.owner) space = Math.min(space, d2(m, c));
        const dRef = d2(ref, c);
        let s = clamp((lane - 0.8) / 2.5, 0, 1) * 0.45
          + clamp((open - 1) / 5, 0, 1) * 0.25
          + clamp((space - 2) / 5, 0, 1) * 0.2
          + clamp(1 - Math.abs(dRef - 7) / 9, 0, 1) * 0.15
          - (d2(p, c) / diag) * 0.3;
        if (dRef < 2) s -= 0.5;
        // Outside players keep their side of the box (no camping in corners).
        if (this.onPerimeter(p)) s -= (Math.abs(this.perimT(c.x, c.y) - this.perimT(...Object.values(this.perimPoint(this.slotHomeT(p.slot!))) as [number, number])) / this.P) * 0.6;
        if (p.spotX !== undefined && c.x === p.spotX && c.y === p.spotY) s += 0.07; // stickiness
        if (s > bs) { bs = s; best = c; }
      }
      p.spotX = best.x; p.spotY = best.y;
    }
    this.steer(p, p.spotX!, p.spotY!, this.sp(p.bumper ? 3.6 : 4.4), 1);
  }

  /** Earliest point on the travelling ball's path this player can reach in time. */
  private interceptPoint(p: SsgPlayer, sp: number): { x: number; y: number } | null {
    const b = this.ball;
    let x = b.x, y = b.y, vx = b.vx, vy = b.vy;
    for (let t = 1; t <= 70; t++) {
      x += vx; y += vy; vx *= 0.995; vy *= 0.995;
      if (t % 2) continue;
      const need = Math.hypot(x - p.x, y - p.y) - REACH * 0.8;
      if (need <= sp * t) return { x, y };
      if (b.target && Math.hypot(x - b.target.x, y - b.target.y) < REACH) return null; // reaches the receiver first
    }
    return null;
  }

  /** Decide the presser and which passing lanes the other defenders cut. */
  private assignDefence() {
    this.lanes.clear();
    const b = this.ball;
    const defSide: "A" | "B" = this.poss === "A" ? "B" : "A";
    const defs = this.players.filter((p) => p.side === defSide);
    const ai = defs.filter((p) => !p.isUser);
    if (!defs.length) { this.presser = null; return; }
    const bp = b.owner ?? b;
    // Sticky presser (counting you if you defend — the AI won't double up on your job).
    const sorted = [...defs].sort((a, c) => d2(a, bp) - d2(c, bp));
    let pr = sorted[0];
    if (this.presser && defs.includes(this.presser) && d2(this.presser, bp) < d2(pr, bp) + 1.5) pr = this.presser;
    this.presser = pr;
    const carrier = b.owner;
    if (!carrier) return;
    const opts = this.passOptions(carrier).slice(0, 4);
    const free = ai.filter((p) => p !== pr);
    // Greedy: each remaining defender cuts the most dangerous lane they're nearest to.
    const used = new Set<SsgPlayer>();
    for (const o of opts) {
      if (!free.length) break;
      free.sort((a, c) => segDist(a.x, a.y, carrier.x, carrier.y, o.lx, o.ly) - segDist(c.x, c.y, carrier.x, carrier.y, o.lx, o.ly));
      const d = free.shift()!;
      used.add(o.p);
      const f = d2(carrier, o.p) > 9 ? 0.55 : 0.45;
      this.lanes.set(d, { x: carrier.x + (o.lx - carrier.x) * f, y: carrier.y + (o.ly - carrier.y) * f });
    }
  }

  private aiDefend(p: SsgPlayer) {
    const b = this.ball;
    const df = this.diffFor(p.side);
    const press = this.sp(df.press);
    // Read the pass: once a ball is struck (after a reaction delay), any
    // defender who can get to its path before it passes goes for it.
    if (b.passing && b.passFrames >= df.anticipate) {
      const cut = this.interceptPoint(p, press);
      if (cut) { this.steer(p, cut.x, cut.y, press, 2.6); return; }
    }
    if (p === this.presser) {
      const c = b.owner;
      if (c) {
        // Press, shading the carrier's best pass (cover shadow) and closing in.
        const best = this.passOptions(c)[0];
        let tx = c.x, ty = c.y;
        if (best) {
          const dx = best.lx - c.x, dy = best.ly - c.y, dl = hyp(dx, dy) || 1;
          const sh = d2(p, c) > 2.5 ? 1.2 : 0.5;
          tx += (dx / dl) * sh; ty += (dy / dl) * sh;
        }
        this.steer(p, tx, ty, press, 2.2);
      } else {
        const tx = b.passing ? b.x + b.vx * 12 : b.x, ty = b.passing ? b.y + b.vy * 12 : b.y;
        this.steer(p, tx, ty, press, 2.2);
      }
      return;
    }
    const lane = this.lanes.get(p);
    if (lane) { this.steer(p, lane.x, lane.y, press * 0.9, 1.6); return; }
    // Fallback: compact toward the ball, between it and the middle.
    const bp = b.owner ?? b;
    this.steer(p, (bp.x * 0.6 + (this.W / 2) * 0.4), (bp.y * 0.6 + (this.H / 2) * 0.4), press * 0.8, 1.2);
  }

  // ---------- ball ----------
  private strike(from: SsgPlayer, to: SsgPlayer, lx?: number, ly?: number) {
    const b = this.ball;
    const tx = lx ?? to.x + to.vx * 10, ty = ly ?? to.y + to.vy * 10;
    const d = Math.hypot(tx - b.x, ty - b.y) || 1;
    const v = this.sp(clamp(11 + d * 0.4, 11, 18));
    // Placement error: rushed / pressured passes are less accurate.
    const pressure = Math.min(...this.oppsOf(from.side === "N" ? this.poss : from.side).map((o) => d2(o, from)), 99);
    // Placement error grows with distance and pressure (yours is tighter).
    const err = (from.isUser ? 0.4 : 1) * (0.02 + d * 0.0025 + (pressure < 2.2 ? 0.045 : 0)) * (0.4 + Math.random());
    const ang = Math.atan2(ty - b.y, tx - b.x) + (Math.random() < 0.5 ? -1 : 1) * err;
    const weight = 1 + (Math.random() - 0.5) * (from.isUser ? 0.08 : 0.2);
    b.vx = Math.cos(ang) * v * weight; b.vy = Math.sin(ang) * v * weight;
    b.owner = null; b.passing = true; b.target = to; b.passer = from; b.passFrames = 0; b.lastTouch = from;
    this.rolled.clear();
    const side = from.side === "N" ? this.poss : from.side;
    this.stats.attempts[side]++;
    if (from.isUser) this.stats.userAttempts++;
    from.cool = Math.round(0.25 * HZ);
  }

  private followOwner() {
    const b = this.ball, o = b.owner;
    if (!o) return;
    const fx = o.x + Math.cos(o.face) * 0.9, fy = o.y + Math.sin(o.face) * 0.9;
    b.x += (fx - b.x) * 0.5; b.y += (fy - b.y) * 0.5;
  }

  private updateBall() {
    const b = this.ball;
    if (b.owner) {
      this.followOwner();
      this.checkTackles();
      return;
    }
    b.passFrames++;
    b.x += b.vx; b.y += b.vy;
    // Friction: a pass holds its pace, a loose ball rolls to a stop.
    const f = b.passing && b.passFrames < 45 ? 0.995 : 0.965;
    b.vx *= f; b.vy *= f;
    if (b.passing && hyp(b.vx, b.vy) < this.sp(4)) b.passing = false;

    // Watchdog: a ball nobody can get to for 4s is treated as out.
    this.looseFrames = b.passing ? 0 : this.looseFrames + 1;
    if (this.isOut() || this.looseFrames > 4 * HZ) { this.looseFrames = 0; this.ballOut(); return; }

    // Who touches it? Closest player within reach decides.
    const passSide = b.passer ? (b.passer.side === "N" ? this.poss : b.passer.side) : this.poss;
    let hit: SsgPlayer | null = null, hd = 1e9;
    for (const p of this.players) {
      if (p === b.passer && b.passFrames < 12) continue;
      if (p.cool > 0) continue;
      const d = d2(p, b);
      if (d >= REACH) continue;
      // A defender gets ONE go at a passing ball (a stretched leg either gets
      // there or it doesn't); the ball hitting their body is always a block.
      if (b.passing && this.isOpp(p, passSide)) {
        const body = d < BODY + 0.15;
        if (!body) {
          if (this.rolled.has(p)) continue;
          this.rolled.add(p);
          const closeness = clamp((REACH - d) / (REACH - BODY), 0, 1);
          const base = p.isUser ? 0.6 : this.diffFor(p.side).intercept;
          if (Math.random() > base * (0.45 + 0.55 * closeness)) continue;
        }
        this.turnover(b.passer, p, "intercept");
        return;
      }
      if (d < hd) { hd = d; hit = p; }
    }
    if (!hit) return;
    if (hit.side === "N" || hit.side === passSide || !b.passing) {
      if (!b.passing && this.isOpp(hit, this.poss)) { this.turnover(b.lastTouch, hit, "loose"); return; }
      this.completePass(hit);
    }
  }

  private completePass(r: SsgPlayer) {
    const b = this.ball;
    const passer = b.passer;
    const wasPass = !!passer && passer !== r && b.passFrames < 4 * HZ;
    const side = passer ? (passer.side === "N" ? this.poss : passer.side) : this.poss;
    let split = false;
    if (wasPass && passer) {
      const opps = this.oppsOf(side);
      for (let i = 0; i < opps.length; i++) for (let j = i + 1; j < opps.length; j++) {
        const a = opps[i], c = opps[j];
        if (d2(a, c) < 7 && crosses(passer.x, passer.y, r.x, r.y, a.x, a.y, c.x, c.y)) split = true;
      }
    }
    r.lastFrom = passer?.id;
    // First touch: a fast ball under pressure can get away from you.
    const side2 = r.side === "N" ? this.poss : r.side;
    const press = Math.min(...this.oppsOf(side2).map((o) => d2(o, r)), 99);
    const pace = hyp(b.vx, b.vy) * HZ / this.cfg.speed;
    const heavy = r.bumper ? 0 : (r.isUser ? 0.4 : 1) * (0.025 + (press < 2.4 ? 0.09 : press < 4 ? 0.03 : 0) + (pace > 15 ? 0.04 : 0));
    if (wasPass && Math.random() < heavy) {
      const a = Math.atan2(b.vy, b.vx) + (Math.random() - 0.5) * 1.6;
      const v = this.sp(3.2 + Math.random() * 2.2);
      b.passing = false; b.target = null; b.owner = null;
      b.vx = Math.cos(a) * v; b.vy = Math.sin(a) * v;
      b.lastTouch = r; b.passer = r; b.passFrames = 99;
      r.cool = 8;
      if (r.isUser) this.pill("Heavy touch!", "bad");
      return;
    }
    this.giveBall(r);
    if (!wasPass || !passer) return;
    const st = this.stats;
    st.passes[side]++;
    if (passer.isUser) st.userPasses++;
    st.streak += split ? 2 : 1;
    if (split) { st.splits++; this.pill("Split pass! +2", "good"); }
    st.best = Math.max(st.best, st.streak);
    const n = this.cfg.passesForPoint;
    const before = Math.floor((st.streak - (split ? 2 : 1)) / n), after = Math.floor(st.streak / n);
    if (after > before) {
      st.points[side]++;
      const yours = side === this.cfg.userTeam;
      this.pill(`${n} passes — point ${side === "A" ? "Blues" : "Reds"}!`, yours ? "good" : "bad");
    }
    this.events.push({ type: "stats" });
  }

  private checkTackles() {
    const b = this.ball, c = b.owner!;
    if (c.immune > 0 || c.bumper) return;
    const side = c.side === "N" ? this.poss : c.side;
    for (const d of this.oppsOf(side)) {
      if (d.cool > 0) continue;
      const dist = d2(d, c);
      if (dist > REACH) continue;
      let p = d.isUser ? 0.12 : this.diffFor(d.side).tackle;
      // Shielding: a carrier moving away from the defender is harder to rob.
      const mv = hyp(c.vx, c.vy);
      if (mv > 0.01) {
        const away = ((c.x - d.x) * c.vx + (c.y - d.y) * c.vy) / (dist * mv || 1);
        if (away > 0.4) p *= 0.5;
      }
      if (Math.random() < p) { this.turnover(c, d, "tackle"); return; }
    }
  }

  private isOut() {
    const b = this.ball;
    // Past a line with a bumper on it the ball can still be played (the bumper
    // stands outside); past a bare line it's out once it's clearly over.
    const has = (e: number) => this.players.some((p) => p.bumper && p.edge === e);
    const m = (e: number) => (has(e) ? OUT_MARGIN : 0.9);
    return b.y < -m(0) || b.x > this.W + m(1) || b.y > this.H + m(2) || b.x < -m(3);
  }

  private ballOut() {
    const b = this.ball;
    const last = b.lastTouch;
    const lastSide: "A" | "B" = last ? (last.side === "N" ? this.poss : last.side) : this.poss;
    this.pill("Out of the box!", last && (last.isUser) ? "bad" : "info");
    if (this.cfg.mode === "rondo") { this.turnover(last, null, "out"); return; }
    // Possession game: the other team kicks it back in from the spot.
    const other: "A" | "B" = lastSide === "A" ? "B" : "A";
    const sx = clamp(b.x, 0.3, this.W - 0.3), sy = clamp(b.y, 0.3, this.H - 0.3);
    this.resetStreak();
    this.stats.wins++;
    if (last?.isUser) this.stats.userLost++;
    this.poss = other;
    this.setDead(this.pickTaker(other, sx, sy), sx, sy);
  }

  private setDead(taker: SsgPlayer | null, x: number, y: number) {
    const b = this.ball;
    b.owner = null; b.passing = false; b.target = null; b.vx = 0; b.vy = 0;
    b.x = x; b.y = y; b.deadX = x; b.deadY = y;
    this.deadTaker = taker;
    this.dead = Math.round(0.9 * HZ);
    this.deadWait = 0;
    this.lanes.clear();
    this.events.push({ type: "stats" });
  }

  private updateDead() {
    const b = this.ball;
    this.dead--;
    if (this.dead > 0) return;
    const t = this.deadTaker;
    if (!t) { this.dead = 0; return; }
    if (d2(t, b) > 1.4 && this.deadWait < 3 * HZ && !t.isUser) { this.deadWait++; this.dead = 1; return; }
    if (d2(t, b) > 1.4) { if (t.isUser) { b.x = t.x; b.y = t.y; } else { t.x = b.x; t.y = b.y; } }
    b.deadX = undefined; b.deadY = undefined;
    this.deadTaker = null;
    this.giveBall(t);
    t.immune = Math.round(0.8 * HZ); // a free touch on the restart
  }

  private resetStreak() { this.stats.streak = 0; }

  /** Possession lost. `loser` = last Blue/Red on it, `winner` = who won it (null = out/touches). */
  private turnover(loser: SsgPlayer | null, winner: SsgPlayer | null, why: "tackle" | "intercept" | "loose" | "out" | "touches") {
    const b = this.ball;
    const st = this.stats;
    this.resetStreak();
    st.wins++;
    if (loser?.isUser) st.userLost++;
    if (winner?.isUser) { st.userWon++; this.pill(why === "intercept" ? "Intercepted!" : "Ball won!", "good"); }
    else if (winner && why === "intercept") this.pill("Intercepted", winner.side === this.cfg.userTeam ? "good" : "bad");
    else if (winner && why === "tackle") this.pill("Tackled", winner.side === this.cfg.userTeam ? "good" : "bad");
    if (loser) loser.cool = Math.round(0.6 * HZ);

    if (this.cfg.mode === "rondo") {
      // The middle won it (or it was lost). Swap the loser in, or reset to the outside.
      const bLoser = loser && loser.side === "A" ? loser : (b.passer && b.passer.side === "A" ? b.passer : null);
      const red = winner && winner.side === "B" ? winner : this.nearest(this.players.filter((p) => p.side === "B"), b);
      if (this.cfg.swapOnTurnover && bLoser && red) {
        const slot = bLoser.slot;
        bLoser.side = "B"; bLoser.slot = undefined; bLoser.spotX = undefined; bLoser.joining = false;
        bLoser.cool = Math.round(1.6 * HZ); // into the middle first — no instant re-tackle
        red.side = "A"; red.slot = slot; red.spotX = undefined; red.joining = this.cfg.perimeter;
        if (bLoser.isUser) this.pill("You lost it — your turn in the middle!", "bad");
        else if (red.isUser) this.pill("You won it — back on the outside!", "good");
        else this.pill(`Swap! #${bLoser.number} goes in the middle`, "info");
        this.poss = "A";
        // Restart cleanly: the new outside player walks out to the vacated slot
        // (no teleport), the new defender jogs into the middle, and play
        // restarts from the outside player furthest from the defenders.
        this.lanes.clear();
        const reds = this.players.filter((q) => q.side === "B");
        const outs = this.players.filter((q) => q.side === "A" && q !== red && !q.joining);
        const far = (q: SsgPlayer) => Math.min(...reds.map((r2) => d2(r2, q)), 99);
        outs.sort((a, c) => far(c) - far(a));
        const taker = outs.find((q) => !q.isUser) ?? outs[0] ?? red;
        this.setDead(taker, taker.x, taker.y);
        this.dead = Math.round(1.3 * HZ);
      } else {
        // No swap: ball back to an outside player.
        const outs = this.players.filter((p) => p.side === "A");
        const to = outs.sort((a, c) => d2(c, this.centre) - d2(a, this.centre))[0];
        this.poss = "A";
        if (to) this.setDead(to, to.x, to.y);
      }
      return;
    }

    // Possession game: winner's team has it now.
    if (winner && winner.side !== "N") { this.giveBall(winner, true); this.poss = winner.side; }
    else {
      const other: "A" | "B" = this.poss === "A" ? "B" : "A";
      this.poss = other;
      const sx = clamp(b.x, 0.3, this.W - 0.3), sy = clamp(b.y, 0.3, this.H - 0.3);
      this.setDead(this.pickTaker(other, sx, sy), sx, sy);
    }
    this.events.push({ type: "stats" });
  }

  /** Who restarts for `side` at (x,y): the nearest AI — or you, if you're right there. */
  private pickTaker(side: "A" | "B", x: number, y: number): SsgPlayer | null {
    const cands = this.players.filter((p) => p.side === side && !p.bumper);
    cands.sort((a, c) => Math.hypot(a.x - x, a.y - y) - Math.hypot(c.x - x, c.y - y));
    const u = cands.find((p) => p.isUser);
    if (u && Math.hypot(u.x - x, u.y - y) < 2) return u;
    return cands.find((p) => !p.isUser) ?? cands[0] ?? null;
  }

  private get centre() { return { x: this.W / 2, y: this.H / 2 }; }
  private nearest(arr: SsgPlayer[], pt: { x: number; y: number }) {
    let best: SsgPlayer | null = null, bd = 1e9;
    for (const p of arr) { const d = d2(p, pt); if (d < bd) { bd = d; best = p; } }
    return best;
  }

  // ---------- spacing / bounds / facing ----------
  private separate() {
    const ps = this.players;
    for (let i = 0; i < ps.length; i++) for (let j = i + 1; j < ps.length; j++) {
      const a = ps[i], c = ps[j];
      const min = a.side === c.side ? 1.5 : 1.0;
      const dx = c.x - a.x, dy = c.y - a.y, d = hyp(dx, dy);
      if (d >= min || d === 0) continue;
      const push = Math.min((min - d) * 0.5, 0.05);
      const ux = dx / d, uy = dy / d;
      if (!a.isUser && !this.onPerimeter(a) && !a.bumper) { a.x -= ux * push; a.y -= uy * push; }
      if (!c.isUser && !this.onPerimeter(c) && !c.bumper) { c.x += ux * push; c.y += uy * push; }
    }
  }

  private constrainAll() {
    for (const p of this.players) {
      if (p.bumper && p.edge !== undefined) {
        const ln = this.edgeLine(p.edge);
        if (p.edge === 0 || p.edge === 2) { p.y = ln.ay; p.x = clamp(p.x, ln.ax, ln.bx); }
        else { p.x = ln.ax; p.y = clamp(p.y, ln.ay, ln.by); }
        continue;
      }
      if (this.onPerimeter(p)) {
        const pt = this.perimPoint(this.perimT(p.x, p.y));
        p.x = pt.x; p.y = pt.y;
        continue;
      }
      if (p.joining) {
        const pt = this.perimPoint(this.perimT(p.x, p.y));
        if (d2(pt, p) < 0.7) { p.joining = false; p.x = pt.x; p.y = pt.y; p.spotX = undefined; continue; }
      }
      const m = 0.25;
      const nx = clamp(p.x, m, this.W - m), ny = clamp(p.y, m, this.H - m);
      if (nx !== p.x) p.vx = 0;
      if (ny !== p.y) p.vy = 0;
      p.x = nx; p.y = ny;
    }
  }

  private updateFacing() {
    const b = this.ball;
    for (const p of this.players) {
      if (p.isUser && (this.joyVec.active || Object.values(this.keys).some(Boolean))) continue;
      const sp = hyp(p.vx, p.vy);
      const want = sp > this.sp(0.6) && p !== b.owner
        ? Math.atan2(p.vy, p.vx)
        : p === b.owner
          ? (sp > this.sp(0.6) ? Math.atan2(p.vy, p.vx) : p.face)
          : Math.atan2(b.y - p.y, b.x - p.x);
      const dA = Math.atan2(Math.sin(want - p.face), Math.cos(want - p.face));
      p.face += clamp(dA, -0.18, 0.18);
    }
  }
}
