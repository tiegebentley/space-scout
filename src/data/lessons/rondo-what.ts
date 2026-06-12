// SHARE THE BALL — Lesson 1: "What Is a Rondo?"
// The course opener. Teaches the What / Why / When of rondos before any
// technique: a rondo is a group of players making angles and shapes inside a
// small space (occupied by defenders) to break pressure and create space.
// Steps: explain → info scenario (tap the 3v1 roles) → two concept checks.
import type { Lesson } from "@/types/lessons";

export const RONDO_WHAT_LESSON: Lesson = {
  id: "rondo-what",
  title: "What Is a Rondo?",
  description: "When you hit a wall, share the ball. Meet the keep-away game that teaches you to stay calm under pressure.",
  difficulty: "beginner",
  category: "decision",
  steps: [
    {
      kind: "explain",
      title: "When you hit a wall, share the ball",
      body: "A rondo is a keep-away game: your group makes angles and shapes inside a small space while defenders try to steal the ball. WHY do we play it? Because rondos teach the most important skill in soccer — how to keep the ball when the other team presses you. WHEN do we use it in a real game? Every time we have the ball and defenders rush at us — like right after we win the ball back. In this course you'll learn to beat that pressure three ways: around it, through it, or over it.",
    },
    {
      kind: "scenario",
      scenario: {
        id: "rw-roles",
        format: "5v5-1-2-1",
        type: "positioning",
        difficulty: "beginner",
        youAre: "home",
        attackDir: "right",
        question: "This is a 3v1 rondo — three passers, one defender. Tap each player to learn their job.",
        instruction: "Tap every highlighted player to continue.",
        optimalNote: "Three passers, one wall. The passers always have two ways to go — that's the secret.",
        explanation: "Three blue passers make a triangle around one red defender. The defender is the wall. Because the passers keep their angles, the player on the ball ALWAYS has two choices — so the wall can never block everything.",
        answer: { mode: "info", objectIds: ["rw1-p7", "rw1-p11", "rw1-p10", "rw1-a2"] },
        infoCards: {
          "rw1-p7": {
            title: "Passer — On the Ball",
            text: "You have the ball and a defender coming. Stay calm! Your teammates make angles so you always have a pass ready. (e.g. Pedri)",
          },
          "rw1-p11": {
            title: "Passer — The Angle Maker",
            text: "Slide a few steps left or right so the defender can NEVER stand between you and the ball. A small step opens a big passing lane. (e.g. Modrić)",
          },
          "rw1-p10": {
            title: "Passer — The Helper",
            text: "When the ball moves, you move. Every time a teammate gets the ball, give them a brand-new triangle right away. (e.g. Iniesta)",
          },
          "rw1-a2": {
            title: "Defender — The Wall",
            text: "The wall chases the ball and tries to block your passes. When you hit a wall... share the ball! (e.g. Kanté)",
          },
        },
        board: {
          objects: [
            { id: "rw1-p7", type: "player", x: 380, y: 200, team: "home", label: "7" },
            { id: "rw1-p11", type: "player", x: 620, y: 200, team: "home", label: "11" },
            { id: "rw1-p10", type: "player", x: 500, y: 430, team: "home", label: "10" },
            { id: "rw1-a2", type: "player", x: 500, y: 290, team: "away", label: "2" },
            { id: "rw1-ball", type: "ball", x: 405, y: 215 },
          ],
        },
      },
    },
    {
      kind: "scenario",
      scenario: {
        id: "rw-what",
        format: "5v5-1-2-1",
        type: "decision",
        difficulty: "beginner",
        youAre: "home",
        attackDir: "right",
        question: "So... what IS a rondo?",
        instruction: "Pick the best answer.",
        optimalNote: "A rondo is keep-away with a brain: angles and shapes that beat the pressure.",
        explanation: "A rondo is a group of players creating angles and shapes inside a small space — while defenders hunt the ball — to break pressure and create space for the team. It's not about kicking hard or running fast. It's about making the right shape so the ball can always escape.",
        answer: { mode: "choice", objectId: null },
        choices: [
          { text: "A keep-away game where we make angles and shapes to escape pressure", correct: true },
          { text: "A contest to see who can kick the ball the hardest", correct: false },
          { text: "A drill where everyone chases the ball at the same time", correct: false },
        ],
        board: {
          objects: [
            { id: "rw2-p7", type: "player", x: 380, y: 200, team: "home", label: "7" },
            { id: "rw2-p11", type: "player", x: 620, y: 200, team: "home", label: "11" },
            { id: "rw2-p10", type: "player", x: 500, y: 430, team: "home", label: "10" },
            { id: "rw2-a2", type: "player", x: 480, y: 300, team: "away", label: "2" },
            { id: "rw2-ball", type: "ball", x: 405, y: 215 },
          ],
        },
      },
    },
    {
      kind: "scenario",
      scenario: {
        id: "rw-when",
        format: "5v5-1-2-1",
        type: "decision",
        difficulty: "beginner",
        youAre: "home",
        attackDir: "right",
        question: "Blue just WON the ball back, and two red players are rushing in. When do your rondo skills matter in a real game?",
        instruction: "Pick the best answer.",
        optimalNote: "Right now! Pressure moments ARE rondos — make angles and share the ball.",
        explanation: "Rondo skills turn on the moment we have the ball and the other team presses — especially right after we win it back, when opponents swarm to steal it again. That moment IS a rondo: stay calm, make an angle, share the ball.",
        nudge: "Think about WHEN defenders rush at us hardest.",
        answer: { mode: "choice", objectId: null },
        choices: [
          { text: "When we have the ball and the other team presses us — like right after we win it back", correct: true },
          { text: "Only at practice — rondos never happen in games", correct: false },
          { text: "When the ball goes out of bounds", correct: false },
        ],
        board: {
          objects: [
            { id: "rw3-gk", type: "player", x: 70, y: 310, team: "home", label: "1" },
            { id: "rw3-p6", type: "player", x: 330, y: 330, team: "home", label: "6" },
            { id: "rw3-p7", type: "player", x: 400, y: 470, team: "home", label: "7" },
            { id: "rw3-p11", type: "player", x: 400, y: 160, team: "home", label: "11" },
            { id: "rw3-p10", type: "player", x: 520, y: 310, team: "home", label: "10" },
            { id: "rw3-a9", type: "player", x: 400, y: 360, team: "away", label: "9" },
            { id: "rw3-a10", type: "player", x: 380, y: 270, team: "away", label: "10" },
            { id: "rw3-a7", type: "player", x: 620, y: 440, team: "away", label: "7" },
            { id: "rw3-a11", type: "player", x: 620, y: 180, team: "away", label: "11" },
            { id: "rw3-ball", type: "ball", x: 345, y: 330 },
          ],
        },
      },
    },
  ],
};
