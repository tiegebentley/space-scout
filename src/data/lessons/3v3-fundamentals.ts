import type { Lesson } from "@/types/lessons";

export const THREE_V_THREE_LESSONS: Lesson[] = [
  {
    id: "3v3-magic-triangle",
    title: "The Magic Triangle",
    description:
      "Three players make a triangle, never a straight line. Meet your two teammates and learn why the triangle is your superpower.",
    difficulty: "beginner",
    category: "positioning",
    steps: [
      {
        kind: "explain",
        title: "You Are A Team Of Three",
        body:
          "In 3v3 soccer, you have two teammates. That's it — just three of you. When the three of you spread out, you make a shape called a triangle. A triangle has three points, like a slice of pizza. This shape is your magic, and we will use it in every lesson.",
      },
      {
        kind: "explain",
        title: "Never A Straight Line",
        body:
          "When all three players stand in a line, the ball can only go forward or backward. That's not many choices! But when you make a triangle, the player with the ball always has two friends to pass to. More choices means a happier, stronger team.",
      },
      {
        kind: "scenario",
        scenario: {
          id: "3v3-meet-the-team",
          format: "3v3",
          type: "positioning",
          difficulty: "beginner",
          youAre: "home",
          attackDir: "right",
          question: "Meet your team! Tap each blue player to learn their job.",
          instruction: "These three blue players make your magic triangle.",
          explanation:
            "Every teammate has a spot. When you all stay in your spots, you make a triangle and the field feels huge.",
          answer: { mode: "info", objectIds: ["t-9", "t-6", "t-11"] },
          infoCards: {
            "t-9": {
              title: "#9 The Front Player",
              text: "#9 plays nearest the other team's goal. Their job is to be ready to score!",
            },
            "t-6": {
              title: "#6 The Middle Player",
              text: "#6 plays in the middle and links everyone together. They help on defense and attack.",
            },
            "t-11": {
              title: "#11 The Wide Player",
              text: "#11 stays out near the side line to keep the field nice and wide.",
            },
          },
          board: {
            objects: [
              { id: "t-9", type: "player", team: "home", x: 760, y: 310, label: "9" },
              { id: "t-6", type: "player", team: "home", x: 420, y: 200, label: "6" },
              { id: "t-11", type: "player", team: "home", x: 480, y: 500, label: "11" },
              { id: "o-9", type: "player", team: "away", x: 600, y: 300, label: "9" },
              { id: "o-6", type: "player", team: "away", x: 800, y: 220, label: "6" },
              { id: "o-11", type: "player", team: "away", x: 820, y: 460, label: "11" },
              { id: "ball", type: "ball", x: 420, y: 200 },
            ],
          },
        },
      },
      {
        kind: "scenario",
        scenario: {
          id: "3v3-pick-the-triangle",
          format: "3v3",
          type: "positioning",
          difficulty: "beginner",
          youAre: "home",
          attackDir: "right",
          question: "Which blue shape is the magic triangle?",
          optimalNote: "Yes! Spread into a triangle so everyone can see each other.",
          explanation:
            "A triangle gives the ball two passing friends. A straight line only gives you forward or back — too few choices!",
          nudge: "Look for the shape with three points spread apart, not all in a row.",
          answer: { mode: "choice", objectId: null },
          choices: [
            { text: "The three players spread into a triangle", correct: true },
            { text: "All three players standing in a straight line", correct: false },
            { text: "All three players bunched together on the ball", correct: false },
          ],
          board: {
            objects: [
              { id: "t-9", type: "player", team: "home", x: 720, y: 310, label: "9" },
              { id: "t-6", type: "player", team: "home", x: 400, y: 180, label: "6" },
              { id: "t-11", type: "player", team: "home", x: 440, y: 470, label: "11" },
              { id: "o-9", type: "player", team: "away", x: 560, y: 310, label: "9" },
              { id: "o-6", type: "player", team: "away", x: 780, y: 240, label: "6" },
              { id: "o-11", type: "player", team: "away", x: 800, y: 420, label: "11" },
              { id: "ball", type: "ball", x: 400, y: 180 },
            ],
          },
        },
      },
      {
        kind: "scenario",
        scenario: {
          id: "3v3-fix-the-line",
          format: "3v3",
          type: "positioning",
          difficulty: "beginner",
          youAre: "home",
          attackDir: "right",
          question:
            "Your team is standing in a line. You have the ball as #6. What should your friends do?",
          optimalNote: "One moves up, one moves wide — now you have a triangle!",
          explanation:
            "When friends spread into a triangle, you can pass forward to #9 OR sideways to #11. A line gives you no good pass.",
          nudge: "A line is too flat. Tell your friends to spread out into a shape.",
          answer: { mode: "choice", objectId: null },
          choices: [
            { text: "Spread out so one is ahead and one is wide", correct: true },
            { text: "Stay in the line and wait", correct: false },
            { text: "Both run right at you to get the ball", correct: false },
          ],
          board: {
            objects: [
              { id: "t-6", type: "player", team: "home", x: 400, y: 310, label: "6" },
              { id: "t-9", type: "player", team: "home", x: 560, y: 310, label: "9" },
              { id: "t-11", type: "player", team: "home", x: 240, y: 310, label: "11" },
              { id: "o-9", type: "player", team: "away", x: 640, y: 300, label: "9" },
              { id: "o-6", type: "player", team: "away", x: 760, y: 260, label: "6" },
              { id: "o-11", type: "player", team: "away", x: 780, y: 380, label: "11" },
              { id: "ball", type: "ball", x: 400, y: 310 },
            ],
          },
        },
      },
    ],
  },
  {
    id: "3v3-make-yourself-big",
    title: "Make Yourself Big",
    description:
      "Spread out wide and far so the field feels huge. When your team is big, the other team can't guard everyone.",
    difficulty: "beginner",
    category: "positioning",
    steps: [
      {
        kind: "explain",
        title: "Make The Field Feel Huge",
        body:
          "When your team spreads out, the field feels enormous to the other team. They have to run far to reach you. When you bunch together, the field feels tiny and easy to defend. Big is good. Bunched is bad.",
      },
      {
        kind: "explain",
        title: "Width And Depth",
        body:
          "Width means spreading wide toward the side lines, like #11 does. Depth means spreading far up and back, like #9 ahead and #6 behind. Use both width and depth and the other team gets pulled in every direction.",
      },
      {
        kind: "scenario",
        scenario: {
          id: "3v3-too-bunched",
          format: "3v3",
          type: "positioning",
          difficulty: "beginner",
          youAre: "home",
          attackDir: "right",
          question:
            "All three blue players are bunched together near the ball. Is this a good idea?",
          optimalNote: "Right — bunching makes the field tiny and easy to guard.",
          explanation:
            "When you bunch up, one defender can guard all of you. Spread out so each friend needs their own defender.",
          nudge: "Count how many of you fit in one little circle. Too many!",
          answer: { mode: "choice", objectId: null },
          choices: [
            { text: "No — spread out to make the field big", correct: true },
            { text: "Yes — staying close keeps the ball safe", correct: false },
            { text: "Yes — it is easier to pass when close", correct: false },
          ],
          board: {
            objects: [
              { id: "t-6", type: "player", team: "home", x: 460, y: 300, label: "6" },
              { id: "t-9", type: "player", team: "home", x: 510, y: 340, label: "9" },
              { id: "t-11", type: "player", team: "home", x: 420, y: 350, label: "11" },
              { id: "o-9", type: "player", team: "away", x: 470, y: 320, label: "9" },
              { id: "o-6", type: "player", team: "away", x: 700, y: 300, label: "6" },
              { id: "o-11", type: "player", team: "away", x: 740, y: 400, label: "11" },
              { id: "ball", type: "ball", x: 460, y: 300 },
            ],
          },
        },
      },
      {
        kind: "scenario",
        scenario: {
          id: "3v3-use-the-width",
          format: "3v3",
          type: "positioning",
          difficulty: "beginner",
          youAre: "home",
          attackDir: "right",
          question:
            "You are #6 in the middle with the ball. Where should #11 go to make the team big?",
          optimalNote: "Out wide near the side line — that stretches the field!",
          explanation:
            "When #11 hugs the side line, the defenders must spread wide too. That opens space in the middle for you.",
          nudge: "Width means near the side line, far from the middle.",
          answer: { mode: "choice", objectId: null },
          choices: [
            { text: "Out wide near the side line", correct: true },
            { text: "Right next to you in the middle", correct: false },
            { text: "Behind you near your own goal", correct: false },
          ],
          board: {
            objects: [
              { id: "t-6", type: "player", team: "home", x: 440, y: 310, label: "6" },
              { id: "t-9", type: "player", team: "home", x: 720, y: 260, label: "9" },
              { id: "t-11", type: "player", team: "home", x: 470, y: 360, label: "11" },
              { id: "o-9", type: "player", team: "away", x: 600, y: 300, label: "9" },
              { id: "o-6", type: "player", team: "away", x: 760, y: 320, label: "6" },
              { id: "o-11", type: "player", team: "away", x: 700, y: 420, label: "11" },
              { id: "ball", type: "ball", x: 440, y: 310 },
            ],
          },
        },
      },
      {
        kind: "scenario",
        scenario: {
          id: "3v3-use-the-depth",
          format: "3v3",
          type: "positioning",
          difficulty: "beginner",
          youAre: "home",
          attackDir: "right",
          question:
            "Your team is all standing on the same line across the field. What is missing?",
          optimalNote: "Depth! Someone needs to go forward and someone stay back.",
          explanation:
            "Width spreads you side to side. Depth spreads you forward and back. Use both and you are big in every direction.",
          nudge: "You have width already. What about up and back?",
          answer: { mode: "choice", objectId: null },
          choices: [
            { text: "Depth — one player ahead and one further back", correct: true },
            { text: "Nothing — a flat line is perfect", correct: false },
            { text: "Everyone should run forward together", correct: false },
          ],
          board: {
            objects: [
              { id: "t-11", type: "player", team: "home", x: 450, y: 110, label: "11" },
              { id: "t-6", type: "player", team: "home", x: 450, y: 310, label: "6" },
              { id: "t-9", type: "player", team: "home", x: 450, y: 510, label: "9" },
              { id: "o-9", type: "player", team: "away", x: 640, y: 160, label: "9" },
              { id: "o-6", type: "player", team: "away", x: 660, y: 310, label: "6" },
              { id: "o-11", type: "player", team: "away", x: 640, y: 470, label: "11" },
              { id: "ball", type: "ball", x: 450, y: 310 },
            ],
          },
        },
      },
    ],
  },
  {
    id: "3v3-pass-and-move",
    title: "Pass And Move",
    description:
      "Never stand still after you pass! The second the ball leaves your foot, run to a new space and become a passing friend again.",
    difficulty: "beginner",
    category: "decision",
    steps: [
      {
        kind: "explain",
        title: "The Ball Is Not Glue",
        body:
          "After you pass, do not freeze like a statue. The ball is not glue — your feet should keep moving! Run to a new open space so your teammate has someone to pass back to. Pass, then move. Always.",
      },
      {
        kind: "explain",
        title: "Move Into Space",
        body:
          "Space is any empty spot on the field with no red players in it. After you pass, find that empty spot and run to it. Now your team has the magic triangle again, and the other team is chasing the ball, not you.",
      },
      {
        kind: "scenario",
        scenario: {
          id: "3v3-after-you-pass",
          format: "3v3",
          type: "decision",
          difficulty: "beginner",
          youAre: "home",
          attackDir: "right",
          question:
            "You are #11. You just passed the ball to #6. What do you do now?",
          optimalNote: "Move to a new space! Never stand and watch.",
          explanation:
            "If you stand still, a defender locks onto you. If you move, you stay open and the triangle stays alive.",
          nudge: "The ball already left your foot. Should your feet stop too?",
          answer: { mode: "choice", objectId: null },
          choices: [
            { text: "Run to a new open space right away", correct: true },
            { text: "Stand still and watch the ball", correct: false },
            { text: "Sit down and rest", correct: false },
          ],
          board: {
            objects: [
              { id: "t-11", type: "player", team: "home", x: 360, y: 480, label: "11" },
              { id: "t-6", type: "player", team: "home", x: 470, y: 300, label: "6" },
              { id: "t-9", type: "player", team: "home", x: 720, y: 260, label: "9" },
              { id: "o-9", type: "player", team: "away", x: 560, y: 320, label: "9" },
              { id: "o-6", type: "player", team: "away", x: 740, y: 300, label: "6" },
              { id: "o-11", type: "player", team: "away", x: 700, y: 440, label: "11" },
              { id: "ball", type: "ball", x: 470, y: 300 },
            ],
          },
        },
      },
      {
        kind: "scenario",
        scenario: {
          id: "3v3-where-to-run",
          format: "3v3",
          type: "decision",
          difficulty: "beginner",
          youAre: "home",
          attackDir: "right",
          question:
            "You passed and now you are moving. Which way should you run?",
          optimalNote: "Into the empty space where no red players are standing.",
          explanation:
            "Running into empty space means defenders can't reach you. Running into a crowd just gets you guarded again.",
          nudge: "Look for the spot with NO red players nearby.",
          answer: { mode: "choice", objectId: null },
          choices: [
            { text: "Into the empty space up ahead", correct: true },
            { text: "Straight into the group of red players", correct: false },
            { text: "Backward toward your own goal", correct: false },
          ],
          board: {
            objects: [
              { id: "t-6", type: "player", team: "home", x: 460, y: 310, label: "6" },
              { id: "t-9", type: "player", team: "home", x: 700, y: 470, label: "9" },
              { id: "t-11", type: "player", team: "home", x: 380, y: 460, label: "11" },
              { id: "o-9", type: "player", team: "away", x: 560, y: 320, label: "9" },
              { id: "o-6", type: "player", team: "away", x: 600, y: 360, label: "6" },
              { id: "o-11", type: "player", team: "away", x: 640, y: 300, label: "11" },
              { id: "ball", type: "ball", x: 460, y: 310 },
            ],
          },
        },
      },
      {
        kind: "scenario",
        scenario: {
          id: "3v3-keep-it-moving",
          format: "3v3",
          type: "decision",
          difficulty: "beginner",
          youAre: "home",
          attackDir: "right",
          question:
            "Your whole team passes and then everyone stands still. What happens?",
          optimalNote: "The other team catches up and guards everyone.",
          explanation:
            "Standing still lets defenders lock on. Pass AND move keeps your team one step ahead all game long.",
          nudge: "If nobody moves, how easy is it for the red team to guard you?",
          answer: { mode: "choice", objectId: null },
          choices: [
            { text: "Defenders catch up and guard everyone", correct: true },
            { text: "The team scores easily", correct: false },
            { text: "Nothing changes, it stays the same", correct: false },
          ],
          board: {
            objects: [
              { id: "t-6", type: "player", team: "home", x: 440, y: 310, label: "6" },
              { id: "t-9", type: "player", team: "home", x: 700, y: 280, label: "9" },
              { id: "t-11", type: "player", team: "home", x: 460, y: 470, label: "11" },
              { id: "o-9", type: "player", team: "away", x: 470, y: 320, label: "9" },
              { id: "o-6", type: "player", team: "away", x: 690, y: 300, label: "6" },
              { id: "o-11", type: "player", team: "away", x: 470, y: 460, label: "11" },
              { id: "ball", type: "ball", x: 440, y: 310 },
            ],
          },
        },
      },
    ],
  },
  {
    id: "3v3-support-angles",
    title: "Support Angles",
    description:
      "Give the ball-carrier TWO choices — one friend ahead and one friend square or back. Two options always beats one.",
    difficulty: "intermediate",
    category: "positioning",
    steps: [
      {
        kind: "explain",
        title: "Always Give Two Options",
        body:
          "When your teammate has the ball, your job is to help. The best help is to offer two passing choices: one friend ahead of the ball, and one friend beside or behind it. With two choices, the ball-carrier always has a way out.",
      },
      {
        kind: "explain",
        title: "Don't Hide Behind A Defender",
        body:
          "A good angle means your teammate can see you with a clear path for the ball. If a red player stands between you and the ball, you are hiding. Take one step left or right until the path is clear, then ask for the ball.",
      },
      {
        kind: "scenario",
        scenario: {
          id: "3v3-two-options",
          format: "3v3",
          type: "positioning",
          difficulty: "intermediate",
          youAre: "home",
          attackDir: "right",
          question:
            "#6 has the ball. Tap the two friends giving good support angles.",
          instruction: "One friend should be ahead, one should be square or back.",
          explanation:
            "With #9 ahead and #11 square, #6 has two clear passes. Two options means the defense can never block everything.",
          answer: { mode: "info", objectIds: ["t-9", "t-11"] },
          infoCards: {
            "t-9": {
              title: "#9 The Forward Option",
              text: "#9 is ahead of the ball with a clear path. A pass here goes toward the goal!",
            },
            "t-11": {
              title: "#11 The Square Option",
              text: "#11 is beside the ball with no red player in the way. A safe pass to keep the ball.",
            },
          },
          board: {
            objects: [
              { id: "t-6", type: "player", team: "home", x: 440, y: 310, label: "6" },
              { id: "t-9", type: "player", team: "home", x: 720, y: 240, label: "9" },
              { id: "t-11", type: "player", team: "home", x: 430, y: 500, label: "11" },
              { id: "o-9", type: "player", team: "away", x: 580, y: 320, label: "9" },
              { id: "o-6", type: "player", team: "away", x: 700, y: 360, label: "6" },
              { id: "o-11", type: "player", team: "away", x: 760, y: 200, label: "11" },
              { id: "ball", type: "ball", x: 440, y: 310 },
            ],
          },
        },
      },
      {
        kind: "scenario",
        scenario: {
          id: "3v3-clear-the-path",
          format: "3v3",
          type: "positioning",
          difficulty: "intermediate",
          youAre: "home",
          attackDir: "right",
          question:
            "You want the ball, but a red player is standing right between you and #6. What should you do?",
          optimalNote: "Step sideways so the passing path is clear!",
          explanation:
            "If a defender blocks the path, your teammate can't reach you. One step to the side opens a clean lane for the pass.",
          nudge: "Move until you can see the ball with nothing in the way.",
          answer: { mode: "choice", objectId: null },
          choices: [
            { text: "Step to the side to clear the passing path", correct: true },
            { text: "Stand still and wait behind the red player", correct: false },
            { text: "Run further away from the ball", correct: false },
          ],
          board: {
            objects: [
              { id: "t-6", type: "player", team: "home", x: 400, y: 310, label: "6" },
              { id: "t-9", type: "player", team: "home", x: 720, y: 310, label: "9" },
              { id: "t-11", type: "player", team: "home", x: 460, y: 480, label: "11" },
              { id: "o-9", type: "player", team: "away", x: 560, y: 310, label: "9" },
              { id: "o-6", type: "player", team: "away", x: 740, y: 280, label: "6" },
              { id: "o-11", type: "player", team: "away", x: 700, y: 460, label: "11" },
              { id: "ball", type: "ball", x: 400, y: 310 },
            ],
          },
        },
      },
      {
        kind: "scenario",
        scenario: {
          id: "3v3-only-one-option",
          format: "3v3",
          type: "positioning",
          difficulty: "intermediate",
          youAre: "home",
          attackDir: "right",
          question:
            "Both your friends are ahead of the ball and far away. Is this good support?",
          optimalNote: "No — #6 has no safe pass nearby if trouble comes.",
          explanation:
            "If both friends are far and forward, there's no easy out. Keep one friend close and square so the ball is always safe.",
          nudge: "What if a red player rushes the ball? Who can #6 pass to quickly?",
          answer: { mode: "choice", objectId: null },
          choices: [
            { text: "No — keep one friend close for a safe pass", correct: true },
            { text: "Yes — everyone forward is always best", correct: false },
            { text: "Yes — close passes are not allowed", correct: false },
          ],
          board: {
            objects: [
              { id: "t-6", type: "player", team: "home", x: 360, y: 310, label: "6" },
              { id: "t-9", type: "player", team: "home", x: 800, y: 220, label: "9" },
              { id: "t-11", type: "player", team: "home", x: 800, y: 440, label: "11" },
              { id: "o-9", type: "player", team: "away", x: 480, y: 320, label: "9" },
              { id: "o-6", type: "player", team: "away", x: 700, y: 300, label: "6" },
              { id: "o-11", type: "player", team: "away", x: 720, y: 440, label: "11" },
              { id: "ball", type: "ball", x: 360, y: 310 },
            ],
          },
        },
      },
    ],
  },
  {
    id: "3v3-dribble-or-pass",
    title: "Dribble Or Pass?",
    description:
      "Sometimes you take a defender on with a dribble. Sometimes you pass to a friend. Learn how to pick the smart choice.",
    difficulty: "intermediate",
    category: "decision",
    steps: [
      {
        kind: "explain",
        title: "Two Great Choices",
        body:
          "When you have the ball, you have two great tools: dribble or pass. Dribbling means beating a defender with your feet. Passing means giving the ball to a friend. Neither is wrong — you just pick the one that helps your team most right now.",
      },
      {
        kind: "explain",
        title: "Look Up First",
        body:
          "Before you decide, look up. Is a friend wide open near the goal? Pass! Is there empty space in front of you and only one defender? Dribble into it! The picture in front of you tells you the answer.",
      },
      {
        kind: "scenario",
        scenario: {
          id: "3v3-open-friend",
          format: "3v3",
          type: "decision",
          difficulty: "intermediate",
          youAre: "home",
          attackDir: "right",
          question:
            "You have the ball. #9 is wide open near the goal with no red players around. Dribble or pass?",
          optimalNote: "Pass! A wide-open friend near the goal is the smart choice.",
          explanation:
            "When a friend is open near the goal, passing is faster than dribbling and gives a great chance to score.",
          nudge: "Who is closer to scoring right now — you or the open friend?",
          answer: { mode: "choice", objectId: null },
          choices: [
            { text: "Pass to the open #9 near the goal", correct: true },
            { text: "Dribble past everyone by yourself", correct: false },
            { text: "Pass backward to your own goal", correct: false },
          ],
          board: {
            objects: [
              { id: "t-6", type: "player", team: "home", x: 520, y: 310, label: "6" },
              { id: "t-9", type: "player", team: "home", x: 800, y: 200, label: "9" },
              { id: "t-11", type: "player", team: "home", x: 480, y: 500, label: "11" },
              { id: "o-9", type: "player", team: "away", x: 600, y: 320, label: "9" },
              { id: "o-6", type: "player", team: "away", x: 700, y: 380, label: "6" },
              { id: "o-11", type: "player", team: "away", x: 680, y: 300, label: "11" },
              { id: "ball", type: "ball", x: 520, y: 310 },
            ],
          },
        },
      },
      {
        kind: "scenario",
        scenario: {
          id: "3v3-space-to-dribble",
          format: "3v3",
          type: "decision",
          difficulty: "intermediate",
          youAre: "home",
          attackDir: "right",
          question:
            "You have the ball, both friends are guarded, but there is wide-open space ahead of you. What now?",
          optimalNote: "Dribble into the open space! No pass is on, so go yourself.",
          explanation:
            "If friends are guarded and space is open, dribbling is the smart tool. Drive forward until a friend gets free.",
          nudge: "Your friends are covered. What can you do with all that empty space?",
          answer: { mode: "choice", objectId: null },
          choices: [
            { text: "Dribble forward into the open space", correct: true },
            { text: "Force a pass to a guarded friend", correct: false },
            { text: "Stop and hold the ball still", correct: false },
          ],
          board: {
            objects: [
              { id: "t-6", type: "player", team: "home", x: 420, y: 310, label: "6" },
              { id: "t-9", type: "player", team: "home", x: 740, y: 180, label: "9" },
              { id: "t-11", type: "player", team: "home", x: 740, y: 460, label: "11" },
              { id: "o-9", type: "player", team: "away", x: 760, y: 200, label: "9" },
              { id: "o-6", type: "player", team: "away", x: 760, y: 440, label: "6" },
              { id: "o-11", type: "player", team: "away", x: 500, y: 250, label: "11" },
              { id: "ball", type: "ball", x: 420, y: 310 },
            ],
          },
        },
      },
      {
        kind: "scenario",
        scenario: {
          id: "3v3-too-many-defenders",
          format: "3v3",
          type: "decision",
          difficulty: "intermediate",
          youAre: "home",
          attackDir: "right",
          question:
            "Three red players are crowding around you, but #11 is open out wide. Dribble or pass?",
          optimalNote: "Pass to #11! Don't dribble into a crowd of three.",
          explanation:
            "Dribbling into a crowd usually loses the ball. A pass to the open wide friend escapes the trouble and keeps the ball.",
          nudge: "You can't beat three players at once. Who is free?",
          answer: { mode: "choice", objectId: null },
          choices: [
            { text: "Pass out wide to the open #11", correct: true },
            { text: "Dribble through all three red players", correct: false },
            { text: "Kick it as hard as you can anywhere", correct: false },
          ],
          board: {
            objects: [
              { id: "t-6", type: "player", team: "home", x: 560, y: 310, label: "6" },
              { id: "t-9", type: "player", team: "home", x: 760, y: 280, label: "9" },
              { id: "t-11", type: "player", team: "home", x: 520, y: 510, label: "11" },
              { id: "o-9", type: "player", team: "away", x: 600, y: 280, label: "9" },
              { id: "o-6", type: "player", team: "away", x: 620, y: 350, label: "6" },
              { id: "o-11", type: "player", team: "away", x: 540, y: 340, label: "11" },
              { id: "ball", type: "ball", x: 560, y: 310 },
            ],
          },
        },
      },
    ],
  },
  {
    id: "3v3-win-it-back",
    title: "Win It Back",
    description:
      "When the other team has the ball, your three defenders work together: one presses the ball, the others cover the space.",
    difficulty: "intermediate",
    category: "defending",
    steps: [
      {
        kind: "explain",
        title: "Defending Is A Team Job",
        body:
          "When the red team has the ball, all three of you become defenders. You do not all chase the ball at once — that leaves big holes. Instead, one player presses the ball and the other two cover the dangerous space behind.",
      },
      {
        kind: "explain",
        title: "Press And Cover",
        body:
          "The closest player presses: they run to the ball to stop it moving forward. The other two cover: they stand in the spaces, ready to grab the ball if it gets passed. Press and cover, together, wins the ball back fast.",
      },
      {
        kind: "scenario",
        scenario: {
          id: "3v3-who-presses",
          format: "3v3",
          type: "defending",
          difficulty: "intermediate",
          youAre: "home",
          attackDir: "right",
          question:
            "The red team has the ball. Which blue player should press it?",
          optimalNote: "The closest player presses — no long runs needed!",
          explanation:
            "The nearest defender presses because they get there fastest. The others stay back to cover, so no gaps open up.",
          nudge: "Who can reach the ball quickest without leaving a big hole?",
          answer: { mode: "choice", objectId: null },
          choices: [
            { text: "The blue player closest to the ball", correct: true },
            { text: "The blue player farthest away", correct: false },
            { text: "All three blue players at once", correct: false },
          ],
          board: {
            objects: [
              { id: "t-6", type: "player", team: "home", x: 540, y: 310, label: "6" },
              { id: "t-9", type: "player", team: "home", x: 360, y: 200, label: "9" },
              { id: "t-11", type: "player", team: "home", x: 340, y: 440, label: "11" },
              { id: "o-9", type: "player", team: "away", x: 600, y: 300, label: "9" },
              { id: "o-6", type: "player", team: "away", x: 760, y: 260, label: "6" },
              { id: "o-11", type: "player", team: "away", x: 780, y: 420, label: "11" },
              { id: "ball", type: "ball", x: 600, y: 300 },
            ],
          },
        },
      },
      {
        kind: "scenario",
        scenario: {
          id: "3v3-dont-all-chase",
          format: "3v3",
          type: "defending",
          difficulty: "intermediate",
          youAre: "home",
          attackDir: "right",
          question:
            "All three of your defenders run at the ball at the same time. Is this smart?",
          optimalNote: "No — chasing together leaves huge open spaces behind.",
          explanation:
            "If everyone chases, the red team passes into the empty space and runs free. One presses, two cover — that's the rule.",
          nudge: "If everyone runs to the ball, who is guarding the space?",
          answer: { mode: "choice", objectId: null },
          choices: [
            { text: "No — one presses while two cover the space", correct: true },
            { text: "Yes — more chasers means winning faster", correct: false },
            { text: "Yes — defending means everyone on the ball", correct: false },
          ],
          board: {
            objects: [
              { id: "t-6", type: "player", team: "home", x: 600, y: 300, label: "6" },
              { id: "t-9", type: "player", team: "home", x: 640, y: 270, label: "9" },
              { id: "t-11", type: "player", team: "home", x: 620, y: 350, label: "11" },
              { id: "o-9", type: "player", team: "away", x: 660, y: 310, label: "9" },
              { id: "o-6", type: "player", team: "away", x: 800, y: 200, label: "6" },
              { id: "o-11", type: "player", team: "away", x: 820, y: 440, label: "11" },
              { id: "ball", type: "ball", x: 660, y: 310 },
            ],
          },
        },
      },
      {
        kind: "scenario",
        scenario: {
          id: "3v3-cover-the-space",
          format: "3v3",
          type: "defending",
          difficulty: "intermediate",
          youAre: "home",
          attackDir: "right",
          question:
            "You are not the closest defender, so a teammate is pressing the ball. What is your job?",
          optimalNote: "Cover the space behind, ready to win a pass.",
          explanation:
            "While one friend presses, you guard the open space. If the red team passes, you are right there to steal the ball.",
          nudge: "Your friend has the ball covered. What about the empty spaces?",
          answer: { mode: "choice", objectId: null },
          choices: [
            { text: "Cover the space and watch for a pass", correct: true },
            { text: "Also sprint at the ball", correct: false },
            { text: "Walk over to your own goal and wait", correct: false },
          ],
          board: {
            objects: [
              { id: "t-9", type: "player", team: "home", x: 600, y: 280, label: "9" },
              { id: "t-6", type: "player", team: "home", x: 420, y: 360, label: "6" },
              { id: "t-11", type: "player", team: "home", x: 440, y: 160, label: "11" },
              { id: "o-9", type: "player", team: "away", x: 640, y: 270, label: "9" },
              { id: "o-6", type: "player", team: "away", x: 780, y: 200, label: "6" },
              { id: "o-11", type: "player", team: "away", x: 800, y: 420, label: "11" },
              { id: "ball", type: "ball", x: 640, y: 270 },
            ],
          },
        },
      },
    ],
  },
  {
    id: "3v3-score-the-goal",
    title: "Score The Goal",
    description:
      "Time to finish! Create a 2-versus-1 overload, use the cut-back pass, and put the ball in the net.",
    difficulty: "advanced",
    category: "decision",
    steps: [
      {
        kind: "explain",
        title: "Make It Two Against One",
        body:
          "The best way to score is to make a 2-versus-1. That means two of your players against just one red defender. When you have more attackers than defenders, someone is always open. Run to make that happen near the goal.",
      },
      {
        kind: "explain",
        title: "The Cut-Back Pass",
        body:
          "When you dribble near the goal line, look back toward the middle. A teammate runs in and you pass the ball BACK to them — that's a cut-back. They get an easy shot at a wide-open goal. The cut-back is a goal machine!",
      },
      {
        kind: "scenario",
        scenario: {
          id: "3v3-meet-the-overload",
          format: "3v3",
          type: "decision",
          difficulty: "advanced",
          youAre: "home",
          attackDir: "right",
          question:
            "Tap your two attackers who make a 2-versus-1 against the last red defender.",
          instruction: "Two blue players, one red defender, near the goal.",
          explanation:
            "With #9 on the ball and #11 running alongside, one defender can't stop both. That's the 2-versus-1 that creates goals.",
          answer: { mode: "info", objectIds: ["t-9", "t-11"] },
          infoCards: {
            "t-9": {
              title: "#9 On The Ball",
              text: "#9 has the ball and pulls the defender toward them, opening space for a friend.",
            },
            "t-11": {
              title: "#11 The Free Runner",
              text: "#11 runs in fast. With the defender busy on #9, #11 is wide open for a pass and a shot!",
            },
          },
          board: {
            objects: [
              { id: "t-9", type: "player", team: "home", x: 800, y: 230, label: "9" },
              { id: "t-11", type: "player", team: "home", x: 780, y: 420, label: "11" },
              { id: "t-6", type: "player", team: "home", x: 560, y: 310, label: "6" },
              { id: "o-6", type: "player", team: "away", x: 860, y: 320, label: "6" },
              { id: "o-9", type: "player", team: "away", x: 600, y: 200, label: "9" },
              { id: "o-11", type: "player", team: "away", x: 580, y: 440, label: "11" },
              { id: "ball", type: "ball", x: 800, y: 230 },
            ],
          },
        },
      },
      {
        kind: "scenario",
        scenario: {
          id: "3v3-use-the-cutback",
          format: "3v3",
          type: "decision",
          difficulty: "advanced",
          youAre: "home",
          attackDir: "right",
          question:
            "You dribbled to the goal line as #9. #11 is racing into the middle. What is the best pass?",
          optimalNote: "The cut-back! Pass it back to #11 for an open shot.",
          explanation:
            "From the goal line, a cut-back to the middle finds a friend in front of an open net. It's the smartest scoring pass in 3v3.",
          nudge: "Look back toward the middle. Who is arriving for a shot?",
          answer: { mode: "choice", objectId: null },
          choices: [
            { text: "Cut the ball back to #11 in the middle", correct: true },
            { text: "Pass it out of bounds past the goal", correct: false },
            { text: "Keep dribbling into the corner forever", correct: false },
          ],
          board: {
            objects: [
              { id: "t-9", type: "player", team: "home", x: 900, y: 470, label: "9" },
              { id: "t-11", type: "player", team: "home", x: 800, y: 320, label: "11" },
              { id: "t-6", type: "player", team: "home", x: 620, y: 250, label: "6" },
              { id: "o-6", type: "player", team: "away", x: 880, y: 410, label: "6" },
              { id: "o-9", type: "player", team: "away", x: 700, y: 300, label: "9" },
              { id: "o-11", type: "player", team: "away", x: 660, y: 200, label: "11" },
              { id: "ball", type: "ball", x: 900, y: 470 },
            ],
          },
        },
      },
      {
        kind: "scenario",
        scenario: {
          id: "3v3-finish-the-shot",
          format: "3v3",
          type: "decision",
          difficulty: "advanced",
          youAre: "home",
          attackDir: "right",
          question:
            "You get the cut-back with the goal wide open in front of you. What do you do?",
          optimalNote: "Shoot! A calm, low shot into the open net.",
          explanation:
            "When the goal is open, take the shot right away. Keep it low and steady — you don't need to blast it, just place it in.",
          nudge: "The goal is open and you have the ball. Don't wait!",
          answer: { mode: "choice", objectId: null },
          choices: [
            { text: "Shoot calmly into the open goal", correct: true },
            { text: "Pass it backward away from goal", correct: false },
            { text: "Stop and look around for a while", correct: false },
          ],
          board: {
            objects: [
              { id: "t-11", type: "player", team: "home", x: 820, y: 320, label: "11" },
              { id: "t-9", type: "player", team: "home", x: 880, y: 470, label: "9" },
              { id: "t-6", type: "player", team: "home", x: 640, y: 240, label: "6" },
              { id: "o-6", type: "player", team: "away", x: 700, y: 360, label: "6" },
              { id: "o-9", type: "player", team: "away", x: 680, y: 220, label: "9" },
              { id: "o-11", type: "player", team: "away", x: 620, y: 460, label: "11" },
              { id: "ball", type: "ball", x: 820, y: 320 },
            ],
          },
        },
      },
    ],
  },
];
