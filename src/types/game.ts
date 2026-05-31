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
  // While carrying the ball inside a zone box: the width-lane (screen X) the
  // player is driving up, re-chosen toward open space periodically or when
  // blocked — so they don't hug the inside line. Engine-managed.
  carryLaneX?: number;
  carryTimer?: number;
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
  // The player who last kicked the ball into flight. `owner` is nulled the
  // instant a pass/shot launches, so this preserves "who lost it" for the
  // turnover freeze when an interception or loose ball flips possession.
  launchedBy?: Player | null;
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

// A rectangle in ENGINE pitch coords (W×H). Used by receive-in-zone objectives.
export interface EngineRect { x: number; y: number; w: number; h: number }

// What the player must accomplish in a live "Scenario" lesson step. Tracked by
// engine/scenarioObjective.ts off the engine's possession/goal/state events.
export type ScenarioObjective =
  | { type: "passCount"; label: string; target: number; toRole?: string; consecutive?: boolean }
  | { type: "receiveInZone"; label: string; role: string; zone: EngineRect; target?: number }
  | { type: "score"; label: string; target: number }
  | { type: "keepPossession"; label: string; seconds: number }
  | { type: "winBack"; label: string; withinSeconds: number };

// Constrained setup for a Scenario step (boundaries/rules ride on zoneRules).
export interface ScenarioSetup {
  forcedRestart?: "throwin" | "goalkick" | "kickoff" | "corner";
  restartTeam?: "us" | "them";
  // Where the restart is taken (engine coords). When set, the forced restart
  // happens here instead of where the ball went out.
  restartX?: number;
  restartY?: number;
  // Rep-based drilling: each rep plays for this many seconds, then the scenario
  // auto-resets to a fresh configured restart and runs again — repeating until
  // the objective's target count is reached. A successful rep resets early.
  // Omitted/0 = single continuous run (no auto-reset).
  repSeconds?: number;
}

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
  // Set on live "Scenario" steps — the objective to complete + dead-ball setup.
  objective?: ScenarioObjective;
  scenarioSetup?: ScenarioSetup;
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
  completedLessons: string[]; // lesson ids finished in the Learn flow
  lessonScores?: Record<string, number>; // best % score per lesson id
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

// On-the-ball tendency for a carrier inside this zone — what they prefer to DO,
// as opposed to `movement` (where they stand when off the ball). Omitted/"default"
// = the normal carrier AI (dribble/pass/shoot by situation).
//  - cross:   wide attacker whips an early ball to a teammate in the box
//  - shoot:   bias toward shooting whenever there's any sight of goal
//  - dribble: prefer to drive with the ball rather than release it early
//  - recycle: keep possession with safe square/back passes
export type ZoneAction = "default" | "cross" | "shoot" | "dribble" | "recycle";

// Off-the-ball tendency for a player inside this zone when a TEAMMATE has the
// ball (they're not the carrier, chaser, or presser). Layers on top of
// `movement`, which only governs idle roaming. Omitted/"default" = normal shape.
//  - hold_width: stay pinned to the wide edge of the box to stretch the defense
//  - drop_deep:  come short toward the ball to offer a link-up / receive option
export type ZoneOffBall = "default" | "hold_width" | "drop_deep";

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
  // What the player tends to DO with the ball in this zone. Omitted = "default".
  action?: ZoneAction;
  // What the player tends to do OFF the ball (teammate has it) in this zone.
  // Omitted = "default".
  offBall?: ZoneOffBall;
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
