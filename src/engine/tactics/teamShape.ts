import type { Player, Position, WingerBounds } from "@/types/game";
import type { TacticConfig, TriggerCondition, RoleAction } from "./types";
import { W, H, L, R, TOP, BOT, ROLE_BOUNDS, WINGER_X_BOUNDS } from "../constants";

function clamp(v: number, a: number, b: number) { return v < a ? a : v > b ? b : v; }
function dist(a: Position, b: Position) { return Math.hypot(a.x - b.x, a.y - b.y); }

function depthToY(side: "us" | "them", depth: number): number {
  return side === "us" ? (BOT - (BOT - TOP) * depth) : (TOP + (BOT - TOP) * depth);
}

interface ShapeContext {
  ballX: number;
  ballY: number;
  ballSide: number;       // 0-1 left to right
  ballDepth: number;      // 0-1 own goal to opp goal (for this team)
  side: "us" | "them";
  attacking: boolean;
  carrier: Player | null;
  carrierPressure: number; // nearest enemy distance to carrier
  possessionJustChanged: boolean;
  winning: boolean;
  losing: boolean;
  teammates: Player[];
  enemies: Player[];
  wingerBounds: WingerBounds;
}

export class TeamShapeEngine {
  private tactic: TacticConfig;
  private transitionTimer = 0;
  private lastPossession: "us" | "them" | null = null;

  constructor(tactic: TacticConfig) {
    this.tactic = tactic;
  }

  setTactic(t: TacticConfig) {
    this.tactic = t;
  }

  // Evaluate which triggers are active right now
  private activeConditions(ctx: ShapeContext): Set<TriggerCondition> {
    const conds = new Set<TriggerCondition>();

    if (ctx.ballDepth < 0.33) conds.add("ball_in_own_third");
    else if (ctx.ballDepth < 0.66) conds.add("ball_in_mid_third");
    else conds.add("ball_in_att_third");

    if (ctx.ballSide < 0.38) conds.add("ball_on_left");
    else if (ctx.ballSide > 0.62) conds.add("ball_on_right");

    if (ctx.possessionJustChanged) {
      if (ctx.attacking) conds.add("possession_won");
      else conds.add("possession_lost");
    }

    if (ctx.carrier && ctx.carrierPressure < 50) conds.add("carrier_under_pressure");
    if (ctx.carrier && ctx.carrierPressure > 90) conds.add("carrier_has_space");

    if (ctx.winning) conds.add("winning");
    if (ctx.losing) conds.add("losing");

    return conds;
  }

  // Get the desired action for a player's role given active conditions
  private getAction(roleKey: string, conds: Set<TriggerCondition>): RoleAction {
    let action: RoleAction = "hold_shape";

    // Later triggers override earlier ones (priority = order in array)
    for (const trigger of this.tactic.triggers) {
      if (!conds.has(trigger.when)) continue;
      if (trigger.roles?.[roleKey]) {
        action = trigger.roles[roleKey]!;
      } else if (trigger.all) {
        action = trigger.all;
      }
    }
    return action;
  }

