export interface Position {
  x: number;
  y: number;
}

export interface Player {
  id: string;
  side: "us" | "them";
  role: PlayerRole;
  number: number;
  x: number;
  y: number;
  px: number;
  py: number;
  face: number;
  gk?: boolean;
  isUser?: boolean;
  backoff?: number;
  holdT?: number;
  frozenTimer?: number;
  home: RoleConfig;
  // Roam target inside the player's zone box (engine-managed), so they use the
  // whole box instead of pinning to an edge. Re-rolled on arrival / timeout.
  roamX?: number;
  roamY?: number;
  roamTimer?: number;
}

export type PlayerRole = "you" | "lw" | "rw" | "hold" | "fwd" | "gk" | "lcm" | "rcm";

export interface RoleConfig {
  fx: number;
  fy: number;
  role: "mid" | "wide" | "hold" | "fwd" | "gk";
}

export interface Ball {
  x: number;
  y: number;
  owner: Player | null;
  flying: boolean;
  tx: number;
  ty: number;
  kind?: "pass" | "shot";
  targetPlayer?: Player | null;
  lastTouch: "us" | "them";
  onArrive: (() => void) | null;
}

export type GameState = "live" | "dead" | "celebrate";
export type Possession = "us" | "them";

export interface Restart {
  type: "kickoff" | "throwin" | "goalkick" | "corner" | "goal";
  team: "us" | "them";
  x: number;
  y: number;
  taker?: Player;
  _pending?: boolean;
}

export interface Score {
  us: number;
  them: number;
}

export type DefensivePressure = "low" | "medium" | "high" | "full";

export interface MatchConfig {
  duration: number; // ms
  format: "3v3" | "5v5" | "7v7";
  speed: number;
  aiDifficulty: "easy" | "medium" | "hard";
  defensivePressure?: DefensivePressure;
  buildoutLines?: boolean;
  userRole?: string;
  tacticId?: string;     // YOUR team's tactic
  oppTacticId?: string;  // opponent's tactic
  zoneRules?: ZoneRule[];
}

// Goalkick defensive setups — where the opposition positions on our goalkick
export interface GoalkickSetup {
  id: string;
  name: string;
  positions: { role: string; fx: number; fy: number }[];
}


export interface DrillConfig {
  id: string;
  name: string;
  description: string;
  category: DrillCategory;
  difficulty: 1 | 2 | 3 | 4 | 5;
  format: "3v3" | "5v5" | "7v7";
  objectives: DrillObjective[];
  timeLimit: number;
  setup: DrillSetup;
  coaching: CoachingTip[];
  xpReward: number;
}

export type DrillCategory =
  | "passing"
  | "movement"
  | "defending"
  | "shooting"
  | "positioning"
  | "transition"
  | "set-pieces";

export interface DrillObjective {
  id: string;
  label: string;
  description: string;
  target: number;
  metric: "passes_completed" | "goals" | "interceptions" | "space_found" | "time_in_zone" | "possession_pct";
}

export interface DrillSetup {
  playerPositions: Record<string, Position>;
  ballStart: Position;
  zones?: Zone[];
  cones?: Position[];
}

export interface Zone {
  x: number;
  y: number;
  w: number;
  h: number;
  type: "target" | "danger" | "scoring";
  label?: string;
}

export interface CoachingTip {
  trigger: string;
  message: string;
  priority: number;
}

export interface PlayerProgress {
  level: number;
  xp: number;
  xpToNext: number;
  totalXp: number;
  skills: SkillRatings;
  drillsCompleted: CompletedDrill[];
  matchesPlayed: number;
  achievements: Achievement[];
}

export interface SkillRatings {
  passing: number;
  movement: number;
  defending: number;
  shooting: number;
  positioning: number;
  gameReading: number;
}

export interface CompletedDrill {
  drillId: string;
  completedAt: string;
  score: number;
  stars: 1 | 2 | 3;
  xpEarned: number;
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  unlockedAt: string;
}

export interface WingerBounds {
  lw: { min: number; max: number };
  rw: { min: number; max: number };
}

// When a zone rule is active. Rules with no condition (or "always") apply every
// frame — backward-compatible with the original always-on behavior. The others
// let you layer different boundaries on the same player depending on who has the
// ball and where it is.
export type ZoneCondition =
  | "always"         // applies every frame (default)
  | "attacking"      // this rule's team has possession
  | "defending"      // this rule's team does NOT have possession
  | "ball_own_half"  // ball is in this team's defensive half
  | "ball_opp_half"  // ball is in this team's attacking half
  | "carrier_is";    // a specific player (carrierTeam + carrierRole) has the ball

// How a player uses their zone box when they have no active job (not chasing
// the ball, pressing, or making a run). Omitted = "roam" (the default).
//  - roam:   drift to random points inside the box → uses the whole space
//  - center: ease toward the middle of the box
//  - free:   no roaming; the box is only a boundary, AI tactic/ball logic moves them
export type ZoneMovement = "roam" | "center" | "free";

export interface ZoneRule {
  id: string;
  team: "us" | "them";
  role: string;
  xMin: number;
  xMax: number;
  yMin: number;
  yMax: number;
  label: string;
  color: string;
  when?: ZoneCondition; // omitted = "always"
  // Only used when when === "carrier_is": which player must hold the ball for
  // this rule to be active.
  carrierTeam?: "us" | "them";
  carrierRole?: string;
  // How the player moves inside the box. Omitted = "roam".
  movement?: ZoneMovement;
}

export interface RulePreset {
  id: string;
  name: string;
  description: string;
  builtin?: boolean;
  rules: Omit<ZoneRule, "id">[];
}

export type GameMode = "match" | "drill" | "free-play";

export interface JoystickVector {
  x: number;
  y: number;
  active: boolean;
}

export interface PillState {
  text: string;
  type: "att" | "def" | "dead";
}
