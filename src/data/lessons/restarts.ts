// "Restarts: Build from the Back" — demonstrates the three lesson modes:
//   Instructional → an explain card,
//   Scenario (live) → throw-in restart, you control #6 in a support box, and the
//     objective is to complete 5 passes to the goalkeeper,
//   Game → free 5v5 play to put it together.
import type { Lesson } from "@/types/lessons";
import { W, H } from "@/engine/constants";

// A "support box" in our own (bottom) half, central — where #6 should show for
// the throw-in. Engine coords (W=900, H=650; us defends/builds from the bottom).
const SUPPORT_BOX = { x: W / 2 - 150, y: H * 0.6, w: 300, h: H * 0.3 };

export const RESTARTS_LESSON: Lesson = {
  id: "restarts-build-from-back",
  title: "Restarts: Build from the Back",
  description: "Learn to build out of a throw-in by supporting and recycling to the keeper.",
  difficulty: "intermediate",
  category: "positioning",
  steps: [
    {
      kind: "explain",
      title: "Building from a restart",
      body: "When the ball goes out, your team restarts with a throw-in. Don't just boot it forward — show for the ball, keep possession, and if you're under pressure, recycle back to the goalkeeper to start again. Next you'll do it live.",
    },
    {
      kind: "live-scenario",
      title: "Support and recycle to the keeper",
      body: "Every restart is a throw-in. You control #6 — show in the support box, then keep the ball moving. Complete 5 passes to your goalkeeper.",
      matchConfig: { format: "5v5", userRole: "hold", zoneRules: [] },
      scenarioSetup: { forcedRestart: "throwin", restartTeam: "us" },
      objective: { type: "passCount", label: "Passes to the goalkeeper", target: 5, toRole: "gk" },
    },
    {
      kind: "play",
      title: "Now play a full game",
      body: "Put it together in a 5v5. Build from the back, support each other, and recycle to the keeper when you're stuck.",
      matchConfig: { format: "5v5", userRole: "hold" },
    },
  ],
};

export { SUPPORT_BOX };
