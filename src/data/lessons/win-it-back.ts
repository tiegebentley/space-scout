// SHARE THE BALL — Lesson 6: "Win the Ball Back — Pressing"
// The rondo flipped: now WE are the wall. Press the moment we lose the ball,
// recognize pressing windows (bad touch, head down, slow pass), and press as
// a pair — one chases, one covers. Live finale: win the ball back fast.
import type { Lesson } from "@/types/lessons";

export const WIN_IT_BACK_LESSON: Lesson = {
  id: "win-it-back",
  title: "Win the Ball Back — Pressing",
  description: "Now YOU are the wall. Press the second we lose the ball — and pick the right moment to pounce.",
  difficulty: "intermediate",
  category: "movement",
  steps: [
    {
      kind: "explain",
      title: "Be the wall",
      body: "Everything you learned about beating pressure works in reverse when the other team has the ball — now YOU are the wall. Rule one: the best moment to win the ball back is the very second you lose it, because the other team hasn't made their shape yet. Rule two: press at the right WINDOW — a bad touch, a head looking down at the ball, a slow bouncing pass. Rule three: never press alone as a team of one — a friend covers behind you in case the ball escapes.",
    },
    {
      kind: "scenario",
      scenario: {
        id: "wib-press-now",
        format: "5v5-1-2-1",
        type: "decision",
        difficulty: "intermediate",
        youAre: "home",
        attackDir: "right",
        question: "Blue just LOST the ball and you (#10) are the closest player. What do you do?",
        instruction: "Pick your very next move.",
        optimalNote: "Press NOW — they haven't looked up yet. This is your best chance to steal it back.",
        explanation: "The moment after losing the ball is the best pressing moment in soccer: the new ball-carrier is still looking down, their teammates haven't made angles yet, and the ball is barely under control. Sprint to press IMMEDIATELY — before their rondo starts. Walking back gives them free time to build.",
        nudge: "Their rondo hasn't started yet — what stops it from starting?",
        answer: { mode: "choice", objectId: null },
        choices: [
          { text: "Press immediately — sprint at the ball before they look up", correct: true },
          { text: "Walk back to my own goal and wait", correct: false },
          { text: "Stop and ask the referee for a do-over", correct: false },
        ],
        board: {
          objects: [
            { id: "wib1-gk", type: "player", x: 70, y: 310, team: "home", label: "1" },
            { id: "wib1-p6", type: "player", x: 330, y: 310, team: "home", label: "6" },
            { id: "wib1-p7", type: "player", x: 450, y: 470, team: "home", label: "7" },
            { id: "wib1-p11", type: "player", x: 450, y: 150, team: "home", label: "11" },
            { id: "wib1-p10", type: "player", x: 520, y: 280, team: "home", label: "10" },
            { id: "wib1-a6", type: "player", x: 560, y: 320, team: "away", label: "6" },
            { id: "wib1-a7", type: "player", x: 700, y: 450, team: "away", label: "7" },
            { id: "wib1-a11", type: "player", x: 700, y: 170, team: "away", label: "11" },
            { id: "wib1-ball", type: "ball", x: 545, y: 320 },
          ],
        },
      },
    },
    {
      kind: "scenario",
      scenario: {
        id: "wib-window",
        format: "5v5-1-2-1",
        type: "decision",
        difficulty: "intermediate",
        youAre: "home",
        attackDir: "right",
        question: "You're pressing the red #6. When is the BEST moment to pounce and steal the ball?",
        instruction: "Pick the pressing window.",
        optimalNote: "Pounce on the bad touch — that's the window when the ball isn't theirs yet.",
        explanation: "Pressing isn't just running fast — it's timing. The windows: a heavy first touch (ball away from their feet), a head looking down (they can't see you coming), or a slow pass rolling between players. When the ball is under perfect control, you press carefully and wait. When the window opens — GO.",
        answer: { mode: "choice", objectId: null },
        choices: [
          { text: "The second they take a bad touch or look down at the ball", correct: true },
          { text: "When the ball is perfectly under their control", correct: false },
          { text: "Never — pressing is only for goalkeepers", correct: false },
        ],
        board: {
          objects: [
            { id: "wib2-p10", type: "player", x: 480, y: 280, team: "home", label: "10" },
            { id: "wib2-p6", type: "player", x: 380, y: 360, team: "home", label: "6" },
            { id: "wib2-p7", type: "player", x: 420, y: 490, team: "home", label: "7" },
            { id: "wib2-a6", type: "player", x: 560, y: 320, team: "away", label: "6" },
            { id: "wib2-a10", type: "player", x: 690, y: 280, team: "away", label: "10" },
            { id: "wib2-ball", type: "ball", x: 600, y: 345 },
            { id: "wib2-arr", type: "arrow", x: 585, y: 335, x1: 570, y1: 326, x2: 600, y2: 345, color: "#dc2626", style: "run" },
          ],
        },
      },
    },
    {
      kind: "scenario",
      scenario: {
        id: "wib-press-cover",
        format: "5v5-1-2-1",
        type: "movement",
        difficulty: "intermediate",
        youAre: "home",
        attackDir: "right",
        question: "#10 is pressing the ball. Don't leave them alone! Drag #6 to COVER the space behind the press in case the ball escapes.",
        instruction: "Drag #6 behind #10's press, between the ball and your goal.",
        optimalNote: "Press + cover. If the ball squirts past #10, you're there to win it.",
        explanation: "Pressing works in pairs: one player attacks the ball, a teammate covers the space behind. If the dribbler beats the first presser or slips a pass through, the cover player wins it. One presser alone is a wall with a hole in it — two make a real trap.",
        nudges: [
          "Cover means BEHIND the presser, on your goal side.",
          "Stay close enough to #10 to win the ball if it escapes the press.",
        ],
        answer: { mode: "move", objectIds: ["wib3-p6"] },
        zones: { "wib3-p6": { x: 370, y: 230, w: 150, h: 160 } },
        relations: {
          "wib3-p6": [
            { type: "mustBeBehind", relativeTo: "wib3-ball", margin: 40 },
            { type: "maxDist", relativeTo: "wib3-p10", max: 220 },
          ],
        },
        optimals: { "wib3-p6": { x: 440, y: 310 } },
        choices: null,
        board: {
          objects: [
            { id: "wib3-gk", type: "player", x: 70, y: 310, team: "home", label: "1" },
            { id: "wib3-p6", type: "player", x: 300, y: 480, team: "home", label: "6" },
            { id: "wib3-p7", type: "player", x: 380, y: 520, team: "home", label: "7" },
            { id: "wib3-p11", type: "player", x: 420, y: 130, team: "home", label: "11" },
            { id: "wib3-p10", type: "player", x: 555, y: 310, team: "home", label: "10" },
            { id: "wib3-a6", type: "player", x: 620, y: 310, team: "away", label: "6" },
            { id: "wib3-a10", type: "player", x: 740, y: 260, team: "away", label: "10" },
            { id: "wib3-a7", type: "player", x: 700, y: 440, team: "away", label: "7" },
            { id: "wib3-ball", type: "ball", x: 597, y: 310 },
          ],
        },
      },
    },
    {
      kind: "live-scenario",
      title: "Hunt the ball — live",
      body: "The other team kicks off with the ball. You're the #10, the first presser. Sprint at the ball-carrier, watch for the bad-touch window, and trust your teammates to cover. Win the ball back within 10 seconds to complete the lesson.",
      matchConfig: {
        format: "5v5",
        userRole: "fwd",
        duration: 150000,
        aiDifficulty: "easy",
        zoneRules: [],
      },
      scenarioSetup: { forcedRestart: "kickoff", restartTeam: "them", repSeconds: 20, restartDelaySec: 3 },
      objective: { type: "winBack", label: "Win the ball back within 10 seconds", withinSeconds: 10 },
    },
  ],
};
