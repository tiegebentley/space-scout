// "Don't Bunch Up — Spacing" lesson. Scenario data lifted directly from
// soccer-iq-lab (buildSpacingScenarios), wrapped as ordered LessonSteps:
// explain → 4 graded scenarios → a live space-scout match preconfigured with
// wide-spacing zone rules (the "Stay Wide" concept) so the player practices the
// idea in a real game.
import type { Lesson } from "@/types/lessons";
import type { ZoneRule } from "@/types/game";

// Wide-spacing zone rules for the live finale — wingers pinned to their flanks
// and told to hold width off the ball. Mirrors the "Stay Wide" built-in preset.
const WIDE_ZONES: ZoneRule[] = [
  { id: "sp-lw", team: "us", role: "lw", xMin: 0.0, xMax: 0.3, yMin: 0.1, yMax: 0.9, label: "Blue LW", color: "#2E6FE0", offBall: "hold_width" },
  { id: "sp-rw", team: "us", role: "rw", xMin: 0.7, xMax: 1.0, yMin: 0.1, yMax: 0.9, label: "Blue RW", color: "#2E6FE0", offBall: "hold_width" },
];

export const SPACING_LESSON: Lesson = {
  id: "spacing-dont-bunch",
  title: "Don't Bunch Up — Spacing",
  description: "Spread out so your team always has someone to pass to.",
  difficulty: "beginner",
  category: "positioning",
  steps: [
    {
      kind: "explain",
      title: "Why spacing matters",
      body: "When your team has the ball, you want to spread out. If everyone stands close together, one defender can block all the passes at once. Spread wide and give the player on the ball lots of choices. In this lesson you'll practice spreading out, then try it in a real game.",
    },
    {
      kind: "scenario",
      scenario: {
        id: "sp-1", format: "5v5-1-2-1", type: "positioning", difficulty: "beginner",
        youAre: "home", attackDir: "right",
        question: "Your goalie has the ball. Spread out so they can pass to you!",
        instruction: "Drag #6, #7, and #11 far apart from each other.",
        optimalNote: "Everyone is spread out — the goalie has three people to pass to.",
        explanation: "When your goalie has the ball, you need to spread out. If everyone stands close together, one defender can block all the passes. Spread wide and give your goalie choices!",
        answer: { mode: "move", objectIds: ["sp1-p6", "sp1-p7", "sp1-p11"] },
        zones: {
          "sp1-p6": { x: 160, y: 220, w: 140, h: 180 },
          "sp1-p7": { x: 280, y: 430, w: 180, h: 170 },
          "sp1-p11": { x: 280, y: 30, w: 180, h: 170 },
        },
        relations: {
          "sp1-p7": [{ type: "oppositeSideY", relativeTo: "sp1-p11" }, { type: "minDistY", relativeTo: "sp1-p6", min: 100 }],
          "sp1-p11": [{ type: "oppositeSideY", relativeTo: "sp1-p7" }, { type: "minDistY", relativeTo: "sp1-p6", min: 100 }],
        },
        optimals: { "sp1-p6": { x: 230, y: 310 }, "sp1-p7": { x: 370, y: 520 }, "sp1-p11": { x: 370, y: 100 } },
        choices: null,
        board: { objects: [
          { id: "sp1-gk", type: "player", x: 63, y: 310, team: "home", label: "1" },
          { id: "sp1-p6", type: "player", x: 180, y: 310, team: "home", label: "6" },
          { id: "sp1-p7", type: "player", x: 200, y: 370, team: "home", label: "7" },
          { id: "sp1-p11", type: "player", x: 200, y: 260, team: "home", label: "11" },
          { id: "sp1-p10", type: "player", x: 650, y: 310, team: "home", label: "10" },
          { id: "sp1-a1", type: "player", x: 937, y: 310, team: "away", label: "1" },
          { id: "sp1-a6", type: "player", x: 700, y: 310, team: "away", label: "6" },
          { id: "sp1-a7", type: "player", x: 600, y: 460, team: "away", label: "7" },
          { id: "sp1-a11", type: "player", x: 600, y: 160, team: "away", label: "11" },
          { id: "sp1-a10", type: "player", x: 400, y: 310, team: "away", label: "10" },
          { id: "sp1-ball", type: "ball", x: 90, y: 310 },
        ] },
      },
    },
    {
      kind: "scenario",
      scenario: {
        id: "sp-2", format: "5v5-1-2-1", type: "positioning", difficulty: "beginner",
        youAre: "home", attackDir: "right",
        question: "Oh no — everyone is on the same side! Move #7 to the empty side.",
        instruction: "Drag #7 to the open space on the other side of the field.",
        optimalNote: "#7 moved to the empty side. Now the team is spread out!",
        explanation: "If all your teammates are on one side, the other side is wide open. Move there! The defenders cannot cover both sides at once.",
        answer: { mode: "move", objectIds: ["sp2-p7"] },
        zones: { "sp2-p7": { x: 350, y: 400, w: 200, h: 200 } },
        relations: {},
        optimals: { "sp2-p7": { x: 450, y: 500 } },
        choices: null,
        board: { objects: [
          { id: "sp2-gk", type: "player", x: 63, y: 310, team: "home", label: "1" },
          { id: "sp2-p6", type: "player", x: 230, y: 150, team: "home", label: "6" },
          { id: "sp2-p7", type: "player", x: 350, y: 130, team: "home", label: "7" },
          { id: "sp2-p11", type: "player", x: 450, y: 160, team: "home", label: "11" },
          { id: "sp2-p10", type: "player", x: 550, y: 140, team: "home", label: "10" },
          { id: "sp2-a1", type: "player", x: 937, y: 310, team: "away", label: "1" },
          { id: "sp2-a6", type: "player", x: 700, y: 310, team: "away", label: "6" },
          { id: "sp2-a7", type: "player", x: 550, y: 200, team: "away", label: "7" },
          { id: "sp2-a11", type: "player", x: 500, y: 100, team: "away", label: "11" },
          { id: "sp2-a10", type: "player", x: 400, y: 250, team: "away", label: "10" },
          { id: "sp2-ball", type: "ball", x: 230, y: 130 },
        ] },
      },
    },
    {
      kind: "scenario",
      scenario: {
        id: "sp-3", format: "5v5-1-2-1", type: "decision", difficulty: "beginner",
        youAre: "home", attackDir: "right",
        question: "Which team is spread out better?",
        instruction: "Pick the team with better spacing.",
        optimalNote: "The spread-out team is better. They have more room to pass!",
        explanation: "A team that is spread out can pass more easily. A bunched-up team is easy to defend because one player can block everyone.",
        answer: { mode: "choice", objectId: null },
        choices: [
          { text: "The team with players far apart from each other", correct: true },
          { text: "The team with everyone standing close together", correct: false },
        ],
        board: { objects: [
          { id: "sp3-gk", type: "player", x: 63, y: 310, team: "home", label: "1" },
          { id: "sp3-p6", type: "player", x: 230, y: 310, team: "home", label: "6" },
          { id: "sp3-p7", type: "player", x: 450, y: 500, team: "home", label: "7" },
          { id: "sp3-p11", type: "player", x: 450, y: 120, team: "home", label: "11" },
          { id: "sp3-p10", type: "player", x: 650, y: 310, team: "home", label: "10" },
          { id: "sp3-a1", type: "player", x: 937, y: 310, team: "away", label: "1" },
          { id: "sp3-a6", type: "player", x: 700, y: 300, team: "away", label: "6" },
          { id: "sp3-a7", type: "player", x: 710, y: 330, team: "away", label: "7" },
          { id: "sp3-a11", type: "player", x: 690, y: 280, team: "away", label: "11" },
          { id: "sp3-a10", type: "player", x: 720, y: 310, team: "away", label: "10" },
          { id: "sp3-ball", type: "ball", x: 500, y: 310 },
        ] },
      },
    },
    {
      kind: "scenario",
      scenario: {
        id: "sp-4", format: "5v5-1-2-1", type: "positioning", difficulty: "beginner",
        youAre: "home", attackDir: "right",
        question: "#6 has the ball in the middle. Make a diamond shape around #6!",
        instruction: "Drag #7, #11, and #10 into a diamond. #7 and #11 on the sides, #10 in front.",
        optimalNote: "Nice diamond! #7 and #11 are wide, #10 is ahead. Lots of passing choices.",
        explanation: "A diamond shape means one player on each side and one in front. This gives the person with the ball three different directions to pass.",
        answer: { mode: "move", objectIds: ["sp4-p7", "sp4-p11", "sp4-p10"] },
        zones: {
          "sp4-p7": { x: 350, y: 420, w: 180, h: 180 },
          "sp4-p11": { x: 350, y: 30, w: 180, h: 180 },
          "sp4-p10": { x: 500, y: 210, w: 180, h: 200 },
        },
        relations: {
          "sp4-p7": [{ type: "oppositeSideY", relativeTo: "sp4-p11" }],
          "sp4-p11": [{ type: "oppositeSideY", relativeTo: "sp4-p7" }],
          "sp4-p10": [{ type: "mustBeAhead", relativeTo: "sp4-p6", margin: 80 }],
        },
        optimals: { "sp4-p7": { x: 440, y: 500 }, "sp4-p11": { x: 440, y: 120 }, "sp4-p10": { x: 580, y: 310 } },
        choices: null,
        board: { objects: [
          { id: "sp4-gk", type: "player", x: 63, y: 310, team: "home", label: "1" },
          { id: "sp4-p6", type: "player", x: 300, y: 310, team: "home", label: "6" },
          { id: "sp4-p7", type: "player", x: 350, y: 350, team: "home", label: "7" },
          { id: "sp4-p11", type: "player", x: 350, y: 270, team: "home", label: "11" },
          { id: "sp4-p10", type: "player", x: 400, y: 310, team: "home", label: "10" },
          { id: "sp4-a1", type: "player", x: 937, y: 310, team: "away", label: "1" },
          { id: "sp4-a6", type: "player", x: 700, y: 310, team: "away", label: "6" },
          { id: "sp4-a7", type: "player", x: 600, y: 460, team: "away", label: "7" },
          { id: "sp4-a11", type: "player", x: 600, y: 160, team: "away", label: "11" },
          { id: "sp4-a10", type: "player", x: 500, y: 310, team: "away", label: "10" },
          { id: "sp4-ball", type: "ball", x: 300, y: 290 },
        ] },
      },
    },
    {
      kind: "play",
      title: "Now try it live!",
      body: "Time to use spacing in a real game. Your wingers are set to stay wide and stretch the field. Keep the team spread out, move the ball, and find the open player. Good luck!",
      matchConfig: { format: "5v5", userRole: "rw", zoneRules: WIDE_ZONES },
    },
  ],
};