  // Convert an action into a target position for a player
  calcTargetPosition(
    player: Player,
    roleKey: string,
    ctx: ShapeContext
  ): Position {
    const action = this.getAction(roleKey, this.activeConditions(ctx));
    const home = player.home;
    const dir = ctx.side === "us" ? -1 : 1;
    // Work in team-relative coordinates (mirror for "them")
    const homeFx = ctx.side === "them" ? 1 - home.fx : home.fx;
    const isLeft = homeFx < 0.5;

    let fx = homeFx;
    let fy = home.fy;

    switch (action) {
      case "hold_shape":
        // Stay at home with minor ball-tracking
        fx = home.fx + (ctx.ballSide - 0.5) * 0.08;
        fy = home.fy + (ctx.ballDepth - 0.5) * 0.08;
        break;

      case "stretch_line":
        fy = clamp(home.fy + 0.20, 0.65, 0.95);
        fx = clamp(home.fx + (ctx.ballSide - 0.5) * 0.12, 0.3, 0.7);
        break;

      case "drop_to_link":
        fy = clamp(home.fy - 0.18, 0.35, 0.58);
        fx = clamp(home.fx + (ctx.ballSide - 0.5) * 0.15, 0.3, 0.7);
        break;

      case "overlap":
        fy = clamp(home.fy + 0.22, 0.50, 0.92);
        fx = isLeft ? clamp(home.fx - 0.05, 0.04, 0.18) : clamp(home.fx + 0.05, 0.82, 0.96);
        break;

      case "show_wide_deep":
        fy = clamp(home.fy - 0.12, 0.18, 0.42);
        fx = isLeft ? clamp(home.fx - 0.04, 0.05, 0.20) : clamp(home.fx + 0.04, 0.80, 0.95);
        break;

      case "tuck_inside": {
        const twb = isLeft ? ctx.wingerBounds.lw : ctx.wingerBounds.rw;
        fx = isLeft ? clamp(homeFx + 0.08, twb.min, twb.max) : clamp(homeFx - 0.08, twb.min, twb.max);
        fy = clamp(home.fy + 0.06, 0.45, 0.72);
        break;
      }

      case "stay_wide":
        fx = isLeft ? clamp(home.fx, 0.04, 0.18) : clamp(home.fx, 0.82, 0.96);
        fy = home.fy + (ctx.ballDepth - 0.5) * 0.1;
        break;

      case "push_high":
        fy = clamp(home.fy + 0.15, 0.40, 0.75);
        fx = home.fx + (ctx.ballSide - 0.5) * 0.10;
        break;

      case "drop_deep":
        fy = clamp(home.fy - 0.15, 0.15, 0.40);
        break;

      case "show_short": {
        if (ctx.carrier) {
          const rawCarrierFx = (ctx.carrier.x - L) / (R - L);
          const carrierFx = ctx.side === "them" ? 1 - rawCarrierFx : rawCarrierFx;
          const carrierFy = ctx.side === "us"
            ? (BOT - ctx.carrier.y) / (BOT - TOP)
            : (ctx.carrier.y - TOP) / (BOT - TOP);
          const dy = carrierFy - home.fy;
          // Wide players: only adjust depth toward carrier, stay in their lane
          if (home.role === "wide") {
            fx = homeFx;
            fy = clamp(home.fy + dy * 0.3, 0.15, 0.85);
          } else {
            const dx = carrierFx - homeFx;
            fx = clamp(homeFx + dx * 0.4, 0.05, 0.95);
            fy = clamp(home.fy + dy * 0.3, 0.15, 0.85);
          }
        }
        break;
      }

      case "compact_behind_ball":
        fy = clamp(ctx.ballDepth * 0.6 + home.fy * 0.4, 0.10, 0.65);
        fx = home.fx + (ctx.ballSide - 0.5) * 0.15;
        break;

      case "press_ball":
        // Move toward the ball aggressively
        fx = clamp(ctx.ballSide + (home.fx - 0.5) * 0.3, 0.10, 0.90);
        fy = clamp(ctx.ballDepth + 0.05, 0.30, 0.90);
        break;

      case "cover_space": {
        const bestGap = this.findBiggestGap(player, ctx);
        const rawFx = (bestGap.x - L) / (R - L);
        fx = ctx.side === "them" ? 1 - rawFx : rawFx;
        fy = ctx.side === "us"
          ? (BOT - bestGap.y) / (BOT - TOP)
          : (bestGap.y - TOP) / (BOT - TOP);
        break;
      }

      case "create_overload":
        // Shift toward ball side to outnumber
        fx = clamp(ctx.ballSide + (home.fx > 0.5 ? 0.05 : -0.05), 0.10, 0.90);
        fy = clamp(ctx.ballDepth - 0.05, 0.30, 0.80);
        break;
    }

    // Apply role bounds
    const bounds = ROLE_BOUNDS[home.role];
    if (bounds) {
      fy = clamp(fy, bounds.fyMin, bounds.fyMax);
    }

    // Wide players must stay in their wide channel — never collapse to center
    if (home.role === "wide") {
      const wxb = isLeft ? ctx.wingerBounds.lw : ctx.wingerBounds.rw;
      fx = clamp(fx, wxb.min, wxb.max);
    }

    // Convert back to screen coordinates (mirror back for "them")
    const screenFx = ctx.side === "them" ? 1 - fx : fx;
    const x = clamp(L + (R - L) * screenFx + (ctx.ballX - W / 2) * 0.04, L + 15, R - 15);
    const y = clamp(depthToY(ctx.side, fy), TOP + 15, BOT - 15);
    return { x, y };
  }

