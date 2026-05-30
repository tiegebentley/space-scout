// Lesson / scenario model — ported from the soccer-iq-lab teaching app
// (originally a single vanilla-JS index.html). The scenario DATA shape is lifted
// verbatim so existing lab content can be dropped in; the grader and board are
// reimplemented natively (see engine/scenarioGrader.ts, components/lessons/).
import type { MatchConfig } from "./game";

// The lab pitch is a fixed 1000x620 coordinate space; all board/zone/optimal
// coordinates below are in those units. The board component scales to fit.
export const LAB_PITCH = { w: 1000, h: 620 } as const;

// A token on the scenario board — a player, the ball, or an arrow (pass/run line).
export interface BoardObject {
  id: string;
  type: "player" | "ball" | "arrow";
  x: number;
  y: number;
  team?: "home" | "away"; // home = the user's team (blue), away = opponent (red)
  label?: string;         // jersey number, e.g. "6" / "11"
  // Arrow endpoints (lab coords). type==="arrow" only.
  x1?: number;
  y1?: number;
  x2?: number;
  y2?: number;
  color?: string;
  style?: "pass" | "run"; // pass = solid, run = dashed
}

// A short role description shown when a player is tapped in an `info` scenario.
export interface InfoCard {
  title?: string;
  text: string;
}

// A rectangular target zone (lab coords). A dragged player satisfies its zone
// constraint if it lands inside ANY of the zones listed for its id.
export interface Zone {
  x: number;
  y: number;
  w: number;
  h: number;
}

// A positional constraint of one player relative to another. Mirrors the 10
// cases the lab grader supports (index.html checkRelation). `relativeTo` is the
// id of the other board object the rule is measured against.
export type RelationRule =
  | { type: "minDistX"; relativeTo: string; min?: number }
  | { type: "minDistY"; relativeTo: string; min?: number }
  | { type: "mustBeAhead"; relativeTo: string; margin?: number }
  | { type: "mustBeBehind"; relativeTo: string; margin?: number }
  | { type: "oppositeSideY"; relativeTo: string }
  | { type: "sameSideY"; relativeTo: string }
  | { type: "widerThan"; relativeTo: string; margin?: number }
  | { type: "minDist"; relativeTo: string; min?: number }
  | { type: "maxDist"; relativeTo: string; max?: number }
  | { type: "relativeZone"; relativeTo: string; rect?: Zone };

// A multiple-choice option (used by `choice`-mode scenarios).
export interface Choice {
  text: string;
  correct: boolean;
}

// One graded teaching scenario. Two answer modes:
//  - move:   the user drags the players named in answer.objectIds; each must
//            satisfy its zones (any-of) AND all of its relations to pass.
//  - choice: the user picks an option from `choices`.
export interface Scenario {
  id: string;
  format: string;       // e.g. "5v5-1-2-1" (informational; board carries positions)
  type?: string;        // "positioning" | "decision" | ...
  difficulty?: "beginner" | "intermediate" | "advanced";
  youAre?: "home" | "away";
  attackDir?: "left" | "right";
  question: string;
  instruction?: string;
  optimalNote?: string; // shown when the answer is revealed/correct
  explanation: string;
  // Escalating hints shown on successive wrong attempts (index clamps to last).
  // `nudge` is a single-hint shorthand. Falls back to optimalNote if neither set.
  nudges?: string[];
  nudge?: string;
  answer:
    | { mode: "move"; objectIds: string[] }
    | { mode: "choice"; objectId?: string | null }
    // arrow: user drags the named arrow's tip into the target `zone`.
    | { mode: "arrow"; objectId: string }
    // info: user taps each named player to reveal its role card; done = all seen.
    | { mode: "info"; objectIds: string[] };
  zones?: Record<string, Zone | Zone[]>;       // by player id (any-of)
  relations?: Record<string, RelationRule[]>;  // by player id (all-of)
  optimals?: Record<string, { x: number; y: number }>;
  optimal?: { x1: number; y1: number; x2: number; y2: number } | null; // arrow optimal
  zone?: Zone | null;          // arrow target zone (the tip must land inside)
  choices?: Choice[] | null;
  infoCards?: Record<string, InfoCard>; // by player id (info mode)
  board: { objects: BoardObject[] };
}

// A lesson is an ordered list of steps that interleave teaching, graded
// scenarios, and (as the finale) a live space-scout match preconfigured for the
// concept. This is the bridge between the lab and the game.
export type LessonStep =
  | { kind: "explain"; title: string; body: string }
  | { kind: "scenario"; scenario: Scenario }
  | { kind: "play"; title: string; body: string; matchConfig: Partial<MatchConfig> };

export interface Lesson {
  id: string;
  title: string;
  description: string;
  difficulty?: "beginner" | "intermediate" | "advanced";
  category?: string;
  steps: LessonStep[];
}

export interface Course {
  id: string;
  title: string;
  icon: string;
  level: "beginner" | "intermediate" | "advanced";
  description: string;
  lessonIds: string[];
}
