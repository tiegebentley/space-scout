import type { RoleConfig } from "@/types/game";

// Canvas size — 72:52 ratio (~1.38:1), scaled up to fill the page
export const W = 900;
export const H = 650;
export const MARGIN = 18;
export const L = MARGIN;
export const R = W - MARGIN;
export const TOP = MARGIN;
export const BOT = H - MARGIN;
export const GOAL_W = 120;
export const GX0 = W / 2 - GOAL_W / 2;
export const GX1 = W / 2 + GOAL_W / 2;
export const ATT_THIRD = H * 0.36;
export const CONTACT = 22;

// When a player loses the ball to the other team (tackle, interception, or a
// loose ball picked up by the opposition) they must pause before they can
// engage again. ~2 seconds at 60fps (frozenTimer ticks once per frame).
export const TURNOVER_FREEZE = 120;

// Penalty box geometry — MUST match the box drawn in renderer (boxW/boxH).
// Shots are only allowed from inside this area.
export const BOX_W = 260;          // box width (px), centered on goal
export const BOX_H = 70;           // box depth (px) out from the goal line
export const BOX_HALF_W = BOX_W / 2;

export interface RoleBounds {
  fyMin: number; // closest to own goal (0 = own goal line)
  fyMax: number; // furthest forward (1 = opp goal line)
}

export const ROLE_BOUNDS: Record<string, RoleBounds> = {
  fwd:  { fyMin: 0.35, fyMax: 1.00 },
  wide: { fyMin: 0.15, fyMax: 0.92 },
  mid:  { fyMin: 0.18, fyMax: 0.78 },
  hold: { fyMin: 0.08, fyMax: 0.52 },
  gk:   { fyMin: 0.00, fyMax: 0.10 },
};

// ── WINGER WIDTH BOUNDS ──
// Controls how far inside wingers are allowed to drift.
// Values are 0-1 fractions across the pitch from the team's perspective:
//   0.0 = left touchline, 1.0 = right touchline
// Left winger (lw): clamped to [LW_MIN, LW_MAX]
// Right winger (rw): clamped to [RW_MIN, RW_MAX]
// Tighten the max/min to keep them hugging the sideline.
// Widen toward 0.5 to let them drift inside more.
export const WINGER_X_BOUNDS = {
  lw: { min: 0.04, max: 0.25 },  // left winger: stays on the left quarter
  rw: { min: 0.75, max: 0.96 },  // right winger: stays on the right quarter
};

// Formations define ALL outfield positions. The user picks which one to control.
// Default user role per format is the first key.
export const FORMATIONS: Record<string, Record<string, RoleConfig>> = {
  "5v5": {
    hold: { fx: 0.50, fy: 0.28, role: "hold" },
    lw:   { fx: 0.88, fy: 0.42, role: "wide" },
    rw:   { fx: 0.12, fy: 0.42, role: "wide" },
    fwd:  { fx: 0.50, fy: 0.55, role: "fwd" },
  },
  "3v3": {
    lw:   { fx: 0.85, fy: 0.42, role: "wide" },
    rw:   { fx: 0.15, fy: 0.42, role: "wide" },
  },
  "7v7": {
    hold: { fx: 0.50, fy: 0.26, role: "hold" },
    lw:   { fx: 0.92, fy: 0.42, role: "wide" },
    rw:   { fx: 0.08, fy: 0.42, role: "wide" },
    lcm:  { fx: 0.35, fy: 0.36, role: "mid" },
    rcm:  { fx: 0.65, fy: 0.36, role: "mid" },
    fwd:  { fx: 0.50, fy: 0.55, role: "fwd" },
  },
};

export const DEFAULT_USER_ROLE: Record<string, string> = {
  "5v5": "rw",
  "3v3": "rw",
  "7v7": "rcm",
};

// Jersey numbers by role key
export const JERSEY_NUMBERS: Record<string, number> = {
  gk: 1, hold: 6, lw: 7, rw: 11, fwd: 9, lcm: 8, rcm: 10,
};

// Human-readable role names + zone box colors (shared by the rule editor and the
// on-pitch draw tool).
export const ROLE_LABELS: Record<string, string> = {
  gk: "Goalkeeper", hold: "Holding Mid (6)", lw: "Left Wing (7)",
  rw: "Right Wing (11)", fwd: "Forward (9)", lcm: "Left CM (8)", rcm: "Right CM (10)",
};

export const ZONE_COLORS: Record<string, string> = {
  us: "#2E6FE0",
  them: "#E0463B",
};

// Buildout lines — divide field into thirds
export const THIRD_1_Y = TOP + (BOT - TOP) / 3;   // 1/3 from top
export const THIRD_2_Y = TOP + (BOT - TOP) * 2 / 3; // 2/3 from top

// Goalkick defensive setups (opponent positions when WE have a goalkick)
// Blues attack UP (toward TOP), so "us" goalkick is at BOT.
// Opponent (reds) must be behind buildout line (THIRD_2_Y for "us" goalkick).
// Positions are in opponent's frame: fx 0-1 across pitch, fy 0=own goal 1=opp goal
export interface GoalkickSetupDef {
  id: string;
  name: string;
  // Each entry: which opponent role + where they go (fx, fy in OPPONENT frame)
  positions: { role: string; fx: number; fy: number }[];
}

export const GOALKICK_SETUPS: GoalkickSetupDef[] = [
  {
    id: "split-wide",
    name: "Split Wide",
    // Hold + FWD split to either side of the GK area, wingers sit wide behind halfway
    positions: [
      { role: "hold", fx: 0.30, fy: 0.38 }, // left of GK area (their perspective)
      { role: "fwd",  fx: 0.70, fy: 0.38 }, // right of GK area
      { role: "lw",   fx: 0.15, fy: 0.52 }, // wide left behind halfway
      { role: "rw",   fx: 0.85, fy: 0.52 }, // wide right behind halfway
    ],
  },
  {
    id: "press-high",
    name: "High Press",
    // All four pushed up to the buildout line, compact and ready to press
    positions: [
      { role: "hold", fx: 0.35, fy: 0.55 },
      { role: "fwd",  fx: 0.50, fy: 0.60 },
      { role: "lw",   fx: 0.15, fy: 0.52 },
      { role: "rw",   fx: 0.85, fy: 0.52 },
    ],
  },
  {
    id: "mid-block",
    name: "Mid Block",
    // Sit in a compact mid-block behind halfway, not pressing
    positions: [
      { role: "hold", fx: 0.50, fy: 0.42 },
      { role: "fwd",  fx: 0.50, fy: 0.50 },
      { role: "lw",   fx: 0.20, fy: 0.45 },
      { role: "rw",   fx: 0.80, fy: 0.45 },
    ],
  },
];

export const SPEED_MAP = {
  min: 25,
  max: 100,
  default: 38,
  toPace: (v: number) => 0.12 + ((v - 25) / 75) * 0.30,
  toLabel: (v: number) => v < 45 ? "Slow" : v < 75 ? "Medium" : "Fast",
};

export const XP_TABLE = [
  0, 100, 250, 500, 850, 1300, 1900, 2600, 3500, 4600,
  6000, 7700, 9800, 12400, 15500, 19200, 23600, 28800, 35000, 42000,
];

export const LEVEL_NAMES = [
  "Grassroots", "Trainee", "Academy Player", "Squad Member", "First Team",
  "Starter", "Key Player", "Captain", "Star Player", "Legend",
  "Rising Pro", "Pro", "International", "World Class", "Ballon d'Or",
  "Legendary", "Iconic", "Immortal", "GOAT Candidate", "GOAT",
];
