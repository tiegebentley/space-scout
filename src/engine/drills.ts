import type { DrillConfig, DrillObjective, Position, Zone, CoachingTip } from "@/types/game";
import { W, H, L, R, TOP, BOT, GX0, GX1 } from "./constants";

const MID_X = W / 2;
const MID_Y = H / 2;

export const DRILLS: DrillConfig[] = [
  // ===== PASSING =====
  {
    id: "find-the-pass",
    name: "Find the Pass",
    description: "Your team has the ball. Find the open teammate and play the pass before the window closes. Complete 5 successful passes to earn stars.",
    category: "passing",
    difficulty: 1,
    format: "5v5",
    objectives: [
      { id: "passes", label: "Passes completed", description: "Successful passes to a teammate", target: 5, metric: "passes_completed" },
    ],
    timeLimit: 60000,
    setup: {
      playerPositions: {
        you: { x: MID_X, y: MID_Y + 80 },
        "us-lw": { x: L + 80, y: MID_Y - 40 },
        "us-rw": { x: R - 80, y: MID_Y - 40 },
        "us-hold": { x: MID_X, y: MID_Y + 180 },
        "us-fwd": { x: MID_X, y: MID_Y - 120 },
      },
      ballStart: { x: MID_X, y: MID_Y + 80 },
      zones: [
        { x: L + 40, y: TOP + 60, w: R - L - 80, h: MID_Y - TOP - 60, type: "target", label: "Attacking zone" },
      ],
    },
    coaching: [
      { trigger: "start", message: "You have the ball. Look for the teammate with the most space and pass to them!", priority: 1 },
      { trigger: "pass_complete", message: "Great pass! Now get open again — a good player is always moving.", priority: 2 },
      { trigger: "pass_intercepted", message: "Intercepted! Check if a defender was in the passing lane before you play it.", priority: 3 },
      { trigger: "timeout_warning", message: "10 seconds left! Play it quick — don't hold the ball too long.", priority: 2 },
      { trigger: "idle", message: "Don't stand still with the ball — scan for an open teammate.", priority: 1 },
    ],
    xpReward: 40,
  },

  // ===== MOVEMENT =====
  {
    id: "find-space",
    name: "Find Space",
    description: "Your teammate has the ball. Move into open space to receive it. Stay away from defenders and show for the pass. Get into the target zone 5 times.",
    category: "movement",
    difficulty: 1,
    format: "5v5",
    objectives: [
      { id: "space_found", label: "Times in space", description: "Enter the highlighted zone with no defender nearby", target: 5, metric: "space_found" },
    ],
    timeLimit: 60000,
    setup: {
      playerPositions: {
        you: { x: MID_X + 60, y: MID_Y + 60 },
        "us-lw": { x: L + 60, y: MID_Y },
        "us-rw": { x: R - 60, y: MID_Y },
        "us-hold": { x: MID_X, y: MID_Y + 160 },
        "us-fwd": { x: MID_X - 40, y: MID_Y - 100 },
      },
      ballStart: { x: MID_X, y: MID_Y + 160 },
      zones: [
        { x: L + 100, y: TOP + 100, w: 160, h: 120, type: "target", label: "Zone A" },
        { x: R - 260, y: TOP + 100, w: 160, h: 120, type: "target", label: "Zone B" },
        { x: MID_X - 80, y: MID_Y - 60, w: 160, h: 120, type: "target", label: "Zone C" },
      ],
    },
    coaching: [
      { trigger: "start", message: "Your teammate has the ball. Move into the highlighted zone WITHOUT a defender near you.", priority: 1 },
      { trigger: "space_found", message: "You found space! Now do it again — great players never stop moving.", priority: 2 },
      { trigger: "too_close_to_defender", message: "A defender is right on you — move away to create separation.", priority: 3 },
      { trigger: "standing_still", message: "You're standing still! Off-the-ball movement is what separates good players.", priority: 2 },
    ],
    xpReward: 40,
  },

  // ===== DEFENDING =====
  {
    id: "press-the-ball",
    name: "Press the Ball",
    description: "The Reds have the ball. Close down the ball carrier quickly — get within pressing distance 5 times. Don't let them turn and play forward!",
    category: "defending",
    difficulty: 1,
    format: "5v5",
    objectives: [
      { id: "interceptions", label: "Presses made", description: "Get close enough to the ball carrier to pressure them", target: 5, metric: "interceptions" },
    ],
    timeLimit: 60000,
    setup: {
      playerPositions: {
        you: { x: MID_X, y: MID_Y },
        "us-lw": { x: L + 80, y: MID_Y + 40 },
        "us-rw": { x: R - 80, y: MID_Y + 40 },
        "us-hold": { x: MID_X, y: MID_Y + 120 },
        "us-fwd": { x: MID_X, y: MID_Y - 80 },
      },
      ballStart: { x: MID_X, y: MID_Y - 160 },
    },
    coaching: [
      { trigger: "start", message: "Reds have the ball! Sprint toward the carrier and close them down.", priority: 1 },
      { trigger: "press_success", message: "Great press! You forced them into a mistake. Stay alert for the next one.", priority: 2 },
      { trigger: "too_far", message: "You're too far from the ball — close the gap faster!", priority: 3 },
      { trigger: "good_angle", message: "Nice approach angle — you cut off the forward pass.", priority: 2 },
    ],
    xpReward: 40,
  },
];

export function getDrill(id: string): DrillConfig | undefined {
  return DRILLS.find((d) => d.id === id);
}

export function getDrillsByCategory(category: string): DrillConfig[] {
  return DRILLS.filter((d) => d.category === category);
}

export function calcStars(objectivesPct: number): 1 | 2 | 3 {
  if (objectivesPct >= 1.0) return 3;
  if (objectivesPct >= 0.6) return 2;
  return 1;
}
