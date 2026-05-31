// Built-in zone-rule presets, shared by /play and the lesson author so a
// Scenario/Game step can apply a saved preset (built-in or user-authored).
import type { RulePreset } from "@/types/game";

const US = "rgb(46,111,224)";
const THEM = "rgb(224,70,59)";

export const BUILTIN_PRESETS: RulePreset[] = [
  {
    id: "stay-wide", name: "Stay Wide",
    description: "Wingers locked to their sidelines — teaches width in attack",
    builtin: true,
    rules: [
      { team: "us", role: "lw", xMin: 0.0, xMax: 0.30, yMin: 0.10, yMax: 0.90, label: "Blue LW", color: US },
      { team: "us", role: "rw", xMin: 0.70, xMax: 1.0, yMin: 0.10, yMax: 0.90, label: "Blue RW", color: US },
      { team: "them", role: "lw", xMin: 0.0, xMax: 0.30, yMin: 0.10, yMax: 0.90, label: "Red LW", color: THEM },
      { team: "them", role: "rw", xMin: 0.70, xMax: 1.0, yMin: 0.10, yMax: 0.90, label: "Red RW", color: THEM },
    ],
  },
  {
    id: "thirds-lock", name: "Thirds Lock",
    description: "Each line stays in their third — teaches shape and spacing",
    builtin: true,
    rules: [
      { team: "us", role: "hold", xMin: 0.10, xMax: 0.90, yMin: 0.0, yMax: 0.38, label: "Blue #6 zone", color: US },
      { team: "us", role: "fwd", xMin: 0.15, xMax: 0.85, yMin: 0.55, yMax: 1.0, label: "Blue #10 zone", color: US },
      { team: "them", role: "hold", xMin: 0.10, xMax: 0.90, yMin: 0.0, yMax: 0.38, label: "Red #6 zone", color: THEM },
      { team: "them", role: "fwd", xMin: 0.15, xMax: 0.85, yMin: 0.55, yMax: 1.0, label: "Red #10 zone", color: THEM },
    ],
  },
  {
    id: "half-field", name: "Half-Field Only",
    description: "Both teams locked to their own half — great for positional play drills",
    builtin: true,
    rules: [
      { team: "us", role: "hold", xMin: 0.0, xMax: 1.0, yMin: 0.0, yMax: 0.52, label: "Blue #6", color: US },
      { team: "us", role: "lw", xMin: 0.0, xMax: 1.0, yMin: 0.0, yMax: 0.52, label: "Blue LW", color: US },
      { team: "us", role: "rw", xMin: 0.0, xMax: 1.0, yMin: 0.0, yMax: 0.52, label: "Blue RW", color: US },
      { team: "them", role: "hold", xMin: 0.0, xMax: 1.0, yMin: 0.0, yMax: 0.52, label: "Red #6", color: THEM },
      { team: "them", role: "lw", xMin: 0.0, xMax: 1.0, yMin: 0.0, yMax: 0.52, label: "Red LW", color: THEM },
      { team: "them", role: "rw", xMin: 0.0, xMax: 1.0, yMin: 0.0, yMax: 0.52, label: "Red RW", color: THEM },
    ],
  },
  {
    id: "compact-shape", name: "Compact Shape",
    description: "Everyone stays narrow — teaches compact defending and central overloads",
    builtin: true,
    rules: [
      { team: "us", role: "lw", xMin: 0.15, xMax: 0.55, yMin: 0.10, yMax: 0.90, label: "Blue LW", color: US },
      { team: "us", role: "rw", xMin: 0.45, xMax: 0.85, yMin: 0.10, yMax: 0.90, label: "Blue RW", color: US },
      { team: "them", role: "lw", xMin: 0.15, xMax: 0.55, yMin: 0.10, yMax: 0.90, label: "Red LW", color: THEM },
      { team: "them", role: "rw", xMin: 0.45, xMax: 0.85, yMin: 0.10, yMax: 0.90, label: "Red RW", color: THEM },
    ],
  },
  {
    id: "push-and-recover", name: "Push & Recover (conditional)",
    description: "#6 pushes up when WE attack, drops deep when they have it — two zones, one player",
    builtin: true,
    rules: [
      { team: "us", role: "hold", xMin: 0.20, xMax: 0.80, yMin: 0.40, yMax: 0.75, label: "Blue #6 high", color: US, when: "attacking" },
      { team: "us", role: "hold", xMin: 0.15, xMax: 0.85, yMin: 0.0, yMax: 0.35, label: "Blue #6 deep", color: US, when: "defending" },
      { team: "us", role: "fwd", xMin: 0.20, xMax: 0.80, yMin: 0.60, yMax: 1.0, label: "Blue #10 line", color: US, when: "attacking" },
      { team: "us", role: "fwd", xMin: 0.25, xMax: 0.75, yMin: 0.35, yMax: 0.70, label: "Blue #10 recover", color: US, when: "defending" },
    ],
  },
];
