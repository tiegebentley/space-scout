// PILOT COURSE — Lesson 1: "Playing Out of the Back" (5v5)
// Four steps, building from understanding → focus → guided receive → free game:
//   1. info scenario   — meet the 5v5 positions & roles (tap each blue player)
//   2. move scenario   — on a #11 corner throw-in, drag the #6 into the open
//                          pocket where it can receive (graded: #6 in target zone)
//   3. live-scenario    — #6 shows for a throw-in and receives in a safe zone,
//                          playing around the press (objective: receiveInZone/hold)
//   4. play            — free 5v5 controlling the #6, applying the same idea
//
// Authored in the in-app lesson editor and baked in here as the baseline (see the
// project's author flow: edits made in the app save to a personal copy under
// "Your Lessons" and reopen on the same edit URL — this file is the shipped
// starting point those copies fork from).
//
// Coordinate spaces (two different ones — don't mix them up):
//   • Static `scenario` boards use LAB coords: 1000×620, blue = "home" on the
//     LEFT attacking RIGHT (attackDir).
//   • Live `live-scenario` / `play` use ENGINE coords: W=900 × H=650, and "us"
//     (blue) attacks UP toward the TOP — so OUR half / build-up area is the
//     BOTTOM (high y). The throw-in receive zone sits in our bottom-middle.
import type { Lesson } from "@/types/lessons";
import { W, H } from "@/engine/constants";

// Where the #6 should show to receive the throw-in: central, in our own
// (bottom) half, a little in from the touchline traffic. Engine coords.
const RECEIVE_ZONE = { x: W / 2 - 150, y: H * 0.55, w: 300, h: H * 0.3 };

