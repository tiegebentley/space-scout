// SHARE THE BALL — Lesson 3: "Make the Triangle — 3v1"
// The first real rondo. Core ideas: a triangle gives the ball-carrier TWO
// options, the defender can only block one lane, and when the ball moves
// everyone moves to rebuild the angles. Ends in a live 3v3 keep-away game
// (objective: unbroken team possession).
import type { Lesson } from "@/types/lessons";

export const RONDO_3V1_LESSON: Lesson = {
  id: "rondo-3v1",
  title: "Make the Triangle — 3v1",
  description: "Three passers, one defender. Make angles so the ball always has two ways out.",
  difficulty: "beginner",
  category: "positioning",
  steps: [
    {
      kind: "explain",
      title: "Two ways out, always",
      body: "In a 3v1 rondo, three passers keep the ball from one defender inside a small square. The magic shape is the TRIANGLE: if your two teammates make angles on different sides of the defender, the player on the ball always has two passing lanes. The defender can only block one. And here's the rule that never stops: when the ball moves, YOU move — rebuild the triangle for the new ball-carrier.",
    },
    {
      kind: "scenario",
      scenario: {
        id: "r31-make-triangle",
        format: "5v5-1-2-1",
        type: "positioning",
        difficulty: "beginner",
        youAre: "home",
        attackDir: "right",
        question: "#7 has the ball but #11 and #10 are hiding behind the defender. Move them so #7 has TWO ways to pass!",
        instruction: "Drag #11 and #10 to different sides of the defender to make a triangle.",
        optimalNote: "Perfect triangle — the defender can't block both lanes at once.",
        explanation: "Standing behind the defender means the pass is blocked. Step out to an ANGLE — one teammate on each side of the defender — and #7 suddenly has two open lanes. One defender can never cover both. That's why triangles beat pressure.",
        nudges: [
          "Get out from behind the defender — #7 can't pass through them!",
          "Put one teammate on each side of the defender, like the points of a triangle.",
        ],
        answer: { mode: "move", objectIds: ["r31a-p11", "r31a-p10"] },
        zones: {
          "r31a-p11": { x: 520, y: 140, w: 160, h: 130 },
          "r31a-p10": { x: 520, y: 350, w: 160, h: 130 },
        },
        relations: {
          "r31a-p11": [
            { type: "oppositeSideY", relativeTo: "r31a-p10" },
            { type: "minDist", relativeTo: "r31a-a2", min: 90 },
          ],
          "r31a-p10": [
            { type: "oppositeSideY", relativeTo: "r31a-p11" },
            { type: "minDist", relativeTo: "r31a-a2", min: 90 },
          ],
        },
        optimals: { "r31a-p11": { x: 590, y: 205 }, "r31a-p10": { x: 590, y: 415 } },
        choices: null,
        board: {
          objects: [
            { id: "r31a-p7", type: "player", x: 370, y: 310, team: "home", label: "7" },
            { id: "r31a-p11", type: "player", x: 575, y: 285, team: "home", label: "11" },
            { id: "r31a-p10", type: "player", x: 590, y: 335, team: "home", label: "10" },
            { id: "r31a-a2", type: "player", x: 500, y: 310, team: "away", label: "2" },
            { id: "r31a-ball", type: "ball", x: 392, y: 310 },
          ],
        },
      },
    },
    {
      kind: "scenario",
      scenario: {
        id: "r31-defender-commits",
        format: "5v5-1-2-1",
        type: "decision",
        difficulty: "beginner",
        youAre: "home",
        attackDir: "right",
        question: "The defender jumps to block the pass to #11. Where does the ball go?",
        instruction: "Pick the pass.",
        optimalNote: "To #10! The defender chose a lane — so you take the other one.",
        explanation: "A defender can only block one lane at a time. The moment they COMMIT to one side, the other lane opens. That's the rondo deal: when the wall picks a door, you walk through the other one. Never force the pass into the lane the defender just closed.",
        nudge: "The defender closed ONE lane. Which one is still open?",
        answer: { mode: "choice", objectId: null },
        choices: [
          { text: "To #10 — the lane the defender just left open", correct: true },
          { text: "To #11 — squeeze it past the defender who's blocking it", correct: false },
          { text: "Nowhere — hold the ball and let the defender arrive", correct: false },
        ],
        board: {
          objects: [
            { id: "r31b-p7", type: "player", x: 370, y: 310, team: "home", label: "7" },
            { id: "r31b-p11", type: "player", x: 590, y: 205, team: "home", label: "11" },
            { id: "r31b-p10", type: "player", x: 590, y: 415, team: "home", label: "10" },
            { id: "r31b-a2", type: "player", x: 480, y: 250, team: "away", label: "2" },
            { id: "r31b-ball", type: "ball", x: 392, y: 310 },
            { id: "r31b-arr", type: "arrow", x: 435, y: 280, x1: 475, y1: 255, x2: 410, y2: 300, color: "#dc2626", style: "run" },
          ],
        },
      },
    },
    {
      kind: "scenario",
      scenario: {
        id: "r31-ball-moves-you-move",
        format: "5v5-1-2-1",
        type: "movement",
        difficulty: "beginner",
        youAre: "home",
        attackDir: "right",
        question: "The ball went to #10 — and the defender is chasing it. When the ball moves, YOU move! Drag #7 to give #10 a new angle.",
        instruction: "Drag #7 to an open angle where #10 can pass, away from the defender.",
        optimalNote: "New triangle, same rule: #10 has two ways out again.",
        explanation: "A rondo never stands still. The pass to #10 made your old spot useless — so you slide to a NEW angle and rebuild the triangle before the defender gets set. Great rondo players move the moment the ball leaves a teammate's foot.",
        nudges: [
          "Your old spot doesn't help #10 anymore — slide toward the ball side.",
          "Find the open angle below the defender, where #10 can reach you.",
        ],
        answer: { mode: "move", objectIds: ["r31c-p7"] },
        zones: { "r31c-p7": { x: 350, y: 350, w: 150, h: 130 } },
        relations: {
          "r31c-p7": [{ type: "minDist", relativeTo: "r31c-a2", min: 90 }],
        },
        optimals: { "r31c-p7": { x: 415, y: 420 } },
        choices: null,
        board: {
          objects: [
            { id: "r31c-p7", type: "player", x: 370, y: 310, team: "home", label: "7" },
            { id: "r31c-p11", type: "player", x: 590, y: 205, team: "home", label: "11" },
            { id: "r31c-p10", type: "player", x: 590, y: 415, team: "home", label: "10" },
            { id: "r31c-a2", type: "player", x: 520, y: 360, team: "away", label: "2" },
            { id: "r31c-ball", type: "ball", x: 568, y: 415 },
          ],
        },
      },
    },
    {
      kind: "live-scenario",
      title: "Live rondo — keep the ball!",
      body: "Now play it for real. It's a small keep-away game: pass, move to a new angle, and keep the ball as a team. If the ball gets stuck, remember — when you hit a wall, share the ball. Keep possession going to complete the lesson.",
      matchConfig: {
        format: "3v3",
        userRole: "rw",
        duration: 150000,
        aiDifficulty: "easy",
        defensivePressure: "high",
        zoneRules: [],
      },
      scenarioSetup: { forcedRestart: "kickoff", restartTeam: "us" },
      objective: { type: "keepPossession", label: "Keep the ball as a team for 15 seconds", seconds: 15 },
    },
  ],
};
