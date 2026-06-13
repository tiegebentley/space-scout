import type { Lesson } from "@/types/lessons";

export const SEVEN_V_SEVEN_LESSONS: Lesson[] = [
  {
    id: "7v7-welcome",
    title: "Welcome to 7v7",
    description:
      "You just stepped up from 5v5. Now there are more players, a back line of two, and brand new positions called fullbacks. Let's meet your new team shape: the 2-3-1.",
    difficulty: "beginner",
    category: "positioning",
    steps: [
      {
        kind: "explain",
        title: "More Players, More Jobs",
        body:
          "In 5v5 you had a small team. In 7v7 you have seven players on the field, including the goalkeeper. That means new jobs to fill. The most common shape is the 2-3-1: a goalkeeper, two defenders in the back, three midfielders in a line, and one striker up top.",
      },
      {
        kind: "explain",
        title: "Say Hello to Fullbacks",
        body:
          "Your two back players are sometimes called fullbacks or center-backs. They are the last line in front of your goalkeeper. The three midfielders share the middle of the field. The one striker stays high and looks for goals. Everyone has a zone to protect and a place to be.",
      },
      {
        kind: "scenario",
        scenario: {
          id: "7v7-welcome-info-shape",
          format: "7v7-2-3-1",
          type: "positioning",
          difficulty: "beginner",
          youAre: "home",
          attackDir: "right",
          question: "Tap each highlighted player to learn their new 7v7 job.",
          instruction: "Meet your team. Blue attacks toward the right.",
          optimalNote: "Now you know the four kinds of players in a 2-3-1.",
          explanation:
            "Every player in 7v7 has a home zone. The back two defend, the middle three connect, and the striker leads the attack. Knowing where you belong is the first step.",
          answer: {
            mode: "info",
            objectIds: ["w-gk", "w-cb", "w-cm", "w-st"],
          },
          infoCards: {
            "w-gk": {
              title: "Goalkeeper (#1)",
              text: "Your last protector. Stays near the goal, uses hands inside the box, and talks loudly to the back two.",
            },
            "w-cb": {
              title: "Defender / Fullback (#5)",
              text: "One of your back two. Stops attackers and starts your attack with a calm pass. Stays behind the midfield.",
            },
            "w-cm": {
              title: "Central Midfielder (#6)",
              text: "The engine in the middle. Helps defend AND attack. Always wants the ball to pass it forward.",
            },
            "w-st": {
              title: "Striker (#9)",
              text: "Stays highest up the field. Hunts for goals and presses the other team's defenders.",
            },
          },
          board: {
            objects: [
              { id: "w-gk", type: "player", x: 70, y: 310, team: "home", label: "1" },
              { id: "w-cb", type: "player", x: 220, y: 200, team: "home", label: "5" },
              { id: "w-cb2", type: "player", x: 220, y: 420, team: "home", label: "3" },
              { id: "w-lm", type: "player", x: 430, y: 110, team: "home", label: "7" },
              { id: "w-cm", type: "player", x: 430, y: 310, team: "home", label: "6" },
              { id: "w-rm", type: "player", x: 430, y: 500, team: "home", label: "11" },
              { id: "w-st", type: "player", x: 700, y: 310, team: "home", label: "9" },
              { id: "ball", type: "ball", x: 430, y: 310 },
            ],
          },
        },
      },
      {
        kind: "scenario",
        scenario: {
          id: "7v7-welcome-choice-count",
          format: "7v7-2-3-1",
          type: "positioning",
          difficulty: "beginner",
          youAre: "home",
          attackDir: "right",
          question: "In a 2-3-1, how many players are in your BACK line of defenders?",
          optimalNote: "Two defenders make your back line. That is the '2' in 2-3-1.",
          explanation:
            "The numbers 2-3-1 tell you the shape from back to front: 2 defenders, 3 midfielders, 1 striker. The goalkeeper is not counted in those numbers.",
          nudge: "Look at the first number in 2-3-1.",
          answer: { mode: "choice", objectId: null },
          choices: [
            { text: "Two defenders", correct: true },
            { text: "Three defenders", correct: false },
            { text: "One defender", correct: false },
          ],
          board: {
            objects: [
              { id: "w-gk", type: "player", x: 70, y: 310, team: "home", label: "1" },
              { id: "w-cb", type: "player", x: 220, y: 200, team: "home", label: "5" },
              { id: "w-cb2", type: "player", x: 220, y: 420, team: "home", label: "3" },
              { id: "w-lm", type: "player", x: 430, y: 110, team: "home", label: "7" },
              { id: "w-cm", type: "player", x: 430, y: 310, team: "home", label: "6" },
              { id: "w-rm", type: "player", x: 430, y: 500, team: "home", label: "11" },
              { id: "w-st", type: "player", x: 700, y: 310, team: "home", label: "9" },
            ],
          },
        },
      },
      {
        kind: "scenario",
        scenario: {
          id: "7v7-welcome-choice-striker",
          format: "7v7-2-3-1",
          type: "positioning",
          difficulty: "beginner",
          youAre: "home",
          attackDir: "right",
          question: "Which player should be highest up the field, closest to the other team's goal?",
          optimalNote: "The striker #9 stays high and leads the attack.",
          explanation:
            "The striker is the tip of your shape. Staying high gives your team a target to pass to and keeps pressure on the other team's defenders.",
          nudge: "Who is the '1' in 2-3-1?",
          answer: { mode: "choice", objectId: null },
          choices: [
            { text: "The striker #9", correct: true },
            { text: "The goalkeeper #1", correct: false },
            { text: "A defender #5", correct: false },
          ],
          board: {
            objects: [
              { id: "w-gk", type: "player", x: 70, y: 310, team: "home", label: "1" },
              { id: "w-cb", type: "player", x: 220, y: 220, team: "home", label: "5" },
              { id: "w-cb2", type: "player", x: 220, y: 400, team: "home", label: "3" },
              { id: "w-cm", type: "player", x: 450, y: 310, team: "home", label: "6" },
              { id: "w-st", type: "player", x: 800, y: 310, team: "home", label: "9" },
              { id: "a-gk", type: "player", x: 935, y: 310, team: "away", label: "1" },
            ],
          },
        },
      },
    ],
  },
  {
    id: "7v7-back-two",
    title: "The Back Two",
    description:
      "Your two defenders are a team inside a team. They must stagger, cover for each other, and never both step forward at the same time. Learn how to defend in pairs.",
    difficulty: "beginner",
    category: "defending",
    steps: [
      {
        kind: "explain",
        title: "Don't Go Flat",
        body:
          "When both defenders stand in a straight line across the field, we say they are 'flat.' Flat is risky. One pass behind a flat line and an attacker is alone with your goalkeeper. Instead, the back two should stagger: one steps up to the ball, the other drops back to cover.",
      },
      {
        kind: "scenario",
        scenario: {
          id: "7v7-back-two-info-roles",
          format: "7v7-2-3-1",
          type: "defending",
          difficulty: "beginner",
          youAre: "home",
          attackDir: "right",
          question: "Tap each defender to see the two jobs in a staggered back two.",
          instruction: "The red striker has the ball on the left side.",
          optimalNote: "One presses the ball, one covers behind. That is staggering.",
          explanation:
            "When the ball is on one side, the near defender steps up to pressure it. The far defender slides in behind and toward the middle, ready to clean up if the first one is beaten.",
          answer: { mode: "info", objectIds: ["d-press", "d-cover"] },
          infoCards: {
            "d-press": {
              title: "Pressing Defender (#5)",
              text: "Nearest to the ball. Steps up to slow the attacker and force a mistake. Stays patient, doesn't dive in.",
            },
            "d-cover": {
              title: "Covering Defender (#3)",
              text: "Drops a step behind and tucks toward the middle. If #5 gets beaten, #3 is there to stop the attacker.",
            },
          },
          board: {
            objects: [
              { id: "w-gk", type: "player", x: 70, y: 310, team: "home", label: "1" },
              { id: "d-press", type: "player", x: 300, y: 180, team: "home", label: "5" },
              { id: "d-cover", type: "player", x: 200, y: 360, team: "home", label: "3" },
              { id: "a-st", type: "player", x: 420, y: 160, team: "away", label: "9" },
              { id: "a-wm", type: "player", x: 500, y: 460, team: "away", label: "11" },
              { id: "ball", type: "ball", x: 420, y: 160 },
            ],
          },
        },
      },
      {
        kind: "scenario",
        scenario: {
          id: "7v7-back-two-choice-stagger",
          format: "7v7-2-3-1",
          type: "defending",
          difficulty: "beginner",
          youAre: "home",
          attackDir: "right",
          question:
            "The red striker drives at #5 on the right. What should the other defender #3 do?",
          optimalNote: "Drop and tuck inside to cover behind #5.",
          explanation:
            "If #3 stays flat next to #5, one pass splits them both. By dropping and tucking inside, #3 protects the dangerous middle and can rescue #5 if the striker gets past.",
          nudge: "Flat lines get beaten. Where is the danger if #5 is beaten?",
          answer: { mode: "choice", objectId: null },
          choices: [
            { text: "Drop back and tuck toward the middle to cover #5", correct: true },
            { text: "Stay flat in a straight line next to #5", correct: false },
            { text: "Run forward to attack", correct: false },
          ],
          board: {
            objects: [
              { id: "w-gk", type: "player", x: 70, y: 310, team: "home", label: "1" },
              { id: "d-press", type: "player", x: 320, y: 440, team: "home", label: "5" },
              { id: "d-cover", type: "player", x: 320, y: 230, team: "home", label: "3" },
              { id: "a-st", type: "player", x: 450, y: 470, team: "away", label: "9" },
              { id: "ball", type: "ball", x: 450, y: 470 },
            ],
          },
        },
      },
      {
        kind: "scenario",
        scenario: {
          id: "7v7-back-two-choice-both",
          format: "7v7-2-3-1",
          type: "defending",
          difficulty: "intermediate",
          youAre: "home",
          attackDir: "right",
          question: "Should both defenders step up to press the ball at the same time?",
          optimalNote: "Never both at once. One presses, one always covers.",
          explanation:
            "If both defenders rush the ball, there is no one left behind. A simple pass goes into the empty space and the attacker is free. Keep one defender home at all times.",
          nudge: "Who is guarding the goal if both run out?",
          answer: { mode: "choice", objectId: null },
          choices: [
            { text: "No, one always stays back to cover", correct: true },
            { text: "Yes, two defenders win the ball faster", correct: false },
            { text: "Yes, but only on the right side", correct: false },
          ],
          board: {
            objects: [
              { id: "w-gk", type: "player", x: 70, y: 310, team: "home", label: "1" },
              { id: "d-press", type: "player", x: 330, y: 250, team: "home", label: "5" },
              { id: "d-cover", type: "player", x: 230, y: 380, team: "home", label: "3" },
              { id: "a-st", type: "player", x: 470, y: 250, team: "away", label: "9" },
              { id: "a-wm", type: "player", x: 470, y: 470, team: "away", label: "7" },
              { id: "ball", type: "ball", x: 470, y: 250 },
            ],
          },
        },
      },
    ],
  },
  {
    id: "7v7-midfield-three",
    title: "The Midfield Three",
    description:
      "Three midfielders run the middle of the field: one central pivot and two wide mids. Learn how they share the field so they never bunch up or leave gaps.",
    difficulty: "intermediate",
    category: "positioning",
    steps: [
      {
        kind: "explain",
        title: "One Middle, Two Wide",
        body:
          "Your three midfielders split the field into lanes. The central midfielder, the pivot, stays in the middle and links the defense to the attack. The two wide mids stay near the sidelines. Spreading out gives you the whole width of the field to play with.",
      },
      {
        kind: "scenario",
        scenario: {
          id: "7v7-midfield-three-info-lanes",
          format: "7v7-2-3-1",
          type: "positioning",
          difficulty: "intermediate",
          youAre: "home",
          attackDir: "right",
          question: "Tap each midfielder to learn their lane and job.",
          instruction: "Three midfielders, three lanes.",
          optimalNote: "Pivot in the middle, wide mids near the lines. Stay spread.",
          explanation:
            "When midfielders keep their lanes, the team is balanced. The pivot covers the center, and the wide mids stretch the field so passes have room.",
          answer: { mode: "info", objectIds: ["m-pivot", "m-left", "m-right"] },
          infoCards: {
            "m-pivot": {
              title: "Central Pivot (#6)",
              text: "Stays in the middle lane. Receives from the defenders and turns to start attacks. The team's connector.",
            },
            "m-left": {
              title: "Wide Mid Left (#7)",
              text: "Hugs the left sideline. Gives the team width and a passing option out wide.",
            },
            "m-right": {
              title: "Wide Mid Right (#11)",
              text: "Hugs the right sideline. Stretches the field and can run at defenders one-on-one.",
            },
          },
          board: {
            objects: [
              { id: "w-cb", type: "player", x: 220, y: 220, team: "home", label: "5" },
              { id: "w-cb2", type: "player", x: 220, y: 400, team: "home", label: "3" },
              { id: "m-left", type: "player", x: 480, y: 110, team: "home", label: "7" },
              { id: "m-pivot", type: "player", x: 450, y: 310, team: "home", label: "6" },
              { id: "m-right", type: "player", x: 480, y: 500, team: "home", label: "11" },
              { id: "w-st", type: "player", x: 720, y: 310, team: "home", label: "9" },
              { id: "ball", type: "ball", x: 450, y: 310 },
            ],
          },
        },
      },
      {
        kind: "scenario",
        scenario: {
          id: "7v7-midfield-three-choice-pivot",
          format: "7v7-2-3-1",
          type: "decision",
          difficulty: "intermediate",
          youAre: "home",
          attackDir: "right",
          question:
            "Your defender #5 has the ball and looks up. Where should the central pivot #6 be?",
          optimalNote: "Open in the middle lane, showing for the pass.",
          explanation:
            "The pivot is the bridge between defense and attack. By staying open in the middle, #6 gives #5 an easy pass forward and can then turn to start the attack.",
          nudge: "Who connects the back to the front?",
          answer: { mode: "choice", objectId: null },
          choices: [
            { text: "Open in the middle lane, asking for the pass", correct: true },
            { text: "Out wide hugging the sideline", correct: false },
            { text: "Up next to the striker", correct: false },
          ],
          board: {
            objects: [
              { id: "w-cb", type: "player", x: 250, y: 310, team: "home", label: "5" },
              { id: "m-pivot", type: "player", x: 470, y: 310, team: "home", label: "6" },
              { id: "m-left", type: "player", x: 520, y: 120, team: "home", label: "7" },
              { id: "m-right", type: "player", x: 520, y: 500, team: "home", label: "11" },
              { id: "w-st", type: "player", x: 760, y: 310, team: "home", label: "9" },
              { id: "a-st", type: "player", x: 360, y: 310, team: "away", label: "9" },
              { id: "ball", type: "ball", x: 250, y: 310 },
            ],
          },
        },
      },
      {
        kind: "scenario",
        scenario: {
          id: "7v7-midfield-three-choice-bunch",
          format: "7v7-2-3-1",
          type: "positioning",
          difficulty: "intermediate",
          youAre: "home",
          attackDir: "right",
          question:
            "All three midfielders are chasing the ball in the same spot. What is the problem?",
          optimalNote: "They are bunched up and leaving huge gaps to pass into.",
          explanation:
            "When midfielders bunch together, two big empty lanes open up. The other team just passes around your clump. Keep your spacing so you cover the whole field.",
          nudge: "Look at all the empty space on the field.",
          answer: { mode: "choice", objectId: null },
          choices: [
            { text: "They are bunched up and leave big gaps open", correct: true },
            { text: "Nothing, more players near the ball is always better", correct: false },
            { text: "They are too spread out", correct: false },
          ],
          board: {
            objects: [
              { id: "m-pivot", type: "player", x: 500, y: 300, team: "home", label: "6" },
              { id: "m-left", type: "player", x: 540, y: 340, team: "home", label: "7" },
              { id: "m-right", type: "player", x: 470, y: 350, team: "home", label: "11" },
              { id: "a-wm", type: "player", x: 600, y: 120, team: "away", label: "7" },
              { id: "a-wm2", type: "player", x: 600, y: 500, team: "away", label: "11" },
              { id: "ball", type: "ball", x: 510, y: 330 },
            ],
          },
        },
      },
    ],
  },
  {
    id: "7v7-width-fullbacks",
    title: "Width From the Fullbacks",
    description:
      "When your team attacks, the fullbacks can push up the sidelines. That width lets your wingers cut inside toward goal. Learn the give-and-take of width.",
    difficulty: "intermediate",
    category: "positioning",
    steps: [
      {
        kind: "explain",
        title: "Push Up and Stretch",
        body:
          "When your team has the ball and is safe, a fullback can run forward up the sideline. This is called overlapping. It stretches the other team and gives the player on the ball one more option. But remember: only push up when it is safe, and one defender should stay home.",
      },
      {
        kind: "scenario",
        scenario: {
          id: "7v7-width-fullbacks-choice-overlap",
          format: "7v7-2-3-1",
          type: "decision",
          difficulty: "intermediate",
          youAre: "home",
          attackDir: "right",
          question:
            "Your wide mid #7 has the ball near the sideline. Fullback #3 is behind. What helps most?",
          optimalNote: "#3 overlaps up the sideline to give an extra option.",
          explanation:
            "When the fullback runs up the outside, the defender must choose who to guard. That choice creates space. Now #7 can pass outside to #3 or cut inside on the open path.",
          nudge: "An extra runner makes the defender pick. How do you give #7 a choice?",
          answer: { mode: "choice", objectId: null },
          choices: [
            { text: "#3 overlaps up the sideline to give an extra option", correct: true },
            { text: "#3 stands still and watches", correct: false },
            { text: "#3 runs to the middle of the field", correct: false },
          ],
          board: {
            objects: [
              { id: "w-cb", type: "player", x: 250, y: 250, team: "home", label: "5" },
              { id: "m-left", type: "player", x: 600, y: 500, team: "home", label: "7" },
              { id: "w-fb", type: "player", x: 450, y: 510, team: "home", label: "3" },
              { id: "w-st", type: "player", x: 780, y: 310, team: "home", label: "9" },
              { id: "a-fb", type: "player", x: 700, y: 480, team: "away", label: "2" },
              { id: "ball", type: "ball", x: 600, y: 500 },
            ],
          },
        },
      },
      {
        kind: "scenario",
        scenario: {
          id: "7v7-width-fullbacks-info-swap",
          format: "7v7-2-3-1",
          type: "positioning",
          difficulty: "intermediate",
          youAre: "home",
          attackDir: "right",
          question: "Tap the two players to see how the fullback and winger swap spaces.",
          instruction: "The fullback gives width so the winger can come inside.",
          optimalNote: "Fullback takes the outside, winger cuts inside toward goal.",
          explanation:
            "When the fullback provides width on the sideline, the winger no longer needs to stay wide. The winger cuts inside into a dangerous shooting lane while the fullback holds the outside.",
          answer: { mode: "info", objectIds: ["w-fb", "m-right"] },
          infoCards: {
            "w-fb": {
              title: "Fullback (#2)",
              text: "Pushes high up the sideline to hold the width. This pins the other team's wide player back.",
            },
            "m-right": {
              title: "Winger (#11)",
              text: "Now free to cut inside toward goal, into space the fullback opened up. More dangerous near the middle.",
            },
          },
          board: {
            objects: [
              { id: "w-cb", type: "player", x: 250, y: 360, team: "home", label: "5" },
              { id: "m-pivot", type: "player", x: 470, y: 310, team: "home", label: "6" },
              { id: "w-fb", type: "player", x: 680, y: 510, team: "home", label: "2" },
              { id: "m-right", type: "player", x: 700, y: 360, team: "home", label: "11" },
              { id: "w-st", type: "player", x: 800, y: 250, team: "home", label: "9" },
              { id: "a-fb", type: "player", x: 770, y: 470, team: "away", label: "7" },
              { id: "ball", type: "ball", x: 470, y: 310 },
            ],
          },
        },
      },
      {
        kind: "scenario",
        scenario: {
          id: "7v7-width-fullbacks-choice-safe",
          format: "7v7-2-3-1",
          type: "decision",
          difficulty: "advanced",
          youAre: "home",
          attackDir: "right",
          question:
            "Your team just lost the ball and the red striker is running at your goal. Should the fullback push up to attack now?",
          optimalNote: "No. Get back and defend first. Push up only when it is safe.",
          explanation:
            "Width is great when you have the ball. But if you just lost it and the other team is attacking, your fullback's first job is to defend. Win the ball back, then think about pushing up.",
          nudge: "What is your team's job the moment you lose the ball?",
          answer: { mode: "choice", objectId: null },
          choices: [
            { text: "No, get back and defend first", correct: true },
            { text: "Yes, always push up for width", correct: false },
            { text: "Yes, sprint to the corner flag", correct: false },
          ],
          board: {
            objects: [
              { id: "w-gk", type: "player", x: 70, y: 310, team: "home", label: "1" },
              { id: "w-cb", type: "player", x: 250, y: 250, team: "home", label: "5" },
              { id: "w-fb", type: "player", x: 600, y: 500, team: "home", label: "3" },
              { id: "a-st", type: "player", x: 350, y: 310, team: "away", label: "9" },
              { id: "a-wm", type: "player", x: 450, y: 480, team: "away", label: "11" },
              { id: "ball", type: "ball", x: 350, y: 310 },
            ],
          },
        },
      },
    ],
  },
  {
    id: "7v7-overloads-wide",
    title: "Overloads Out Wide",
    description:
      "Two of your players against one of theirs on the sideline is a 2v1 overload. Learn how to make these and use them to beat the defense down the wing.",
    difficulty: "advanced",
    category: "decision",
    steps: [
      {
        kind: "explain",
        title: "Two Against One",
        body:
          "An overload means you have more players than the other team in one spot. The easiest place to make one is out wide. When your winger and your fullback both attack one defender, that is a 2v1. The defender cannot guard both of you, so someone is always free.",
      },
      {
        kind: "scenario",
        scenario: {
          id: "7v7-overloads-wide-info-2v1",
          format: "7v7-2-3-1",
          type: "decision",
          difficulty: "advanced",
          youAre: "home",
          attackDir: "right",
          question: "Tap your two attackers to see how a 2v1 works on the wing.",
          instruction: "Two blues, one red. The defender is outnumbered.",
          optimalNote: "Run at the defender, then pass to the free teammate.",
          explanation:
            "In a 2v1 the player with the ball runs straight at the defender. The moment the defender steps to stop the ball, the free teammate is open for a simple pass past them.",
          answer: { mode: "info", objectIds: ["o-carrier", "o-free"] },
          infoCards: {
            "o-carrier": {
              title: "Ball Carrier (#11)",
              text: "Dribbles straight at the defender to make them commit. Once the defender steps in, slide the pass.",
            },
            "o-free": {
              title: "Free Runner (#2)",
              text: "Stays a few steps away in space. When the defender steps to the ball, this player is wide open behind.",
            },
          },
          board: {
            objects: [
              { id: "o-carrier", type: "player", x: 600, y: 480, team: "home", label: "11" },
              { id: "o-free", type: "player", x: 740, y: 530, team: "home", label: "2" },
              { id: "w-st", type: "player", x: 800, y: 280, team: "home", label: "9" },
              { id: "a-def", type: "player", x: 720, y: 470, team: "away", label: "5" },
              { id: "a-cb", type: "player", x: 820, y: 310, team: "away", label: "3" },
              { id: "ball", type: "ball", x: 600, y: 480 },
            ],
          },
        },
      },
      {
        kind: "scenario",
        scenario: {
          id: "7v7-overloads-wide-choice-when",
          format: "7v7-2-3-1",
          type: "decision",
          difficulty: "advanced",
          youAre: "home",
          attackDir: "right",
          question:
            "You are dribbling in a 2v1 and the red defender steps right at the ball. What now?",
          optimalNote: "Pass to your free teammate the defender just left open.",
          explanation:
            "The whole point of a 2v1 is to make the defender choose. When they choose the ball, your teammate is free. A quick pass beats the defender without even needing a fancy move.",
          nudge: "The defender picked the ball. Who did they stop guarding?",
          answer: { mode: "choice", objectId: null },
          choices: [
            { text: "Pass to the free teammate the defender left open", correct: true },
            { text: "Dribble straight into the defender", correct: false },
            { text: "Pass backward all the way to your keeper", correct: false },
          ],
          board: {
            objects: [
              { id: "o-carrier", type: "player", x: 680, y: 470, team: "home", label: "11" },
              { id: "o-free", type: "player", x: 800, y: 520, team: "home", label: "2" },
              { id: "a-def", type: "player", x: 730, y: 460, team: "away", label: "5" },
              { id: "w-st", type: "player", x: 820, y: 300, team: "home", label: "9" },
              { id: "ball", type: "ball", x: 680, y: 470 },
            ],
          },
        },
      },
      {
        kind: "scenario",
        scenario: {
          id: "7v7-overloads-wide-choice-create",
          format: "7v7-2-3-1",
          type: "decision",
          difficulty: "advanced",
          youAre: "home",
          attackDir: "right",
          question:
            "Your winger #7 is one-on-one out wide. How can your team turn it into a 2v1?",
          optimalNote: "Send the fullback #3 forward to join the wing.",
          explanation:
            "A 1v1 is a fair fight. By sending the fullback up to join the winger, you make it two against one. Now the numbers are in your favor and the defense is in trouble.",
          nudge: "Who can run up the sideline to make it two attackers?",
          answer: { mode: "choice", objectId: null },
          choices: [
            { text: "Send the fullback #3 up to join the winger", correct: true },
            { text: "Pull everyone into the middle", correct: false },
            { text: "Tell #7 to slow down and wait", correct: false },
          ],
          board: {
            objects: [
              { id: "m-left", type: "player", x: 650, y: 480, team: "home", label: "7" },
              { id: "w-fb", type: "player", x: 400, y: 510, team: "home", label: "3" },
              { id: "m-pivot", type: "player", x: 450, y: 310, team: "home", label: "6" },
              { id: "a-def", type: "player", x: 730, y: 470, team: "away", label: "2" },
              { id: "ball", type: "ball", x: 650, y: 480 },
            ],
          },
        },
      },
    ],
  },
  {
    id: "7v7-pressing-unit",
    title: "Pressing as a Unit",
    description:
      "Pressing means chasing to win the ball back. But you cannot do it alone. The whole team squeezes together, and the striker is the one who starts it. Learn to press as one.",
    difficulty: "advanced",
    category: "defending",
    steps: [
      {
        kind: "explain",
        title: "The Striker Starts It",
        body:
          "When the other team has the ball at the back, your striker is closest. The striker runs to pressure them first. That is the trigger. The moment the striker presses, the midfield and defenders all shuffle up together to squeeze the space. Pressing alone never works. Pressing together does.",
      },
      {
        kind: "scenario",
        scenario: {
          id: "7v7-pressing-unit-info-trigger",
          format: "7v7-2-3-1",
          type: "defending",
          difficulty: "advanced",
          youAre: "home",
          attackDir: "right",
          question: "Tap the players to see how a team press is started and supported.",
          instruction: "The red defender has the ball. Time to press.",
          optimalNote: "Striker triggers, midfield steps up, the team squeezes as one.",
          explanation:
            "Pressing is a chain reaction. The striker pressures the ball, the midfielders jump to mark the nearby red players, and the back two step up so there is no space between the lines.",
          answer: { mode: "info", objectIds: ["p-striker", "p-mid", "p-back"] },
          infoCards: {
            "p-striker": {
              title: "Striker #9 — The Trigger",
              text: "Sprints at the defender on the ball to start the press. Cuts off the easy pass and forces a rushed choice.",
            },
            "p-mid": {
              title: "Midfielder #6 — The Support",
              text: "Steps up right behind the striker to mark the next pass and win any loose ball.",
            },
            "p-back": {
              title: "Defender #5 — The Squeeze",
              text: "Pushes up too, keeping the whole team compact so the red team has nowhere to play.",
            },
          },
          board: {
            objects: [
              { id: "p-striker", type: "player", x: 760, y: 310, team: "home", label: "9" },
              { id: "p-mid", type: "player", x: 560, y: 300, team: "home", label: "6" },
              { id: "p-wm", type: "player", x: 580, y: 120, team: "home", label: "7" },
              { id: "p-back", type: "player", x: 380, y: 280, team: "home", label: "5" },
              { id: "a-cb", type: "player", x: 850, y: 310, team: "away", label: "5" },
              { id: "a-mid", type: "player", x: 700, y: 150, team: "away", label: "6" },
              { id: "ball", type: "ball", x: 850, y: 310 },
            ],
          },
        },
      },
      {
        kind: "scenario",
        scenario: {
          id: "7v7-pressing-unit-choice-who",
          format: "7v7-2-3-1",
          type: "defending",
          difficulty: "advanced",
          youAre: "home",
          attackDir: "right",
          question:
            "The red defender has the ball deep in their own half. Who should press first?",
          optimalNote: "The striker #9 is closest and triggers the press.",
          explanation:
            "The striker is highest up the field, so they are nearest to the ball when the other team builds from the back. That makes the striker the natural trigger to start the team press.",
          nudge: "Who is standing closest to the red defender?",
          answer: { mode: "choice", objectId: null },
          choices: [
            { text: "The striker #9", correct: true },
            { text: "The goalkeeper #1", correct: false },
            { text: "A defender #5 from your back line", correct: false },
          ],
          board: {
            objects: [
              { id: "w-gk", type: "player", x: 70, y: 310, team: "home", label: "1" },
              { id: "p-back", type: "player", x: 350, y: 310, team: "home", label: "5" },
              { id: "p-mid", type: "player", x: 550, y: 310, team: "home", label: "6" },
              { id: "p-striker", type: "player", x: 770, y: 310, team: "home", label: "9" },
              { id: "a-cb", type: "player", x: 860, y: 310, team: "away", label: "5" },
              { id: "ball", type: "ball", x: 860, y: 310 },
            ],
          },
        },
      },
      {
        kind: "scenario",
        scenario: {
          id: "7v7-pressing-unit-choice-together",
          format: "7v7-2-3-1",
          type: "defending",
          difficulty: "advanced",
          youAre: "home",
          attackDir: "right",
          question:
            "Your striker is pressing alone while everyone else stays far back. What goes wrong?",
          optimalNote: "The press is broken. One easy pass beats the lonely striker.",
          explanation:
            "A press only works when the team moves up together. If the striker chases alone, the other team just passes around them into the huge gap behind. Squeeze up as a unit or do not press at all.",
          nudge: "Look at the big empty space behind the striker.",
          answer: { mode: "choice", objectId: null },
          choices: [
            { text: "One easy pass beats the lonely striker", correct: true },
            { text: "Nothing, one presser is enough", correct: false },
            { text: "The striker will always win the ball alone", correct: false },
          ],
          board: {
            objects: [
              { id: "p-striker", type: "player", x: 800, y: 310, team: "home", label: "9" },
              { id: "p-mid", type: "player", x: 350, y: 310, team: "home", label: "6" },
              { id: "p-back", type: "player", x: 200, y: 250, team: "home", label: "5" },
              { id: "a-cb", type: "player", x: 870, y: 310, team: "away", label: "5" },
              { id: "a-mid", type: "player", x: 620, y: 310, team: "away", label: "6" },
              { id: "ball", type: "ball", x: 870, y: 310 },
            ],
          },
        },
      },
    ],
  },
  {
    id: "7v7-transition",
    title: "Transition",
    description:
      "Transition is the split second when the ball changes teams. What all 7 players do right then decides if you score or get scored on. Learn to react fast.",
    difficulty: "advanced",
    category: "decision",
    steps: [
      {
        kind: "explain",
        title: "The Five-Second Switch",
        body:
          "Transition is the moment you win or lose the ball. When you WIN it, attack fast before the other team gets set. When you LOSE it, get back and defend right away. The best teams react in the first few seconds. Slow reactions cost goals.",
      },
      {
        kind: "scenario",
        scenario: {
          id: "7v7-transition-info-both",
          format: "7v7-2-3-1",
          type: "decision",
          difficulty: "advanced",
          youAre: "home",
          attackDir: "right",
          question: "Tap the players to see what to do the instant the ball changes hands.",
          instruction: "Two moments: winning the ball and losing the ball.",
          optimalNote: "Win it: go forward fast. Lose it: get back fast.",
          explanation:
            "Transition has two sides. The instant you win the ball, look forward and attack quickly. The instant you lose it, sprint back to defend. Reacting first is the secret.",
          answer: { mode: "info", objectIds: ["t-winner", "t-striker", "t-recover"] },
          infoCards: {
            "t-winner": {
              title: "Just Won It (#6)",
              text: "The moment you steal the ball, look up. Pass forward fast before the other team gets organized.",
            },
            "t-striker": {
              title: "Striker #9 — Go!",
              text: "When your team wins it, sprint into space behind the defense to be the fast attacking option.",
            },
            "t-recover": {
              title: "If You Lose It (#5)",
              text: "The second the ball is lost, the nearest player presses and everyone else sprints back to defend.",
            },
          },
          board: {
            objects: [
              { id: "t-winner", type: "player", x: 450, y: 310, team: "home", label: "6" },
              { id: "t-striker", type: "player", x: 720, y: 250, team: "home", label: "9" },
              { id: "t-recover", type: "player", x: 300, y: 360, team: "home", label: "5" },
              { id: "a-mid", type: "player", x: 470, y: 360, team: "away", label: "6" },
              { id: "a-st", type: "player", x: 600, y: 310, team: "away", label: "9" },
              { id: "ball", type: "ball", x: 450, y: 310 },
            ],
          },
        },
      },
      {
        kind: "scenario",
        scenario: {
          id: "7v7-transition-choice-won",
          format: "7v7-2-3-1",
          type: "decision",
          difficulty: "advanced",
          youAre: "home",
          attackDir: "right",
          question:
            "Your #6 just stole the ball in midfield and your striker is sprinting forward. What is best?",
          optimalNote: "Play the ball forward fast to the running striker.",
          explanation:
            "When you win the ball, the other team is not set up to defend yet. A fast forward pass catches them out of shape. Quick beats fancy in transition.",
          nudge: "The defense is not ready. How do you punish that fastest?",
          answer: { mode: "choice", objectId: null },
          choices: [
            { text: "Pass forward fast to the sprinting striker", correct: true },
            { text: "Slow down and pass sideways for a while", correct: false },
            { text: "Dribble back toward your own goal", correct: false },
          ],
          board: {
            objects: [
              { id: "t-winner", type: "player", x: 470, y: 310, team: "home", label: "6" },
              { id: "t-striker", type: "player", x: 740, y: 280, team: "home", label: "9" },
              { id: "a-cb", type: "player", x: 830, y: 360, team: "away", label: "5" },
              { id: "a-mid", type: "player", x: 520, y: 360, team: "away", label: "6" },
              { id: "ball", type: "ball", x: 470, y: 310 },
            ],
          },
        },
      },
      {
        kind: "scenario",
        scenario: {
          id: "7v7-transition-choice-lost",
          format: "7v7-2-3-1",
          type: "decision",
          difficulty: "advanced",
          youAre: "home",
          attackDir: "right",
          question:
            "Your team just lost the ball near the other team's goal. What should all your players do?",
          optimalNote: "Press right away or sprint back to defend as a unit.",
          explanation:
            "The moment you lose the ball you are exposed. Either win it back instantly with a quick press, or get everyone sprinting back to defend. Standing still lets the other team counter and score.",
          nudge: "You just lost it far from your goal. What protects you?",
          answer: { mode: "choice", objectId: null },
          choices: [
            { text: "Press instantly or sprint back to defend together", correct: true },
            { text: "Stand still and argue about who lost it", correct: false },
            { text: "Keep everyone forward hoping to win it back alone", correct: false },
          ],
          board: {
            objects: [
              { id: "t-recover", type: "player", x: 750, y: 310, team: "home", label: "6" },
              { id: "t-back", type: "player", x: 820, y: 200, team: "home", label: "9" },
              { id: "w-cb", type: "player", x: 300, y: 310, team: "home", label: "5" },
              { id: "a-mid", type: "player", x: 730, y: 330, team: "away", label: "6" },
              { id: "a-st", type: "player", x: 600, y: 310, team: "away", label: "9" },
              { id: "ball", type: "ball", x: 730, y: 330 },
            ],
          },
        },
      },
    ],
  },
];
