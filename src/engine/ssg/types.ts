// Small-sided games (rondos & possession games) — shared types.
// World units are YARDS. The box spans (0,0)–(boxW,boxH); +y is down the screen.

export type SsgDifficulty = "easy" | "medium" | "hard" | "elite";
export type SsgMode = "rondo" | "possession";

export interface SsgConfig {
  id?: string;
  name: string;
  mode: SsgMode;          // rondo: Reds only win it back · possession: both teams keep it
  boxW: number;           // yards (across the screen)
  boxH: number;           // yards (down the screen)
  teamA: number;          // Blues
  teamB: number;          // Reds
  neutrals: number;       // inside players who play for whoever has the ball
  bumpers: number;        // edge players (outside the lines) who play for whoever has it
  perimeter: boolean;     // rondo: Blues stand on the outside lines
  swapOnTurnover: boolean;// rondo: the player who loses it swaps into the middle
  passesForPoint: number; // consecutive passes = 1 point
  touchLimit: 0 | 1 | 2;  // 0 = free play
  duration: number;       // seconds
  userTeam: "A" | "B";    // which side you play on
  difficulty: SsgDifficulty;
  speed: number;          // 0.8 slow · 1 normal · 1.2 fast
}

export type SsgSide = "A" | "B" | "N";

export interface SsgPlayer {
  id: string;
  side: SsgSide;          // A Blues · B Reds · N neutral/bumper
  bumper: boolean;
  edge?: 0 | 1 | 2 | 3;   // bumper edge: 0 top · 1 right · 2 bottom · 3 left
  slot?: number;          // perimeter slot index (rondo Blues on the outside)
  number: number;
  isUser: boolean;
  x: number; y: number;
  vx: number; vy: number;
  face: number;
  tgx?: number; tgy?: number;
  settled?: boolean;
  evalT: number;          // frames until the support spot is re-judged
  spotX?: number; spotY?: number;
  hold: number;           // frames on the ball this touch
  holdLimit: number;      // AI: frames before it must release (touch limit / decision)
  react: number;         // AI: first-touch settle frames
  immune: number;         // frames the carrier can't be tackled (just received)
  cool: number;           // frames this player can't win the ball (just lost it)
  lastFrom?: string;      // who passed to me (avoid instant ping-pong)
  joining?: boolean;      // rondo: walking out to the line after a swap
}

export interface SsgBall {
  x: number; y: number;
  vx: number; vy: number;
  owner: SsgPlayer | null;
  passing: boolean;       // a pass is travelling
  target: SsgPlayer | null;
  passer: SsgPlayer | null;
  passFrames: number;     // frames since the pass was struck
  lastTouch: SsgPlayer | null;
  deadX?: number; deadY?: number; // kick-in spot while dead
}

export interface SsgStats {
  points: { A: number; B: number };
  streak: number;
  best: number;
  passes: { A: number; B: number };
  attempts: { A: number; B: number };
  splits: number;
  wins: number;            // rondo: times the middle won it · possession: turnovers
  userPasses: number;
  userAttempts: number;
  userLost: number;
  userWon: number;
}

export type SsgEvent =
  | { type: "pill"; text: string; tone: "good" | "bad" | "info" }
  | { type: "stats" }
  | { type: "end" };
