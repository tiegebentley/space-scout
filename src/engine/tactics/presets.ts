import type { TacticConfig } from "./types";

export const TACTIC_POSSESSION: TacticConfig = {
  id: "possession",
  name: "Possession",
  description: "Patient build-up from the back. Wide spacing, short passes, GK involved. Control the game through keeping the ball.",
  icon: "🎯",
  spacing: {
    minGap: 60,
    maxClusterSize: 2,
    clusterRadius: 75,
    widthCoverage: true,
    depthSpread: 0.7,
  },
  triggers: [
    {
      when: "ball_in_own_third",
      roles: {
        fwd: "drop_to_link",
        lw: "show_wide_deep",
        rw: "show_wide_deep",
        hold: "hold_shape",
      },
    },
    {
      when: "ball_in_mid_third",
      roles: {
        fwd: "stretch_line",
        lw: "stay_wide",
        rw: "stay_wide",
        hold: "hold_shape",
      },
    },
    {
      when: "ball_in_att_third",
      roles: {
        fwd: "stretch_line",
        lw: "overlap",
        rw: "overlap",
        hold: "push_high",
      },
    },
    {
      when: "ball_on_left",
      roles: { rw: "tuck_inside", lw: "overlap" },
    },
    {
      when: "ball_on_right",
      roles: { lw: "tuck_inside", rw: "overlap" },
    },
    {
      when: "carrier_under_pressure",
      roles: {},
      all: "show_short",
      duration: 2000,
    },
    {
      when: "possession_lost",
      roles: {},
      all: "compact_behind_ball",
      duration: 3000,
    },
  ],
  defending: {
    type: "zonal",
    lineHeight: 0.45,
    pressIntensity: 0.5,
    coverDistance: 50,
    compactness: 0.6,
  },
  transition: {
    attackToDefense: { speed: 0.6, duration: 3000, priority: "compact_behind_ball" },
    defenseToAttack: { speed: 0.4, duration: 2000, priority: "hold_shape" },
  },
};

export const TACTIC_COUNTER: TacticConfig = {
  id: "counter",
  name: "Counter-Attack",
  description: "Compact defense, quick transitions. Win the ball and go direct — stretch them with pace before they recover.",
  icon: "⚡",
  spacing: {
    minGap: 45,
    maxClusterSize: 3,
    clusterRadius: 65,
    widthCoverage: false,
    depthSpread: 0.5,
  },
  triggers: [
    {
      when: "ball_in_own_third",
      roles: {
        fwd: "stretch_line",  // FWD stays high even when defending
        lw: "drop_deep",
        rw: "drop_deep",
        hold: "drop_deep",
      },
    },
    {
      when: "ball_in_mid_third",
      roles: {
        fwd: "stretch_line",
        lw: "stay_wide",
        rw: "stay_wide",
        hold: "hold_shape",
      },
    },
    {
      when: "ball_in_att_third",
      roles: {
        fwd: "stretch_line",
        lw: "overlap",
        rw: "overlap",
        hold: "hold_shape",
      },
    },
    {
      when: "possession_won",
      roles: {
        fwd: "stretch_line",
        lw: "overlap",
        rw: "overlap",
      },
      all: "push_high",
      duration: 4000,
    },
    {
      when: "possession_lost",
      roles: {},
      all: "compact_behind_ball",
      duration: 2000,
    },
    {
      when: "carrier_has_space",
      roles: {
        fwd: "stretch_line",
        lw: "overlap",
        rw: "overlap",
      },
    },
  ],
  defending: {
    type: "zonal",
    lineHeight: 0.30,
    pressIntensity: 0.4,
    coverDistance: 40,
    compactness: 0.8,
  },
  transition: {
    attackToDefense: { speed: 0.7, duration: 2000, priority: "compact_behind_ball" },
    defenseToAttack: { speed: 1.0, duration: 4000, priority: "push_high" },
  },
};

export const TACTIC_HIGH_PRESS: TacticConfig = {
  id: "high-press",
  name: "High Press",
  description: "Win the ball back immediately! Press aggressively high up the pitch. Risky but suffocating when it works.",
  icon: "🔥",
  spacing: {
    minGap: 40,
    maxClusterSize: 3,
    clusterRadius: 60,
    widthCoverage: true,
    depthSpread: 0.4,
  },
  triggers: [
    {
      when: "ball_in_own_third",
      roles: {
        fwd: "drop_to_link",
        hold: "hold_shape",
      },
      all: "compact_behind_ball",
    },
    {
      when: "ball_in_mid_third",
      all: "press_ball",
    },
    {
      when: "ball_in_att_third",
      all: "press_ball",
    },
    {
      when: "possession_lost",
      all: "press_ball",
      duration: 5000,
    },
    {
      when: "possession_won",
      roles: {
        fwd: "stretch_line",
        lw: "stay_wide",
        rw: "stay_wide",
      },
      duration: 2000,
    },
    {
      when: "carrier_under_pressure",
      roles: {},
      all: "create_overload",
      duration: 2000,
    },
  ],
  defending: {
    type: "hybrid",
    lineHeight: 0.60,
    pressIntensity: 0.9,
    coverDistance: 30,
    compactness: 0.9,
  },
  transition: {
    attackToDefense: { speed: 1.0, duration: 5000, priority: "press_ball" },
    defenseToAttack: { speed: 0.5, duration: 1500, priority: "hold_shape" },
  },
};

export const ALL_TACTICS: TacticConfig[] = [
  TACTIC_POSSESSION,
  TACTIC_COUNTER,
  TACTIC_HIGH_PRESS,
];

export function getTactic(id: string): TacticConfig | undefined {
  return ALL_TACTICS.find((t) => t.id === id);
}
