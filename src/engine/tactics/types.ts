// Tactical system config — entirely data-driven.
// Each preset is a TacticConfig; the engine reads it every frame to decide positions.

export interface TacticConfig {
  id: string;
  name: string;
  description: string;
  icon: string;

  // How much space teammates maintain
  spacing: SpacingRules;

  // Role-specific behaviors that activate based on ball position / game state
  triggers: TacticTrigger[];

  // How the defensive line behaves
  defending: DefendingStyle;

  // Transition behavior when possession changes
  transition: TransitionConfig;
}

export interface SpacingRules {
  minGap: number;           // minimum px between any two teammates
  maxClusterSize: number;   // max teammates allowed within clusterRadius of each other
  clusterRadius: number;    // px radius to detect clusters
  widthCoverage: boolean;   // enforce at least 1 player in each horizontal third
  depthSpread: number;      // 0-1: how much the team stretches vertically (0=compact, 1=stretched)
}

export type TriggerCondition =
  | "ball_in_own_third"
  | "ball_in_mid_third"
  | "ball_in_att_third"
  | "ball_on_left"
  | "ball_on_right"
  | "possession_won"
  | "possession_lost"
  | "carrier_under_pressure"
  | "carrier_has_space"
  | "losing"
  | "winning";

export type RoleAction =
  | "stretch_line"      // FWD: push to the last defender line
  | "drop_to_link"      // FWD: come short to receive between lines
  | "overlap"           // WIDE: make forward overlapping run
  | "show_wide_deep"    // WIDE: drop deep and wide as outlet
  | "tuck_inside"       // WIDE: move inside as a #10
  | "hold_shape"        // Stay at home position
  | "push_high"         // Move forward toward opponent half
  | "drop_deep"         // Retreat toward own goal
  | "show_short"        // Move toward the ball carrier
  | "compact_behind_ball" // Get goal-side of the ball
  | "press_ball"        // Sprint toward ball carrier
  | "cover_space"       // Find the biggest gap and fill it
  | "stay_wide"         // Hug the touchline
  | "create_overload"   // Move toward ball side to outnumber defenders
  ;

export interface TacticTrigger {
  when: TriggerCondition;
  roles?: Partial<Record<string, RoleAction>>; // role key → action
  all?: RoleAction;      // apply to all non-specified roles
  duration?: number;     // ms — how long this trigger stays active after condition ends
}

export interface DefendingStyle {
  type: "zonal" | "man" | "hybrid";
  lineHeight: number;       // 0-1: how high the defensive line sits (0=deep, 1=halfway)
  pressIntensity: number;   // 0-1: how aggressively the nearest defender presses
  coverDistance: number;     // px: how close a defender stays to their assigned attacker
  compactness: number;       // 0-1: how tight the defensive block is (0=spread, 1=compact)
}

export interface TransitionConfig {
  attackToDefense: TransitionPhase;
  defenseToAttack: TransitionPhase;
}

export interface TransitionPhase {
  speed: number;       // 0-1: how fast players react (0=slow, 1=instant)
  duration: number;    // ms: how long the transition phase lasts
  priority: RoleAction; // what players do during transition
}