  // Enforce spacing rules — push players apart if too close
  enforceSpacing(players: Player[], ctx: ShapeContext): void {
    const { minGap, maxClusterSize, clusterRadius } = this.tactic.spacing;

    for (let i = 0; i < players.length; i++) {
      const p = players[i];
      if (p.gk || p.isUser) continue;

      for (let j = i + 1; j < players.length; j++) {
        const o = players[j];
        if (o.gk || o.isUser) continue;

        const d = dist(p, o);
        if (d < minGap && d > 0) {
          const pFrozen = p.frozenTimer && p.frozenTimer > 0;
          const oFrozen = o.frozenTimer && o.frozenTimer > 0;
          if (pFrozen && oFrozen) continue;
          const push = (minGap - d) * 0.5;
          const ang = Math.atan2(p.y - o.y, p.x - o.x);
          if (!pFrozen) {
            p.x += Math.cos(ang) * push;
            p.y += Math.sin(ang) * push;
          }
          if (!oFrozen) {
            o.x -= Math.cos(ang) * push;
            o.y -= Math.sin(ang) * push;
          }
        }
      }
    }
  }

  private findBiggestGap(player: Player, ctx: ShapeContext): Position {
    let bestGap = { x: player.x, y: player.y, size: 0 };

    // Sample a grid and find the spot furthest from any teammate
    for (let gx = L + 60; gx < R - 60; gx += 50) {
      for (let gy = TOP + 40; gy < BOT - 40; gy += 50) {
        let minDist = 1e9;
        for (const t of ctx.teammates) {
          if (t === player || t.gk) continue;
          const d = Math.hypot(gx - t.x, gy - t.y);
          if (d < minDist) minDist = d;
        }
        if (minDist > bestGap.size) {
          bestGap = { x: gx, y: gy, size: minDist };
        }
      }
    }
    return bestGap;
  }

  // Build the context object from engine state
  static buildContext(
    side: "us" | "them",
    attacking: boolean,
    ballX: number,
    ballY: number,
    carrier: Player | null,
    carrierPressure: number,
    possChanged: boolean,
    scoreUs: number,
    scoreThem: number,
    teammates: Player[],
    enemies: Player[],
    wingerBounds?: WingerBounds,
  ): ShapeContext {
    const rawBallSide = (ballX - L) / (R - L);
    const ballSide = side === "them" ? 1 - rawBallSide : rawBallSide;
    const ballDepth = side === "us"
      ? (BOT - ballY) / (BOT - TOP)
      : (ballY - TOP) / (BOT - TOP);

    return {
      ballX, ballY, ballSide, ballDepth,
      side, attacking, carrier, carrierPressure,
      possessionJustChanged: possChanged,
      winning: side === "us" ? scoreUs > scoreThem : scoreThem > scoreUs,
      losing: side === "us" ? scoreUs < scoreThem : scoreThem < scoreUs,
      teammates, enemies,
      wingerBounds: wingerBounds || WINGER_X_BOUNDS,
    };
  }
}