export const PLAYING_OUT_BACK_LESSON: Lesson = {
  id: "playing-out-of-the-back",
  title: "Playing Out of the Back",
  description:
    "Learn the 5v5 positions, then master the #6 — showing for the throw-in and playing around pressure to build from the back.",
  difficulty: "beginner",
  category: "positioning",
  steps: [
    // ── STEP 1 — Positions & roles (tap-to-learn) ──────────────────────────
    {
      kind: "scenario",
      scenario: {
        id: "pob-roles-5v5",
        format: "5v5-1-2-1",
        type: "positioning",
        difficulty: "beginner",
        youAre: "home",
        attackDir: "right",
        question: "Meet your 5v5 team. Tap each Blue player to learn their job.",
        instruction: "Tap each highlighted player. View all 5 to continue.",
        optimalNote: "That's your whole team — now let's zoom in on the #6.",
        explanation:
          "Five jobs, one team. The keeper starts the build-up, the #6 connects everything in the middle, the wingers stretch the field wide, and the #10 makes things happen up top. To play out of the back you lean on the goalkeeper and the #6.",
        answer: {
          mode: "info",
          objectIds: ["pob-gk", "pob-6", "pob-7", "pob-11", "pob-10"],
        },
        infoCards: {
          "pob-gk": {
            title: "#1 — Goalkeeper",
            text: "Starts the build-up. Stays calm, plays safe short passes, and is always an option to recycle the ball back to. (e.g. Alisson)",
          },
          "pob-6": {
            title: "#6 — Holding Midfielder",
            text: "The connector. Drops in to receive from restarts, finds pockets of space between opponents, and links the defense to the attack. This whole lesson is about YOU. (e.g. Rodri)",
          },
          "pob-11": {
            title: "#11 — Left Winger",
            text: "Stays wide on the left touchline to stretch the field and give the #6 a forward passing option up the side. (e.g. Vinícius)",
          },
          "pob-7": {
            title: "#7 — Right Winger",
            text: "Stays wide on the right touchline, stretching the field the other way and offering a switch of play. (e.g. Saka)",
          },
          "pob-10": {
            title: "#10 — Attacking Midfielder",
            text: "The playmaker up top. Finds pockets between the opponent's lines, pins their last defender, and looks for the final pass or shot. (e.g. De Bruyne)",
          },
        },
        board: {
          objects: [
            // Blue (home) — building out from the left, attacking right.
            { id: "pob-gk", type: "player", x: 70, y: 310, team: "home", label: "1" },
            { id: "pob-6", type: "player", x: 250, y: 310, team: "home", label: "6" },
            { id: "pob-7", type: "player", x: 300, y: 470, team: "home", label: "7" },
            { id: "pob-11", type: "player", x: 300, y: 150, team: "home", label: "11" },
            { id: "pob-10", type: "player", x: 430, y: 310, team: "home", label: "10" },
            // Red (away) — defending toward the right goal.
            { id: "pob-a1", type: "player", x: 930, y: 310, team: "away", label: "1" },
            { id: "pob-a6", type: "player", x: 680, y: 310, team: "away", label: "6" },
            { id: "pob-a7", type: "player", x: 560, y: 480, team: "away", label: "7" },
            { id: "pob-a11", type: "player", x: 560, y: 140, team: "away", label: "11" },
            { id: "pob-a9", type: "player", x: 500, y: 310, team: "away", label: "9" },
          ],
        },
      },
    },

    // ── STEP 2 — Drag the #6 into the open pocket on a #11 throw-in (move) ──
    {
      kind: "scenario",
      scenario: {
        id: "pob-6-shows-arrow",
        format: "5v5-1-2-1",
        type: "movement",
        difficulty: "beginner",
        youAre: "home",
        attackDir: "right",
        question: "Your #11 has a throw-in on the right. Where should the #6 move to receive?",
        instruction: "Drag the #6 to an open pocket where the #11 can throw to you.",
        optimalNote:
          "The #6 steps INTO the field, into the open space just inside the #11 — short, central, and away from the red marker. That gives the thrower an easy, safe angle.",
        explanation:
          "On a throw-in you can't be offside, so show SHORT and ANGLED. The #6 doesn't run away up the line — it steps inside into the open pocket so the #11 has a simple pass into feet. Stay off the touchline (no room to turn there) and away from the nearest red player so you can receive and play forward.",
        nudges: [
          "Don't run up the line — show short, into the middle.",
          "Find the open space just inside the #11, away from the red player near you.",
        ],
        answer: { mode: "move", objectIds: ["pob2-6"] },
        // Target pocket: the open space just infield of the #11's corner throw-in.
        zones: { "pob2-6": { x: 66, y: 46, w: 213, h: 159 } },
        optimals: { "pob2-6": { x: 210, y: 310 } },
        board: {
          objects: [
            // Blue (home) — #11 in the right corner taking the throw-in.
            { id: "pob2-gk", type: "player", x: 70, y: 310, team: "home", label: "1" },
            { id: "pob2-6", type: "player", x: 209.54467328345902, y: 310, team: "home", label: "6" },
            { id: "pob2-7", type: "player", x: 360, y: 520, team: "home", label: "7" },
            { id: "pob2-11", type: "player", x: 452.2304804174198, y: 16.730128696986608, team: "home", label: "11" },
            { id: "pob2-10", type: "player", x: 520, y: 300, team: "home", label: "10" },
            // Red (away) — one presser near the #6, rest holding shape.
            { id: "pob2-a6", type: "player", x: 330, y: 360, team: "away", label: "6" },
            { id: "pob2-a7", type: "player", x: 520, y: 470, team: "away", label: "7" },
            { id: "pob2-a11", type: "player", x: 470, y: 150, team: "away", label: "11" },
            { id: "pob2-a10", type: "player", x: 600, y: 300, team: "away", label: "10" },
            // The ball is in the #11's hands in the corner (throw-in).
            { id: "pob2-ball", type: "ball", x: 420.6616250430145, y: 16.730128696986608 },
          ],
        },
      },
    },

    // ── STEP 3 — Guided scenario: #6 receives & plays around pressure ──────
    {
      kind: "live-scenario",
      title: "Show for the throw-in",
      body:
        "It's a throw-in in your own half. You're the #6 (blue). Step into the open space in the middle and receive the ball there — show for it, get on the ball, and beat the press. Receive in the highlighted area to complete it.",
      matchConfig: { format: "5v5", userRole: "hold", oppTacticId: "possession", duration: 180000, aiDifficulty: "medium", zoneRules: [] },
      // Rep-based drill: open on a blue throw-in, auto-reset every 15s, and run
      // reps until the #6 has received in the zone 4 times.
      scenarioSetup: { forcedRestart: "throwin", restartTeam: "us", repSeconds: 15, restartDelaySec: 5 },
      objective: {
        type: "receiveInZone",
        label: "#6 receives in the zone",
        role: "hold",
        zone: RECEIVE_ZONE,
        target: 4,
      },
    },

    // ── STEP 4 — Free game: apply it ───────────────────────────────────────
    {
      kind: "play",
      title: "Now play a game",
      body:
        "Put it together in a full 5v5. You're the #6 — keep showing for the ball, receive in space, and play around the pressure to build out of the back. When you're stuck, recycle to the keeper and go again.",
      matchConfig: { format: "5v5", userRole: "hold", oppTacticId: "possession", duration: 180000, aiDifficulty: "medium", zoneRules: [] },
    },
  ],
};

export { RECEIVE_ZONE };
