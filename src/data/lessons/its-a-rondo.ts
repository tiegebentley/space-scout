// SHARE THE BALL — Lesson 8: "It's a Rondo! — In the Real Game"
// The capstone: recognizing rondo moments inside a real 5v5 (build-up under
// press, transition after winning the ball) and the advanced idea that
// COMMITTING a defender creates space for a teammate. Free-play finale.
import type { Lesson } from "@/types/lessons";

export const ITS_A_RONDO_LESSON: Lesson = {
  id: "its-a-rondo",
  title: "It's a Rondo! — In the Real Game",
  description: "Spot the rondo hiding inside real games — and use defenders' choices against them.",
  difficulty: "advanced",
  category: "decision",
  steps: [
    {
      kind: "explain",
      title: "The game is full of rondos",
      body: "Here's the secret of this whole course: real games are just rondos in disguise. A goal kick with two pressers? 3v2 rondo. A throw-in by the corner? Rondo in a tiny box. The moment after you win the ball? Rondo with the whole field as your square. When you spot one, everything you've learned switches on — angles, triangles, around-through-over. And one more advanced trick: when a defender COMMITS to you, they leave someone free. Make defenders choose, then punish the choice.",
    },
    {
      kind: "scenario",
      scenario: {
        id: "iar-spot-it",
        format: "5v5-1-2-1",
        type: "decision",
        difficulty: "advanced",
        youAre: "home",
        attackDir: "right",
        question: "Goal kick. Two red players press your keeper and #6, and your coach shouts \"It's a rondo!\" What do they mean?",
        instruction: "Pick what the coach means.",
        optimalNote: "Exactly like practice: 3v2 in a box. Make angles, stay calm, share the ball.",
        explanation: "Keeper, #6 and the near winger against two pressers — that's a 3v2 rondo, the same game you've played a hundred times. The coach is telling you: don't panic and boot it. Make your angles, find the free player, and play around or through the press. Practice IS the game.",
        nudge: "Count the blue and red players near the ball. Seen this before?",
        answer: { mode: "choice", objectId: null },
        choices: [
          { text: "This is 3v2 keep-away, just like practice — make angles and beat the press", correct: true },
          { text: "Boot the ball as far as possible and hope", correct: false },
          { text: "Everyone crowd around the keeper to protect them", correct: false },
        ],
        board: {
          objects: [
            { id: "iar1-gk", type: "player", x: 70, y: 310, team: "home", label: "1" },
            { id: "iar1-p6", type: "player", x: 280, y: 310, team: "home", label: "6" },
            { id: "iar1-p11", type: "player", x: 300, y: 130, team: "home", label: "11" },
            { id: "iar1-p7", type: "player", x: 430, y: 490, team: "home", label: "7" },
            { id: "iar1-p10", type: "player", x: 560, y: 310, team: "home", label: "10" },
            { id: "iar1-a9", type: "player", x: 190, y: 250, team: "away", label: "9" },
            { id: "iar1-a10", type: "player", x: 330, y: 380, team: "away", label: "10" },
            { id: "iar1-a6", type: "player", x: 620, y: 310, team: "away", label: "6" },
            { id: "iar1-ball", type: "ball", x: 95, y: 310 },
          ],
        },
      },
    },
    {
      kind: "scenario",
      scenario: {
        id: "iar-commit",
        format: "5v5-1-2-1",
        type: "decision",
        difficulty: "advanced",
        youAre: "home",
        attackDir: "right",
        question: "You (#10) dribble at the last defender — and they step TO you, leaving #11 behind them. What now?",
        instruction: "Pick the move.",
        optimalNote: "Release it the moment they commit — #11 is in behind because the defender chose YOU.",
        explanation: "This is the advanced rondo idea: when you commit a defender to the ball, you create space for a teammate — and when a defender commits to a teammate, space opens for you. Dribbling AT the defender forced a choice. They chose you, so #11 is free. Pass the second they commit — not before (they'd recover), not after (they'd steal it).",
        nudges: [
          "The defender made a choice. Who did they leave free?",
          "Time it: release the ball the moment the defender commits to you.",
        ],
        answer: { mode: "choice", objectId: null },
        choices: [
          { text: "Pass to #11 the moment the defender commits to me", correct: true },
          { text: "Keep dribbling into the defender who's stepping at me", correct: false },
          { text: "Stop, turn around, and pass backwards instead", correct: false },
        ],
        board: {
          objects: [
            { id: "iar2-gk", type: "player", x: 70, y: 310, team: "home", label: "1" },
            { id: "iar2-p6", type: "player", x: 420, y: 310, team: "home", label: "6" },
            { id: "iar2-p7", type: "player", x: 560, y: 480, team: "home", label: "7" },
            { id: "iar2-p10", type: "player", x: 640, y: 280, team: "home", label: "10" },
            { id: "iar2-p11", type: "player", x: 730, y: 170, team: "home", label: "11" },
            { id: "iar2-a4", type: "player", x: 730, y: 290, team: "away", label: "4" },
            { id: "iar2-a1", type: "player", x: 930, y: 310, team: "away", label: "1" },
            { id: "iar2-a6", type: "player", x: 560, y: 360, team: "away", label: "6" },
            { id: "iar2-ball", type: "ball", x: 662, y: 285 },
            { id: "iar2-arr", type: "arrow", x: 695, y: 288, x1: 725, y1: 292, x2: 668, y2: 285, color: "#dc2626", style: "run" },
          ],
        },
      },
    },
    {
      kind: "scenario",
      scenario: {
        id: "iar-transition-angles",
        format: "5v5-1-2-1",
        type: "movement",
        difficulty: "advanced",
        youAre: "home",
        attackDir: "right",
        question: "#6 just WON the ball back — and red players are already turning to press. Quick! Drag #11 and #7 into instant angles before the wall forms.",
        instruction: "Drag #11 and #7 wide and ahead of #6 — one on each side.",
        optimalNote: "Instant rondo: two angles before the press arrives. Now #6 escapes forward.",
        explanation: "Winning the ball starts a race: their press versus your shape. If #11 and #7 sprint into wide angles AHEAD of the ball before the press sets, #6 has two doors open immediately — and a transition becomes an attack. Stand still and the moment dies. When we win the ball, the first runs make the rondo.",
        nudges: [
          "Get AHEAD of #6 — the escape doors open up the field.",
          "One winger on each side, wide, away from the red players.",
        ],
        answer: { mode: "move", objectIds: ["iar3-p11", "iar3-p7"] },
        zones: {
          "iar3-p11": { x: 430, y: 60, w: 220, h: 160 },
          "iar3-p7": { x: 430, y: 400, w: 220, h: 160 },
        },
        relations: {
          "iar3-p11": [
            { type: "oppositeSideY", relativeTo: "iar3-p7" },
            { type: "mustBeAhead", relativeTo: "iar3-p6", margin: 60 },
          ],
          "iar3-p7": [
            { type: "oppositeSideY", relativeTo: "iar3-p11" },
            { type: "mustBeAhead", relativeTo: "iar3-p6", margin: 60 },
          ],
        },
        optimals: { "iar3-p11": { x: 540, y: 140 }, "iar3-p7": { x: 540, y: 480 } },
        choices: null,
        board: {
          objects: [
            { id: "iar3-gk", type: "player", x: 70, y: 310, team: "home", label: "1" },
            { id: "iar3-p6", type: "player", x: 360, y: 310, team: "home", label: "6" },
            { id: "iar3-p11", type: "player", x: 310, y: 240, team: "home", label: "11" },
            { id: "iar3-p7", type: "player", x: 310, y: 380, team: "home", label: "7" },
            { id: "iar3-p10", type: "player", x: 560, y: 310, team: "home", label: "10" },
            { id: "iar3-a9", type: "player", x: 450, y: 280, team: "away", label: "9" },
            { id: "iar3-a10", type: "player", x: 430, y: 350, team: "away", label: "10" },
            { id: "iar3-a6", type: "player", x: 650, y: 310, team: "away", label: "6" },
            { id: "iar3-ball", type: "ball", x: 382, y: 310 },
          ],
        },
      },
    },
    {
      kind: "play",
      title: "Final game — see the rondos everywhere",
      body: "Free game, no training wheels. You're the #6, the heart of every rondo. Goal kicks, throw-ins, transitions — spot the rondo, make the angle, pick the door: around, through, or over. And when you hit a wall... you know what to do.",
      matchConfig: {
        format: "5v5",
        userRole: "hold",
        duration: 180000,
        aiDifficulty: "medium",
        defensivePressure: "high",
        zoneRules: [],
      },
    },
  ],
};
