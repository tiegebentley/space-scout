// "Meet Your 5v5 Shape" lesson — exercises the info and arrow answer modes
// (lifted from soccer-iq-lab buildMeet5v5InfoScenarios + a finding-space arrow
// scenario). Ends in a normal 5v5 match. The lab's infoCard role/pros fields are
// folded into our single `text` field.
import type { Lesson } from "@/types/lessons";

export const MEET_SHAPE_LESSON: Lesson = {
  id: "meet-5v5-shape",
  title: "Meet Your 5v5 Shape",
  description: "Learn each player's role, then put a teammate in space.",
  difficulty: "beginner",
  category: "positioning",
  steps: [
    {
      kind: "explain",
      title: "Your team of five",
      body: "Every player on a 5v5 team has a job. Tap each player to learn what they do, then you'll practice helping a teammate find space.",
    },
    {
      kind: "scenario",
      scenario: {
        id: "m2l1-info-5v5", format: "5v5-1-2-1", type: "positioning", difficulty: "beginner",
        youAre: "home", attackDir: "right",
        question: "Meet your 5v5 shape. Tap each Blue player to learn their role.",
        instruction: "Tap each highlighted player. View all 5 to continue.",
        optimalNote: "You've met the whole team!",
        explanation: "Each role has a different job — together they make a balanced team.",
        answer: { mode: "info", objectIds: ["m1-gk", "m1-6", "m1-11", "m1-7", "m1-10"] },
        infoCards: {
          "m1-gk": { title: "#1 — Goalkeeper", text: "Start the build-up, play safe passes, protect the goal. (e.g. Alisson)" },
          "m1-6": { title: "#6 — Defensive Midfielder", text: "Connector in the middle; find pockets; link defense to attack. (e.g. Rodri)" },
          "m1-11": { title: "#11 — Left Winger", text: "Stay wide left; stretch the field; combine up the side. (e.g. Vinícius)" },
          "m1-7": { title: "#7 — Right Winger", text: "Stay wide right; stretch the field; help switches. (e.g. Saka)" },
          "m1-10": { title: "#10 — Attacking Midfielder", text: "Playmaker; find the final pass or shot. (e.g. De Bruyne)" },
        },
        board: { objects: [
          { id: "m1-gk", type: "player", x: 63, y: 310, team: "home", label: "1" },
          { id: "m1-6", type: "player", x: 250, y: 310, team: "home", label: "6" },
          { id: "m1-7", type: "player", x: 250, y: 460, team: "home", label: "7" },
          { id: "m1-11", type: "player", x: 250, y: 160, team: "home", label: "11" },
          { id: "m1-10", type: "player", x: 350, y: 310, team: "home", label: "10" },
          { id: "m1-a1", type: "player", x: 937, y: 310, team: "away", label: "1" },
          { id: "m1-a6", type: "player", x: 700, y: 310, team: "away", label: "6" },
          { id: "m1-a7", type: "player", x: 570, y: 490, team: "away", label: "7" },
          { id: "m1-a11", type: "player", x: 570, y: 130, team: "away", label: "11" },
          { id: "m1-a10", type: "player", x: 520, y: 310, team: "away", label: "10" },
        ] },
      },
    },
    {
      kind: "scenario",
      scenario: {
        id: "fs-3", format: "5v5-1-2-1", type: "movement", difficulty: "beginner",
        youAre: "home", attackDir: "right",
        question: "#10 needs to find space. Draw an arrow showing where #10 should run.",
        instruction: "Drag the arrow tip to an open area away from red players.",
        optimalNote: "#10 runs into empty space where no defender can reach them.",
        explanation: "When you want the ball, run to where the defenders are NOT. Look for big empty areas and run there — your teammate will see you and pass.",
        nudges: ["Look for a gap with no red players nearby.", "The top-right area is wide open — aim there."],
        answer: { mode: "arrow", objectId: "fs3-arr" },
        zone: { x: 600, y: 150, w: 200, h: 200 },
        optimal: { x1: 600, y1: 380, x2: 700, y2: 230 },
        board: { objects: [
          { id: "fs3-gk", type: "player", x: 63, y: 310, team: "home", label: "1" },
          { id: "fs3-p6", type: "player", x: 300, y: 310, team: "home", label: "6" },
          { id: "fs3-p7", type: "player", x: 450, y: 500, team: "home", label: "7" },
          { id: "fs3-p11", type: "player", x: 400, y: 130, team: "home", label: "11" },
          { id: "fs3-p10", type: "player", x: 600, y: 380, team: "home", label: "10" },
          { id: "fs3-a1", type: "player", x: 937, y: 310, team: "away", label: "1" },
          { id: "fs3-a6", type: "player", x: 700, y: 380, team: "away", label: "6" },
          { id: "fs3-a7", type: "player", x: 600, y: 500, team: "away", label: "7" },
          { id: "fs3-a11", type: "player", x: 550, y: 160, team: "away", label: "11" },
          { id: "fs3-a10", type: "player", x: 500, y: 310, team: "away", label: "10" },
          { id: "fs3-arr", type: "arrow", x: 600, y: 380, x1: 600, y1: 380, x2: 600, y2: 380, color: "#2E6FE0", style: "run" },
          { id: "fs3-ball", type: "ball", x: 300, y: 290 },
        ] },
      },
    },
    {
      kind: "play",
      title: "Now play a game!",
      body: "You've met your team and helped #10 find space. Jump into a 5v5 and put it together.",
      matchConfig: { format: "5v5", userRole: "rw" },
    },
  ],
};
