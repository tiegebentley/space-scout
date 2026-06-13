import type { Lesson } from "@/types/lessons";

export const CB6_MODULE_LESSONS: Lesson[] = [
  {
    id: "cb6-meet-the-6",
    title: "Meet the #6",
    description:
      "You are the Anchor. You shield the defense and start every single attack. Let's meet your job and your neighbors.",
    difficulty: "beginner",
    category: "positioning",
    steps: [
      {
        kind: "explain",
        title: "You Are the Anchor",
        body:
          "The #6 is the deepest, calmest player on the field. You sit just in front of your defenders and protect the middle. When your team has the ball, every attack starts with you. When they have it, you are the first wall. Think of yourself as the steady center of the team.",
      },
      {
        kind: "explain",
        title: "Two Big Jobs",
        body:
          "Job one: shield the defense by standing in front of it. Job two: start the attack with calm, clean passes. You do not need to score. You need to keep the team safe and keep the ball moving. Simple, smart, steady.",
      },
      {
        kind: "scenario",
        scenario: {
          id: "cb6-meet-neighbors-info",
          format: "5v5-1-2-1",
          type: "positioning",
          difficulty: "beginner",
          youAre: "home",
          attackDir: "right",
          question: "Meet your team. Tap each blue player to learn who they are and how they help you.",
          instruction: "Tap the highlighted players to read about them.",
          explanation:
            "As the #6, you connect with everyone. The GK gives you the ball, the wingers #7 and #11 give you safe wide passes, and the #10 is your forward option. Knowing your neighbors helps you decide fast.",
          answer: { mode: "info", objectIds: ["gk", "w7", "w11", "ten"] },
          infoCards: {
            gk: {
              title: "#1 The Goalkeeper",
              text: "Your GK behind you. When the GK has the ball, you drop near to give an easy, safe pass. You are the GK's best friend.",
            },
            w7: {
              title: "#7 Right Winger",
              text: "Wide on the right. A safe pass out to the line. When pressed in the middle, look for #7 near the touchline.",
            },
            w11: {
              title: "#11 Left Winger",
              text: "Wide on the left. Your switch option. If the right side is crowded, you can swing the ball across to #11 in space.",
            },
            ten: {
              title: "#10 The Striker",
              text: "Your highest player up front. The forward pass when the path is open. Feeding #10 turns defense into attack fast.",
            },
          },
          board: {
            objects: [
              { id: "gk", type: "player", x: 65, y: 310, team: "home", label: "1" },
              { id: "you6", type: "player", x: 260, y: 310, team: "home", label: "6" },
              { id: "w7", type: "player", x: 470, y: 110, team: "home", label: "7" },
              { id: "w11", type: "player", x: 470, y: 510, team: "home", label: "11" },
              { id: "ten", type: "player", x: 760, y: 310, team: "home", label: "10" },
              { id: "a9", type: "player", x: 540, y: 310, team: "away", label: "9" },
              { id: "a7", type: "player", x: 700, y: 150, team: "away", label: "7" },
              { id: "a11", type: "player", x: 700, y: 470, team: "away", label: "11" },
              { id: "agk", type: "player", x: 935, y: 310, team: "away", label: "1" },
              { id: "ball", type: "ball", x: 65, y: 310 },
            ],
          },
        },
      },
      {
        kind: "scenario",
        scenario: {
          id: "cb6-meet-shield-choice",
          format: "5v5-1-2-1",
          type: "positioning",
          difficulty: "beginner",
          youAre: "home",
          attackDir: "right",
          question:
            "The other team has the ball in the middle. As the #6, where should you be?",
          instruction: "Pick the smartest spot for the Anchor.",
          optimalNote: "Yes! Sit in front of your defense and block the middle.",
          explanation:
            "Your main job without the ball is to shield. Standing in front of your defenders blocks the dangerous central path to goal and protects your back line.",
          nudge: "Remember your number-one job: protect the middle in front of your defense.",
          answer: { mode: "choice", objectId: null },
          choices: [
            { text: "In front of my own defenders, blocking the middle", correct: true },
            { text: "Up near the other team's goal", correct: false },
            { text: "Out wide on the right touchline", correct: false },
          ],
          board: {
            objects: [
              { id: "gk", type: "player", x: 65, y: 310, team: "home", label: "1" },
              { id: "you6", type: "player", x: 300, y: 310, team: "home", label: "6" },
              { id: "w7", type: "player", x: 360, y: 130, team: "home", label: "7" },
              { id: "w11", type: "player", x: 360, y: 490, team: "home", label: "11" },
              { id: "ten", type: "player", x: 620, y: 310, team: "home", label: "10" },
              { id: "a9", type: "player", x: 480, y: 310, team: "away", label: "9" },
              { id: "a10", type: "player", x: 560, y: 200, team: "away", label: "10" },
              { id: "a8", type: "player", x: 560, y: 430, team: "away", label: "8" },
              { id: "agk", type: "player", x: 935, y: 310, team: "away", label: "1" },
              { id: "ball", type: "ball", x: 480, y: 310 },
            ],
          },
        },
      },
      {
        kind: "scenario",
        scenario: {
          id: "cb6-meet-start-choice",
          format: "5v5-1-2-1",
          type: "decision",
          difficulty: "beginner",
          youAre: "home",
          attackDir: "right",
          question: "Your GK has the ball and no one is near you. What is your job now?",
          instruction: "Choose what the Anchor does.",
          optimalNote: "Right! Show for the ball and start the attack calmly.",
          explanation:
            "When your team has the ball, the #6 starts the attack. Show yourself in space so the GK has an easy, safe pass to begin building.",
          nudge: "Your second big job is starting attacks. How does an attack begin?",
          answer: { mode: "choice", objectId: null },
          choices: [
            { text: "Drop into space and show for an easy pass from the GK", correct: true },
            { text: "Sprint forward to try to score", correct: false },
            { text: "Stand still and wait by my goal", correct: false },
          ],
          board: {
            objects: [
              { id: "gk", type: "player", x: 65, y: 310, team: "home", label: "1" },
              { id: "you6", type: "player", x: 250, y: 250, team: "home", label: "6" },
              { id: "w7", type: "player", x: 450, y: 120, team: "home", label: "7" },
              { id: "w11", type: "player", x: 450, y: 500, team: "home", label: "11" },
              { id: "ten", type: "player", x: 740, y: 310, team: "home", label: "10" },
              { id: "a9", type: "player", x: 560, y: 310, team: "away", label: "9" },
              { id: "agk", type: "player", x: 935, y: 310, team: "away", label: "1" },
              { id: "ball", type: "ball", x: 65, y: 310 },
            ],
          },
        },
      },
    ],
  },
  {
    id: "cb6-drop-and-receive",
    title: "The Drop & Receive",
    description:
      "Drop into space to give your GK an easy pass, then receive on the half-turn so you face forward.",
    difficulty: "beginner",
    category: "positioning",
    steps: [
      {
        kind: "explain",
        title: "Drop Into Space",
        body:
          "When the GK or a defender has the ball, do not hide behind an opponent. Drop into a clear pocket of space where the passer can see you. An easy pass keeps your team calm and safe.",
      },
      {
        kind: "explain",
        title: "The Half-Turn",
        body:
          "Before the ball arrives, open your body so one shoulder points up the field. This is the half-turn. It lets you receive and face forward in one touch, instead of facing your own goal. Facing forward means you can see your options.",
      },
      {
        kind: "scenario",
        scenario: {
          id: "cb6-drop-pocket-choice",
          format: "5v5-1-2-1",
          type: "positioning",
          difficulty: "beginner",
          youAre: "home",
          attackDir: "right",
          question:
            "Your GK has the ball. An opponent is standing right in front of you. Where should you drop to?",
          instruction: "Find the open pocket of space.",
          optimalNote: "Great! Move sideways into space so the GK has a clear lane.",
          explanation:
            "If you stay behind an opponent, the GK cannot pass safely. Stepping into an open lane gives a clean, easy pass and starts the attack without risk.",
          nudge: "Can the GK pass through an opponent? Move where the lane is clear.",
          answer: { mode: "choice", objectId: null },
          choices: [
            { text: "Step sideways into the open space where the GK can see me", correct: true },
            { text: "Stay behind the opponent and call for the ball", correct: false },
            { text: "Run far up the field away from the GK", correct: false },
          ],
          board: {
            objects: [
              { id: "gk", type: "player", x: 65, y: 310, team: "home", label: "1" },
              { id: "you6", type: "player", x: 280, y: 310, team: "home", label: "6" },
              { id: "w7", type: "player", x: 470, y: 120, team: "home", label: "7" },
              { id: "w11", type: "player", x: 470, y: 500, team: "home", label: "11" },
              { id: "ten", type: "player", x: 760, y: 310, team: "home", label: "10" },
              { id: "a9", type: "player", x: 350, y: 310, team: "away", label: "9" },
              { id: "a7", type: "player", x: 600, y: 180, team: "away", label: "7" },
              { id: "agk", type: "player", x: 935, y: 310, team: "away", label: "1" },
              { id: "ball", type: "ball", x: 65, y: 310 },
            ],
          },
        },
      },
      {
        kind: "scenario",
        scenario: {
          id: "cb6-half-turn-choice",
          format: "5v5-1-2-1",
          type: "decision",
          difficulty: "beginner",
          youAre: "home",
          attackDir: "right",
          question:
            "The pass is coming to you and no opponent is close behind. How do you receive it?",
          instruction: "Pick the best way to take the ball.",
          optimalNote: "Yes! Open up on the half-turn and take it facing forward.",
          explanation:
            "When you have space behind you, the half-turn lets you receive facing up the field. Now you can see your wingers and striker and play forward fast.",
          nudge: "Which way should your body face so you can see the whole field?",
          answer: { mode: "choice", objectId: null },
          choices: [
            { text: "Open my body to the side and receive facing forward", correct: true },
            { text: "Take it facing my own goal", correct: false },
            { text: "Let it run past and chase it", correct: false },
          ],
          board: {
            objects: [
              { id: "gk", type: "player", x: 65, y: 310, team: "home", label: "1" },
              { id: "you6", type: "player", x: 300, y: 280, team: "home", label: "6" },
              { id: "w7", type: "player", x: 520, y: 110, team: "home", label: "7" },
              { id: "w11", type: "player", x: 520, y: 510, team: "home", label: "11" },
              { id: "ten", type: "player", x: 780, y: 310, team: "home", label: "10" },
              { id: "a9", type: "player", x: 560, y: 310, team: "away", label: "9" },
              { id: "a10", type: "player", x: 640, y: 230, team: "away", label: "10" },
              { id: "agk", type: "player", x: 935, y: 310, team: "away", label: "1" },
              { id: "ball", type: "ball", x: 120, y: 290 },
            ],
          },
        },
      },
      {
        kind: "scenario",
        scenario: {
          id: "cb6-drop-pressure-choice",
          format: "5v5-1-2-1",
          type: "decision",
          difficulty: "intermediate",
          youAre: "home",
          attackDir: "right",
          question:
            "You dropped to receive, but an opponent is tight on your back. What is the safe choice?",
          instruction: "Be smart under pressure.",
          optimalNote: "Smart! One touch back to the GK keeps the ball safe.",
          explanation:
            "When an opponent is glued to your back, turning is risky. A calm pass back to the GK keeps possession and lets your team reset and try again. Never force a turn into trouble.",
          nudge: "If turning is dangerous, who is safely behind you to pass to?",
          answer: { mode: "choice", objectId: null },
          choices: [
            { text: "Play it back to the GK with one touch", correct: true },
            { text: "Try to spin past the opponent toward goal", correct: false },
            { text: "Dribble sideways across my own box", correct: false },
          ],
          board: {
            objects: [
              { id: "gk", type: "player", x: 65, y: 310, team: "home", label: "1" },
              { id: "you6", type: "player", x: 270, y: 310, team: "home", label: "6" },
              { id: "w7", type: "player", x: 470, y: 120, team: "home", label: "7" },
              { id: "w11", type: "player", x: 470, y: 500, team: "home", label: "11" },
              { id: "ten", type: "player", x: 760, y: 310, team: "home", label: "10" },
              { id: "a9", type: "player", x: 320, y: 320, team: "away", label: "9" },
              { id: "a8", type: "player", x: 540, y: 380, team: "away", label: "8" },
              { id: "agk", type: "player", x: 935, y: 310, team: "away", label: "1" },
              { id: "ball", type: "ball", x: 270, y: 310 },
            ],
          },
        },
      },
    ],
  },
  {
    id: "cb6-scan-before",
    title: "Scan Before You Get It",
    description:
      "Check your shoulders before the ball arrives so you already know your next pass.",
    difficulty: "intermediate",
    category: "decision",
    steps: [
      {
        kind: "explain",
        title: "Eyes Up, Always",
        body:
          "The best #6s look around before the ball reaches them. A quick glance over each shoulder is called a scan. It tells you who is open and who is coming to press you. The more you scan, the smarter you play.",
      },
      {
        kind: "explain",
        title: "A Picture in Your Head",
        body:
          "Each scan paints a picture of the field in your mind. When the ball arrives, you already know where to send it. That is how you play fast without panicking. Scan, decide, then play.",
      },
      {
        kind: "scenario",
        scenario: {
          id: "cb6-scan-when-choice",
          format: "5v5-1-2-1",
          type: "decision",
          difficulty: "intermediate",
          youAre: "home",
          attackDir: "right",
          question: "When is the best time to scan over your shoulders?",
          instruction: "Choose the smartest moment.",
          optimalNote: "Exactly! Scan before the ball arrives so you are ready.",
          explanation:
            "Scanning before you receive means you already have a plan. If you wait until the ball is at your feet, the picture changes and pressure arrives before you decide.",
          nudge: "You want to know your pass already. When should you look?",
          answer: { mode: "choice", objectId: null },
          choices: [
            { text: "Just before the ball arrives, so I already know my pass", correct: true },
            { text: "Only after the ball is at my feet", correct: false },
            { text: "Never, I just kick it as soon as I get it", correct: false },
          ],
          board: {
            objects: [
              { id: "gk", type: "player", x: 65, y: 310, team: "home", label: "1" },
              { id: "you6", type: "player", x: 290, y: 300, team: "home", label: "6" },
              { id: "w7", type: "player", x: 500, y: 120, team: "home", label: "7" },
              { id: "w11", type: "player", x: 500, y: 500, team: "home", label: "11" },
              { id: "ten", type: "player", x: 770, y: 310, team: "home", label: "10" },
              { id: "a9", type: "player", x: 560, y: 310, team: "away", label: "9" },
              { id: "a7", type: "player", x: 660, y: 180, team: "away", label: "7" },
              { id: "agk", type: "player", x: 935, y: 310, team: "away", label: "1" },
              { id: "ball", type: "ball", x: 120, y: 300 },
            ],
          },
        },
      },
      {
        kind: "scenario",
        scenario: {
          id: "cb6-scan-saw-press-choice",
          format: "5v5-1-2-1",
          type: "decision",
          difficulty: "intermediate",
          youAre: "home",
          attackDir: "right",
          question:
            "Your scan showed an opponent sprinting at you from behind. The pass is coming. What is your plan?",
          instruction: "Use what your scan told you.",
          optimalNote: "Nice! Knowing the presser is coming, play it first time to a free teammate.",
          explanation:
            "Because you scanned and saw the presser, you can play a quick one-touch pass to an open teammate before the pressure even arrives. Scanning gave you the head start.",
          nudge: "You already knew the presser was coming. How do you beat the press?",
          answer: { mode: "choice", objectId: null },
          choices: [
            { text: "Play it first time to the open winger I saw", correct: true },
            { text: "Take a big touch into the presser", correct: false },
            { text: "Stop the ball and look around for the first time", correct: false },
          ],
          board: {
            objects: [
              { id: "gk", type: "player", x: 65, y: 310, team: "home", label: "1" },
              { id: "you6", type: "player", x: 300, y: 310, team: "home", label: "6" },
              { id: "w7", type: "player", x: 510, y: 110, team: "home", label: "7" },
              { id: "w11", type: "player", x: 510, y: 510, team: "home", label: "11" },
              { id: "ten", type: "player", x: 770, y: 310, team: "home", label: "10" },
              { id: "a9", type: "player", x: 400, y: 320, team: "away", label: "9" },
              { id: "a10", type: "player", x: 600, y: 250, team: "away", label: "10" },
              { id: "agk", type: "player", x: 935, y: 310, team: "away", label: "1" },
              { id: "ball", type: "ball", x: 140, y: 310 },
            ],
          },
        },
      },
      {
        kind: "scenario",
        scenario: {
          id: "cb6-scan-open-info",
          format: "5v5-1-2-1",
          type: "positioning",
          difficulty: "intermediate",
          youAre: "home",
          attackDir: "right",
          question:
            "Your scan finds three teammates. Tap each one to learn when they are the best option.",
          instruction: "Tap the highlighted teammates.",
          explanation:
            "A good scan finds many options. The winger you scan toward is safe and wide, the far winger is your switch, and the striker is the forward pass. Knowing them all means you always have a plan.",
          answer: { mode: "info", objectIds: ["w7", "w11", "ten"] },
          infoCards: {
            w7: {
              title: "#7 Near Winger",
              text: "Open and wide on your side. A safe, easy forward pass when the middle is blocked.",
            },
            w11: {
              title: "#11 Far Winger",
              text: "In space on the other side. The switch option when your side gets crowded.",
            },
            ten: {
              title: "#10 Striker",
              text: "High and central. The best pass when the lane to feet is open and clean.",
            },
          },
          board: {
            objects: [
              { id: "gk", type: "player", x: 65, y: 310, team: "home", label: "1" },
              { id: "you6", type: "player", x: 300, y: 310, team: "home", label: "6" },
              { id: "w7", type: "player", x: 520, y: 120, team: "home", label: "7" },
              { id: "w11", type: "player", x: 520, y: 500, team: "home", label: "11" },
              { id: "ten", type: "player", x: 780, y: 310, team: "home", label: "10" },
              { id: "a9", type: "player", x: 560, y: 310, team: "away", label: "9" },
              { id: "a8", type: "player", x: 660, y: 400, team: "away", label: "8" },
              { id: "agk", type: "player", x: 935, y: 310, team: "away", label: "1" },
              { id: "ball", type: "ball", x: 300, y: 310 },
            ],
          },
        },
      },
    ],
  },
  {
    id: "cb6-first-pass-out",
    title: "The First Pass Out",
    description:
      "Choose the safe forward pass when it is open, or switch the play. Never force a risky ball.",
    difficulty: "intermediate",
    category: "decision",
    steps: [
      {
        kind: "explain",
        title: "Forward When You Can",
        body:
          "Your first pass starts the attack. If a forward pass is open and clean, take it. Playing forward moves your team toward goal. But only when the lane is clear and safe.",
      },
      {
        kind: "explain",
        title: "Switch When You Must",
        body:
          "If your side is crowded with opponents, do not force it. Switch the ball to the other side where there is space. The switch finds your free winger and opens up the field. Patience is power for the #6.",
      },
      {
        kind: "scenario",
        scenario: {
          id: "cb6-forward-open-choice",
          format: "5v5-1-2-1",
          type: "decision",
          difficulty: "intermediate",
          youAre: "home",
          attackDir: "right",
          question:
            "You have the ball and the lane to your striker #10 is clean and open. What do you do?",
          instruction: "Reward the open forward pass.",
          optimalNote: "Yes! A clean lane forward to #10 is the best choice.",
          explanation:
            "When the forward lane is open, playing to your striker moves the attack ahead fast. Forward passes are the most valuable, as long as the path is safe.",
          nudge: "The path to #10 is clear. Which direction helps the attack most?",
          answer: { mode: "choice", objectId: null },
          choices: [
            { text: "Pass forward to #10 through the open lane", correct: true },
            { text: "Pass backward to the GK", correct: false },
            { text: "Dribble sideways with no plan", correct: false },
          ],
          board: {
            objects: [
              { id: "gk", type: "player", x: 65, y: 310, team: "home", label: "1" },
              { id: "you6", type: "player", x: 320, y: 310, team: "home", label: "6" },
              { id: "w7", type: "player", x: 540, y: 120, team: "home", label: "7" },
              { id: "w11", type: "player", x: 540, y: 500, team: "home", label: "11" },
              { id: "ten", type: "player", x: 780, y: 310, team: "home", label: "10" },
              { id: "a9", type: "player", x: 460, y: 180, team: "away", label: "9" },
              { id: "a8", type: "player", x: 460, y: 440, team: "away", label: "8" },
              { id: "agk", type: "player", x: 935, y: 310, team: "away", label: "1" },
              { id: "ball", type: "ball", x: 320, y: 310 },
            ],
          },
        },
      },
      {
        kind: "scenario",
        scenario: {
          id: "cb6-switch-crowded-choice",
          format: "5v5-1-2-1",
          type: "decision",
          difficulty: "intermediate",
          youAre: "home",
          attackDir: "right",
          question:
            "The right side is crowded with red defenders, but #11 is wide open on the left. What is the best pass?",
          instruction: "Find the space.",
          optimalNote: "Great vision! Switch it to the free #11 on the other side.",
          explanation:
            "When one side is packed, the switch finds open space. Sending it to #11 moves the defenders and gives your team room to attack on the free side.",
          nudge: "Where is the open space? Look at the other side of the field.",
          answer: { mode: "choice", objectId: null },
          choices: [
            { text: "Switch the ball across to the open #11", correct: true },
            { text: "Force it into the crowded right side", correct: false },
            { text: "Kick it long and hope someone gets it", correct: false },
          ],
          board: {
            objects: [
              { id: "gk", type: "player", x: 65, y: 310, team: "home", label: "1" },
              { id: "you6", type: "player", x: 320, y: 290, team: "home", label: "6" },
              { id: "w7", type: "player", x: 540, y: 130, team: "home", label: "7" },
              { id: "w11", type: "player", x: 520, y: 510, team: "home", label: "11" },
              { id: "ten", type: "player", x: 760, y: 250, team: "home", label: "10" },
              { id: "a9", type: "player", x: 500, y: 200, team: "away", label: "9" },
              { id: "a7", type: "player", x: 600, y: 150, team: "away", label: "7" },
              { id: "a8", type: "player", x: 560, y: 300, team: "away", label: "8" },
              { id: "agk", type: "player", x: 935, y: 310, team: "away", label: "1" },
              { id: "ball", type: "ball", x: 320, y: 290 },
            ],
          },
        },
      },
      {
        kind: "scenario",
        scenario: {
          id: "cb6-never-force-choice",
          format: "5v5-1-2-1",
          type: "decision",
          difficulty: "advanced",
          youAre: "home",
          attackDir: "right",
          question:
            "Every forward and wide pass is covered by red. Nothing is on. What should the calm #6 do?",
          instruction: "Do not panic.",
          optimalNote: "Perfect! When nothing is on, reset back to the GK and try again.",
          explanation:
            "A great #6 never forces a pass into trouble. If all the lanes are covered, calmly reset to the GK. Your team keeps the ball and waits for a better moment.",
          nudge: "If no pass is safe, who can you give it to and start over?",
          answer: { mode: "choice", objectId: null },
          choices: [
            { text: "Reset calmly to the GK and rebuild", correct: true },
            { text: "Blast a risky pass into traffic", correct: false },
            { text: "Dribble into two defenders", correct: false },
          ],
          board: {
            objects: [
              { id: "gk", type: "player", x: 65, y: 310, team: "home", label: "1" },
              { id: "you6", type: "player", x: 300, y: 310, team: "home", label: "6" },
              { id: "w7", type: "player", x: 500, y: 120, team: "home", label: "7" },
              { id: "w11", type: "player", x: 500, y: 500, team: "home", label: "11" },
              { id: "ten", type: "player", x: 760, y: 310, team: "home", label: "10" },
              { id: "a9", type: "player", x: 420, y: 310, team: "away", label: "9" },
              { id: "a7", type: "player", x: 560, y: 140, team: "away", label: "7" },
              { id: "a11", type: "player", x: 560, y: 480, team: "away", label: "11" },
              { id: "a10", type: "player", x: 700, y: 310, team: "away", label: "10" },
              { id: "agk", type: "player", x: 935, y: 310, team: "away", label: "1" },
              { id: "ball", type: "ball", x: 300, y: 310 },
            ],
          },
        },
      },
    ],
  },
  {
    id: "cb6-screen-the-middle",
    title: "Screen the Middle",
    description:
      "Defensively, sit in front of your defenders and block the central lane to goal.",
    difficulty: "intermediate",
    category: "defending",
    steps: [
      {
        kind: "explain",
        title: "Be the Screen",
        body:
          "A screen is a wall in front of your defense. As the #6, you stand between the ball and your defenders, blocking the straightest path to goal. You do not need to dive in. Just being there stops danger.",
      },
      {
        kind: "explain",
        title: "Protect the Middle",
        body:
          "The middle of the field, right in front of goal, is the most dangerous area. Your job is to close that central lane so the other team cannot pass through it. Push them out wide where they are less dangerous.",
      },
      {
        kind: "scenario",
        scenario: {
          id: "cb6-screen-position-choice",
          format: "5v5-1-2-1",
          type: "defending",
          difficulty: "intermediate",
          youAre: "home",
          attackDir: "right",
          question:
            "The red team is trying to pass into their #9 in the middle. Where do you stand to screen?",
          instruction: "Block the central lane.",
          optimalNote: "Yes! Stand in the passing lane between the ball and their #9.",
          explanation:
            "By standing in the central passing lane, you block the pass to their striker. The screen takes away the most dangerous option without you even making a tackle.",
          nudge: "Get between the ball and the central striker to block the pass.",
          answer: { mode: "choice", objectId: null },
          choices: [
            { text: "In the lane between the ball and their central #9", correct: true },
            { text: "Out wide chasing their winger", correct: false },
            { text: "Behind my own goalkeeper", correct: false },
          ],
          board: {
            objects: [
              { id: "gk", type: "player", x: 65, y: 310, team: "home", label: "1" },
              { id: "you6", type: "player", x: 360, y: 310, team: "home", label: "6" },
              { id: "w7", type: "player", x: 330, y: 140, team: "home", label: "7" },
              { id: "w11", type: "player", x: 330, y: 480, team: "home", label: "11" },
              { id: "ten", type: "player", x: 600, y: 310, team: "home", label: "10" },
              { id: "a9", type: "player", x: 250, y: 310, team: "away", label: "9" },
              { id: "a10", type: "player", x: 500, y: 310, team: "away", label: "10" },
              { id: "a7", type: "player", x: 470, y: 160, team: "away", label: "7" },
              { id: "agk", type: "player", x: 935, y: 310, team: "away", label: "1" },
              { id: "ball", type: "ball", x: 250, y: 310 },
            ],
          },
        },
      },
      {
        kind: "scenario",
        scenario: {
          id: "cb6-screen-patient-choice",
          format: "5v5-1-2-1",
          type: "defending",
          difficulty: "intermediate",
          youAre: "home",
          attackDir: "right",
          question:
            "Their #10 has the ball in the middle but is not running at you yet. What should you do?",
          instruction: "Stay smart, stay patient.",
          optimalNote: "Right! Stay on your feet and keep screening the middle.",
          explanation:
            "If you dive in too early, the attacker dribbles past and your defense is open. Stay patient on your feet, keep the central lane blocked, and force them sideways.",
          nudge: "Diving in opens the door behind you. What keeps the middle safe?",
          answer: { mode: "choice", objectId: null },
          choices: [
            { text: "Stay on my feet and keep blocking the middle", correct: true },
            { text: "Rush in and dive at the ball", correct: false },
            { text: "Turn my back and run to goal", correct: false },
          ],
          board: {
            objects: [
              { id: "gk", type: "player", x: 65, y: 310, team: "home", label: "1" },
              { id: "you6", type: "player", x: 380, y: 310, team: "home", label: "6" },
              { id: "w7", type: "player", x: 350, y: 150, team: "home", label: "7" },
              { id: "w11", type: "player", x: 350, y: 470, team: "home", label: "11" },
              { id: "ten", type: "player", x: 620, y: 310, team: "home", label: "10" },
              { id: "a10", type: "player", x: 500, y: 310, team: "away", label: "10" },
              { id: "a9", type: "player", x: 300, y: 220, team: "away", label: "9" },
              { id: "a8", type: "player", x: 560, y: 420, team: "away", label: "8" },
              { id: "agk", type: "player", x: 935, y: 310, team: "away", label: "1" },
              { id: "ball", type: "ball", x: 500, y: 310 },
            ],
          },
        },
      },
      {
        kind: "scenario",
        scenario: {
          id: "cb6-screen-force-wide-choice",
          format: "5v5-1-2-1",
          type: "defending",
          difficulty: "advanced",
          youAre: "home",
          attackDir: "right",
          question:
            "An attacker is dribbling toward the middle. Your screen is set. How do you steer them?",
          instruction: "Push danger away from goal.",
          optimalNote: "Smart! Show them outside and steer them away from the middle.",
          explanation:
            "By angling your body, you can guide the attacker toward the sideline and away from the dangerous middle. Out wide, they have fewer options and your defense is safer.",
          nudge: "The middle is dangerous. Which way do you want to push them?",
          answer: { mode: "choice", objectId: null },
          choices: [
            { text: "Angle my body to push them out wide, away from the middle", correct: true },
            { text: "Let them go straight through the center", correct: false },
            { text: "Step aside and watch", correct: false },
          ],
          board: {
            objects: [
              { id: "gk", type: "player", x: 65, y: 310, team: "home", label: "1" },
              { id: "you6", type: "player", x: 400, y: 310, team: "home", label: "6" },
              { id: "w7", type: "player", x: 360, y: 150, team: "home", label: "7" },
              { id: "w11", type: "player", x: 360, y: 470, team: "home", label: "11" },
              { id: "ten", type: "player", x: 640, y: 310, team: "home", label: "10" },
              { id: "a9", type: "player", x: 520, y: 290, team: "away", label: "9" },
              { id: "a7", type: "player", x: 640, y: 160, team: "away", label: "7" },
              { id: "agk", type: "player", x: 935, y: 310, team: "away", label: "1" },
              { id: "ball", type: "ball", x: 520, y: 290 },
            ],
          },
        },
      },
    ],
  },
  {
    id: "cb6-win-it-restart",
    title: "Win It & Restart",
    description:
      "Intercept or tackle, then immediately become the calm first pass again.",
    difficulty: "advanced",
    category: "defending",
    steps: [
      {
        kind: "explain",
        title: "Win the Ball Cleanly",
        body:
          "When the moment is right, step in to intercept a lazy pass or make a clean tackle. Time it well so you do not dive past the ball. Winning it back makes you a hero for your team.",
      },
      {
        kind: "explain",
        title: "Stay Calm After Winning",
        body:
          "The second you win the ball, do not just boot it away. Take a breath, look up, and become the calm first pass again. Winning it back is only half the job. Keeping it is the other half.",
      },
      {
        kind: "scenario",
        scenario: {
          id: "cb6-intercept-choice",
          format: "5v5-1-2-1",
          type: "defending",
          difficulty: "advanced",
          youAre: "home",
          attackDir: "right",
          question:
            "You read a slow, floaty pass heading toward their striker. What do you do?",
          instruction: "Trust what you read.",
          optimalNote: "Yes! Step in and intercept the slow pass.",
          explanation:
            "A good #6 reads passes early. Stepping in to intercept a slow ball wins possession before the striker even touches it. Reading the game beats chasing it.",
          nudge: "The pass is slow. Can you get there first?",
          answer: { mode: "choice", objectId: null },
          choices: [
            { text: "Step in and intercept the pass", correct: true },
            { text: "Wait and let the striker control it first", correct: false },
            { text: "Run back to my own goal", correct: false },
          ],
          board: {
            objects: [
              { id: "gk", type: "player", x: 65, y: 310, team: "home", label: "1" },
              { id: "you6", type: "player", x: 420, y: 300, team: "home", label: "6" },
              { id: "w7", type: "player", x: 380, y: 140, team: "home", label: "7" },
              { id: "w11", type: "player", x: 380, y: 480, team: "home", label: "11" },
              { id: "ten", type: "player", x: 660, y: 310, team: "home", label: "10" },
              { id: "a9", type: "player", x: 540, y: 300, team: "away", label: "9" },
              { id: "a8", type: "player", x: 300, y: 300, team: "away", label: "8" },
              { id: "agk", type: "player", x: 935, y: 310, team: "away", label: "1" },
              { id: "ball", type: "ball", x: 430, y: 300 },
            ],
          },
        },
      },
      {
        kind: "scenario",
        scenario: {
          id: "cb6-after-win-choice",
          format: "5v5-1-2-1",
          type: "decision",
          difficulty: "advanced",
          youAre: "home",
          attackDir: "right",
          question:
            "You just won the ball. A teammate is open nearby. What is the smart restart?",
          instruction: "Become the first pass again.",
          optimalNote: "Great! Calm pass to the open teammate keeps possession.",
          explanation:
            "After winning the ball, the calm pass to an open teammate keeps it for your team and starts a new attack. Booting it away just gives it back to the other team.",
          nudge: "Winning it is half the job. How do you keep it?",
          answer: { mode: "choice", objectId: null },
          choices: [
            { text: "Make a calm pass to the open teammate", correct: true },
            { text: "Boot it as far as I can with no target", correct: false },
            { text: "Dribble into the nearest opponent", correct: false },
          ],
          board: {
            objects: [
              { id: "gk", type: "player", x: 65, y: 310, team: "home", label: "1" },
              { id: "you6", type: "player", x: 360, y: 310, team: "home", label: "6" },
              { id: "w7", type: "player", x: 520, y: 130, team: "home", label: "7" },
              { id: "w11", type: "player", x: 520, y: 500, team: "home", label: "11" },
              { id: "ten", type: "player", x: 760, y: 310, team: "home", label: "10" },
              { id: "a9", type: "player", x: 450, y: 360, team: "away", label: "9" },
              { id: "a8", type: "player", x: 600, y: 250, team: "away", label: "8" },
              { id: "agk", type: "player", x: 935, y: 310, team: "away", label: "1" },
              { id: "ball", type: "ball", x: 360, y: 310 },
            ],
          },
        },
      },
      {
        kind: "scenario",
        scenario: {
          id: "cb6-win-timing-choice",
          format: "5v5-1-2-1",
          type: "defending",
          difficulty: "advanced",
          youAre: "home",
          attackDir: "right",
          question:
            "Their attacker has the ball under tight control with their body in the way. Should you tackle now?",
          instruction: "Pick the right moment.",
          optimalNote: "Wise! Wait for a heavy touch, then win it cleanly.",
          explanation:
            "Tackling when the attacker is in full control often gives away a foul or gets you beaten. Wait for a heavy touch when the ball is away from them, then step in clean.",
          nudge: "When the ball is glued to their feet, is that the best time to dive in?",
          answer: { mode: "choice", objectId: null },
          choices: [
            { text: "Wait for a heavy touch, then win it cleanly", correct: true },
            { text: "Dive in right now and hope", correct: false },
            { text: "Grab their shirt to stop them", correct: false },
          ],
          board: {
            objects: [
              { id: "gk", type: "player", x: 65, y: 310, team: "home", label: "1" },
              { id: "you6", type: "player", x: 400, y: 310, team: "home", label: "6" },
              { id: "w7", type: "player", x: 360, y: 150, team: "home", label: "7" },
              { id: "w11", type: "player", x: 360, y: 470, team: "home", label: "11" },
              { id: "ten", type: "player", x: 640, y: 310, team: "home", label: "10" },
              { id: "a9", type: "player", x: 500, y: 320, team: "away", label: "9" },
              { id: "a10", type: "player", x: 620, y: 230, team: "away", label: "10" },
              { id: "agk", type: "player", x: 935, y: 310, team: "away", label: "1" },
              { id: "ball", type: "ball", x: 490, y: 330 },
            ],
          },
        },
      },
    ],
  },
  {
    id: "cb6-be-the-pivot",
    title: "Be the Pivot",
    description:
      "Connect both wings, recycle possession, and dictate the tempo as the team's pivot.",
    difficulty: "advanced",
    category: "decision",
    steps: [
      {
        kind: "explain",
        title: "The Pivot Connects Everyone",
        body:
          "A pivot is the player the whole team turns around. As the #6, you link the left and the right, the back and the front. The ball comes to you, and you send it where there is space. You are the hub of the wheel.",
      },
      {
        kind: "explain",
        title: "Dictate the Tempo",
        body:
          "Sometimes the team needs to slow down and keep the ball calm. Sometimes it needs to speed up and attack. The pivot decides the tempo. Slow when you need to settle, fast when you spot a chance.",
      },
      {
        kind: "scenario",
        scenario: {
          id: "cb6-pivot-connect-choice",
          format: "5v5-1-2-1",
          type: "decision",
          difficulty: "advanced",
          youAre: "home",
          attackDir: "right",
          question:
            "The ball came to you from the right side. The left side #11 has acres of space. What is the pivot move?",
          instruction: "Use both wings.",
          optimalNote: "Yes! Swing it to the open left to connect both sides.",
          explanation:
            "As the pivot, you receive on one side and send the ball to the other. Switching to the open #11 connects both wings and keeps the other team chasing.",
          nudge: "A pivot links left and right. Where is the open space?",
          answer: { mode: "choice", objectId: null },
          choices: [
            { text: "Switch the ball to the open #11 on the left", correct: true },
            { text: "Send it straight back where it came from into pressure", correct: false },
            { text: "Hold it forever until I am tackled", correct: false },
          ],
          board: {
            objects: [
              { id: "gk", type: "player", x: 65, y: 310, team: "home", label: "1" },
              { id: "you6", type: "player", x: 360, y: 300, team: "home", label: "6" },
              { id: "w7", type: "player", x: 540, y: 130, team: "home", label: "7" },
              { id: "w11", type: "player", x: 520, y: 500, team: "home", label: "11" },
              { id: "ten", type: "player", x: 760, y: 280, team: "home", label: "10" },
              { id: "a7", type: "player", x: 600, y: 160, team: "away", label: "7" },
              { id: "a9", type: "player", x: 480, y: 250, team: "away", label: "9" },
              { id: "a8", type: "player", x: 560, y: 320, team: "away", label: "8" },
              { id: "agk", type: "player", x: 935, y: 310, team: "away", label: "1" },
              { id: "ball", type: "ball", x: 360, y: 300 },
            ],
          },
        },
      },
      {
        kind: "scenario",
        scenario: {
          id: "cb6-pivot-recycle-choice",
          format: "5v5-1-2-1",
          type: "decision",
          difficulty: "advanced",
          youAre: "home",
          attackDir: "right",
          question:
            "The attack got stuck and there is no forward pass. The team needs to settle. What does the pivot do?",
          instruction: "Recycle and reset the tempo.",
          optimalNote: "Calm and smart! Recycle the ball to keep possession and reset.",
          explanation:
            "When the attack stalls, the pivot recycles the ball back and around to keep possession. This settles the team and waits for a new gap to open. Patience controls the game.",
          nudge: "No forward pass is on. How do you keep the ball and reset?",
          answer: { mode: "choice", objectId: null },
          choices: [
            { text: "Recycle the ball back and around to reset the attack", correct: true },
            { text: "Force a long ball into a crowd", correct: false },
            { text: "Give up and let them take it", correct: false },
          ],
          board: {
            objects: [
              { id: "gk", type: "player", x: 65, y: 310, team: "home", label: "1" },
              { id: "you6", type: "player", x: 380, y: 310, team: "home", label: "6" },
              { id: "w7", type: "player", x: 560, y: 130, team: "home", label: "7" },
              { id: "w11", type: "player", x: 560, y: 490, team: "home", label: "11" },
              { id: "ten", type: "player", x: 780, y: 310, team: "home", label: "10" },
              { id: "a9", type: "player", x: 500, y: 310, team: "away", label: "9" },
              { id: "a7", type: "player", x: 640, y: 160, team: "away", label: "7" },
              { id: "a11", type: "player", x: 640, y: 460, team: "away", label: "11" },
              { id: "a10", type: "player", x: 720, y: 310, team: "away", label: "10" },
              { id: "agk", type: "player", x: 935, y: 310, team: "away", label: "1" },
              { id: "ball", type: "ball", x: 380, y: 310 },
            ],
          },
        },
      },
      {
        kind: "scenario",
        scenario: {
          id: "cb6-pivot-tempo-choice",
          format: "5v5-1-2-1",
          type: "decision",
          difficulty: "advanced",
          youAre: "home",
          attackDir: "right",
          question:
            "You spot the other team out of shape with a big gap in the middle. What tempo does the pivot pick now?",
          instruction: "Read the moment.",
          optimalNote: "Sharp! Speed it up and play forward fast through the gap.",
          explanation:
            "A great pivot reads the moment. When the other team is out of shape, you speed up and play forward quickly through the gap before they recover. Tempo wins games.",
          nudge: "They are out of shape with a gap. Is this a moment to slow down or speed up?",
          answer: { mode: "choice", objectId: null },
          choices: [
            { text: "Speed up and play forward fast through the gap", correct: true },
            { text: "Slow it down and pass sideways for no reason", correct: false },
            { text: "Stop and wait for them to get organized", correct: false },
          ],
          board: {
            objects: [
              { id: "gk", type: "player", x: 65, y: 310, team: "home", label: "1" },
              { id: "you6", type: "player", x: 380, y: 310, team: "home", label: "6" },
              { id: "w7", type: "player", x: 560, y: 130, team: "home", label: "7" },
              { id: "w11", type: "player", x: 560, y: 490, team: "home", label: "11" },
              { id: "ten", type: "player", x: 770, y: 310, team: "home", label: "10" },
              { id: "a9", type: "player", x: 520, y: 150, team: "away", label: "9" },
              { id: "a7", type: "player", x: 640, y: 100, team: "away", label: "7" },
              { id: "a11", type: "player", x: 600, y: 500, team: "away", label: "11" },
              { id: "agk", type: "player", x: 935, y: 310, team: "away", label: "1" },
              { id: "ball", type: "ball", x: 380, y: 310 },
            ],
          },
        },
      },
    ],
  },
];
