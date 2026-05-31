// PILOT COURSE — Lesson 1: "Playing Out of the Back" (5v5)
// Four steps, building from understanding → focus → guided scenario → free game:
//   1. info scenario   — meet the 5v5 positions & roles (tap each blue player)
//   2. explain card     — zoom in on the #6's job from a throw-in
//   3. live-scenario     — #6 shows for a throw-in and receives in a safe zone,
//                          playing around the press (objective: receiveInZone/hold)
//   4. play             — free 5v5 controlling the #6, applying the same idea
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
// Matches the orientation used by RESTARTS_LESSON's SUPPORT_BOX.
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
          "Five jobs, one team. The keeper starts the build-up, the #6 connects everything in the middle, the wingers stretch the field wide, and the #9 leads the line. To play out of the back you lean on the goalkeeper and the #6.",
        answer: {
          mode: "info",
          objectIds: ["pob-gk", "pob-6", "pob-7", "pob-11", "pob-9"],
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
          "pob-7": {
            title: "#7 — Left Winger",
            text: "Stays wide on the left touchline to stretch the field and give the #6 a forward passing option up the side. (e.g. Vinícius)",
          },
          "pob-11": {
            title: "#11 — Right Winger",
            text: "Stays wide on the right touchline, stretching the field the other way and offering a switch of play. (e.g. Saka)",
          },
          "pob-9": {
            title: "#9 — Forward",
            text: "Leads the line up top. Pins the opponent's last defender so there's space for the #6 to receive and turn. (e.g. Haaland)",
          },
        },
        board: {
          objects: [
            // Blue (home) — building out from the left, attacking right.
            { id: "pob-gk", type: "player", x: 70, y: 310, team: "home", label: "1" },
            { id: "pob-6", type: "player", x: 250, y: 310, team: "home", label: "6" },
            { id: "pob-7", type: "player", x: 300, y: 470, team: "home", label: "7" },
            { id: "pob-11", type: "player", x: 300, y: 150, team: "home", label: "11" },
            { id: "pob-9", type: "player", x: 430, y: 310, team: "home", label: "9" },
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

    // ── STEP 2 — The #6's job from a throw-in (explain) ────────────────────
    {
      kind: "explain",
      title: "The #6 on a throw-in",
      body:
        "When your team gets a throw-in deep in your own half, the #6 is the key. Your job is to SHOW for the ball — step into an open pocket where the thrower can find you. The moment you receive it, you'll have a red player closing you down. Don't panic and don't boot it away: take a touch into space, away from the pressure, and look up. If nothing's on, the goalkeeper is always behind you to recycle and start again. Next, you'll do it live.",
    },

    // ── STEP 3 — Guided scenario: #6 receives & plays around pressure ──────
    {
      kind: "live-scenario",
      title: "Show for the throw-in",
      body:
        "It's a throw-in in your own half. You're the #6 (blue). Step into the open space in the middle and receive the ball there — show for it, get on the ball, and beat the press. Receive in the highlighted area to complete it.",
      matchConfig: { format: "5v5", userRole: "hold", zoneRules: [] },
      scenarioSetup: { forcedRestart: "throwin", restartTeam: "us" },
      objective: {
        type: "receiveInZone",
        label: "#6 receives the throw-in in space",
        role: "hold",
        zone: RECEIVE_ZONE,
        target: 1,
      },
    },

    // ── STEP 4 — Free game: apply it ───────────────────────────────────────
    {
      kind: "play",
      title: "Now play a game",
      body:
        "Put it together in a full 5v5. You're the #6 — keep showing for the ball, receive in space, and play around the pressure to build out of the back. When you're stuck, recycle to the keeper and go again.",
      matchConfig: { format: "5v5", userRole: "hold" },
    },
  ],
};

export { RECEIVE_ZONE };
