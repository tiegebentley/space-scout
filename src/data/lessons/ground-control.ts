// SHARE THE BALL — Lesson 2: "Ground Control — Your First Touch"
// The technique that makes every rondo possible. Follows the coaching
// progression: stop the ball → positive first touch (forward) → first touch
// ANGLED away from pressure → receive across your body. The physical pieces
// (shuffle in line, single-leg balance) live in the explain card.
import type { Lesson } from "@/types/lessons";

export const GROUND_CONTROL_LESSON: Lesson = {
  id: "ground-control",
  title: "Ground Control — Your First Touch",
  description: "Stop it, push it forward, or take it away from pressure — your first touch is a decision.",
  difficulty: "beginner",
  category: "movement",
  steps: [
    {
      kind: "explain",
      title: "Your first touch is a decision",
      body: "Before the ball even arrives, your body is already working: shuffle your feet to get IN LINE with the ball, balance on one leg, and control with the other. Then your first touch makes a choice. No pressure? Take a POSITIVE touch — push the ball forward into space with the inside of your foot or your sole. Pressure coming? Take your first touch AWAY from it. And when the space is on your other side, let the ball run ACROSS your body to your far foot. We'll practice each one.",
    },
    {
      kind: "scenario",
      scenario: {
        id: "gc-positive",
        format: "5v5-1-2-1",
        type: "decision",
        difficulty: "beginner",
        youAre: "home",
        attackDir: "right",
        question: "The pass is rolling to #10 and the nearest defender is FAR away. What's the best first touch?",
        instruction: "Pick the best first touch.",
        optimalNote: "Positive touch! Push it forward into all that open grass.",
        explanation: "When you have space, your first touch should be POSITIVE — push the ball forward into the open space so you're already attacking. Stopping the ball dead wastes your head start, and blasting it away just gives it to the other team.",
        answer: { mode: "choice", objectId: null },
        choices: [
          { text: "A positive touch — push the ball forward into the open space", correct: true },
          { text: "Stop the ball dead and wait for the defender to arrive", correct: false },
          { text: "Kick it as far as you can and chase it", correct: false },
        ],
        board: {
          objects: [
            { id: "gc1-gk", type: "player", x: 70, y: 310, team: "home", label: "1" },
            { id: "gc1-p6", type: "player", x: 280, y: 310, team: "home", label: "6" },
            { id: "gc1-p7", type: "player", x: 380, y: 480, team: "home", label: "7" },
            { id: "gc1-p11", type: "player", x: 380, y: 140, team: "home", label: "11" },
            { id: "gc1-p10", type: "player", x: 480, y: 310, team: "home", label: "10" },
            { id: "gc1-a6", type: "player", x: 790, y: 310, team: "away", label: "6" },
            { id: "gc1-a7", type: "player", x: 730, y: 460, team: "away", label: "7" },
            { id: "gc1-a11", type: "player", x: 730, y: 160, team: "away", label: "11" },
            { id: "gc1-ball", type: "ball", x: 360, y: 310 },
            { id: "gc1-arr", type: "arrow", x: 420, y: 310, x1: 295, y1: 310, x2: 455, y2: 310, color: "#2563eb", style: "pass" },
          ],
        },
      },
    },
    {
      kind: "scenario",
      scenario: {
        id: "gc-away-from-pressure",
        format: "5v5-1-2-1",
        type: "decision",
        difficulty: "beginner",
        youAre: "home",
        attackDir: "right",
        question: "Now a defender is sprinting at #10 from the RIGHT as the pass arrives. Where should the first touch go?",
        instruction: "Pick where the first touch goes.",
        optimalNote: "Away from the press! Touch it left, where the defender isn't.",
        explanation: "Golden rule: your first touch goes AWAY from pressure. The defender comes from your right, so one soft touch with the inside of your foot takes the ball left — and suddenly the defender is chasing instead of stealing.",
        nudge: "Where is the defender coming from? Touch it the OTHER way.",
        answer: { mode: "choice", objectId: null },
        choices: [
          { text: "To the LEFT — away from the pressure", correct: true },
          { text: "To the RIGHT — straight into the defender's path", correct: false },
          { text: "Backwards toward my own goal, every time", correct: false },
        ],
        board: {
          objects: [
            { id: "gc2-gk", type: "player", x: 70, y: 310, team: "home", label: "1" },
            { id: "gc2-p6", type: "player", x: 280, y: 310, team: "home", label: "6" },
            { id: "gc2-p7", type: "player", x: 380, y: 480, team: "home", label: "7" },
            { id: "gc2-p11", type: "player", x: 380, y: 140, team: "home", label: "11" },
            { id: "gc2-p10", type: "player", x: 480, y: 310, team: "home", label: "10" },
            { id: "gc2-a6", type: "player", x: 600, y: 420, team: "away", label: "6" },
            { id: "gc2-a7", type: "player", x: 730, y: 460, team: "away", label: "7" },
            { id: "gc2-a11", type: "player", x: 730, y: 160, team: "away", label: "11" },
            { id: "gc2-ball", type: "ball", x: 360, y: 310 },
            { id: "gc2-arr1", type: "arrow", x: 420, y: 310, x1: 295, y1: 310, x2: 455, y2: 310, color: "#2563eb", style: "pass" },
            { id: "gc2-arr2", type: "arrow", x: 540, y: 365, x1: 595, y1: 415, x2: 505, y2: 330, color: "#dc2626", style: "run" },
          ],
        },
      },
    },
    {
      kind: "scenario",
      scenario: {
        id: "gc-across-body",
        format: "5v5-1-2-1",
        type: "decision",
        difficulty: "beginner",
        youAre: "home",
        attackDir: "right",
        question: "The pass comes from your LEFT and all the open space is on your RIGHT. How do you receive it?",
        instruction: "Pick how to take the ball.",
        optimalNote: "Across the body! The ball rolls past your near foot onto your far foot — and you're facing the space.",
        explanation: "Receiving ACROSS your body means letting the ball run past your near foot and taking it with the far one. With an open body shape you can see the whole field while the ball travels — and your first touch already faces the space. Stopping it with the near foot leaves you facing the wrong way.",
        answer: { mode: "choice", objectId: null },
        choices: [
          { text: "Open up and let it run across my body to my far foot", correct: true },
          { text: "Stop it dead with my nearest foot and stand still", correct: false },
          { text: "Turn my back to the field so nobody can see the ball", correct: false },
        ],
        board: {
          objects: [
            { id: "gc3-gk", type: "player", x: 70, y: 310, team: "home", label: "1" },
            { id: "gc3-p6", type: "player", x: 300, y: 150, team: "home", label: "6" },
            { id: "gc3-p10", type: "player", x: 480, y: 330, team: "home", label: "10" },
            { id: "gc3-p7", type: "player", x: 430, y: 500, team: "home", label: "7" },
            { id: "gc3-a6", type: "player", x: 400, y: 250, team: "away", label: "6" },
            { id: "gc3-a7", type: "player", x: 760, y: 440, team: "away", label: "7" },
            { id: "gc3-ball", type: "ball", x: 320, y: 165 },
            { id: "gc3-arr", type: "arrow", x: 400, y: 245, x1: 335, y1: 180, x2: 465, y2: 315, color: "#2563eb", style: "pass" },
          ],
        },
      },
    },
    {
      kind: "scenario",
      scenario: {
        id: "gc-in-line",
        format: "5v5-1-2-1",
        type: "decision",
        difficulty: "beginner",
        youAre: "home",
        attackDir: "right",
        question: "The pass is rolling a little wide of you. Coach yells \"Get in line with it!\" What does that mean?",
        instruction: "Pick what your body should do.",
        optimalNote: "Quick shuffle steps — now the ball comes straight to you and you're balanced.",
        explanation: "Good control starts BEFORE the touch. Shuffle your feet sideways so your body lines up with the rolling ball, then balance on one leg and control with the other. Stretching one leg out is how the ball sneaks under your foot. This is why we train quick feet and single-leg balance!",
        answer: { mode: "choice", objectId: null },
        choices: [
          { text: "Shuffle my feet sideways so the ball rolls straight to me", correct: true },
          { text: "Stand still and stretch one leg as far as I can", correct: false },
          { text: "Close my eyes and hope it hits my foot", correct: false },
        ],
        board: {
          objects: [
            { id: "gc4-p6", type: "player", x: 300, y: 310, team: "home", label: "6" },
            { id: "gc4-p10", type: "player", x: 560, y: 260, team: "home", label: "10" },
            { id: "gc4-p7", type: "player", x: 480, y: 480, team: "home", label: "7" },
            { id: "gc4-a6", type: "player", x: 700, y: 310, team: "away", label: "6" },
            { id: "gc4-ball", type: "ball", x: 330, y: 320 },
            { id: "gc4-arr", type: "arrow", x: 440, y: 335, x1: 345, y1: 322, x2: 535, y2: 348, color: "#2563eb", style: "pass" },
            { id: "gc4-arr2", type: "arrow", x: 560, y: 305, x1: 560, y1: 272, x2: 558, y2: 338, color: "#2563eb", style: "run" },
          ],
        },
      },
    },
  ],
};
