import { GameEngine, type EngineEvent } from "./GameEngine";
import type { DrillConfig, Zone, CoachingTip } from "@/types/game";
import { W, H, L, R, TOP, BOT, CONTACT } from "./constants";
import { calcStars } from "./drills";

export interface DrillState {
  drillId: string;
  objectives: Record<string, number>;
  targets: Record<string, number>;
  timeLeft: number;
  completed: boolean;
  stars: 0 | 1 | 2 | 3;
  zones: Zone[];
  spaceCheckCooldown: number;
  pressCooldown: number;
  idleFrames: number;
}

export type DrillEvent = EngineEvent | {
  type: "drill:complete";
  stars: 1 | 2 | 3;
  objectives: Record<string, number>;
  xpEarned: number;
} | {
  type: "drill:objectiveProgress";
  objectiveId: string;
  current: number;
  target: number;
} | {
  type: "drill:zoneEnter";
  zoneLabel: string;
};

export class DrillEngine extends GameEngine {
  private drill: DrillConfig;
  private drillState: DrillState;
  private drillEventQueue: DrillEvent[] = [];

  constructor(drill: DrillConfig) {
    super({
      duration: drill.timeLimit,
      format: drill.format,
      speed: 38,
      aiDifficulty: "medium",
    });
    this.drill = drill;

    const objectives: Record<string, number> = {};
    const targets: Record<string, number> = {};
    for (const obj of drill.objectives) {
      objectives[obj.id] = 0;
      targets[obj.id] = obj.target;
    }

    this.drillState = {
      drillId: drill.id,
      objectives,
      targets,
      timeLeft: drill.timeLimit,
      completed: false,
      stars: 0,
      zones: drill.setup.zones || [],
      spaceCheckCooldown: 0,
      pressCooldown: 0,
      idleFrames: 0,
    };
  }

  get state(): DrillState {
    return this.drillState;
  }

  startDrill() {
    this.start();

    // Override player positions from drill setup
    if (this.drill.setup.playerPositions) {
      const positions = this.drill.setup.playerPositions;
      if (positions.you) {
        this.you.x = positions.you.x;
        this.you.y = positions.you.y;
      }
      for (const mate of this.mates) {
        const pos = positions[mate.id];
        if (pos) { mate.x = pos.x; mate.y = pos.y; }
      }
    }

    // Place ball
    if (this.drill.setup.ballStart) {
      this.ball.x = this.drill.setup.ballStart.x;
      this.ball.y = this.drill.setup.ballStart.y;
    }

    // Give ball to appropriate player based on drill type
    if (this.drill.category === "passing") {
      this.giveBallForDrill(this.you);
    } else if (this.drill.category === "movement") {
      // give to a teammate (hold player)
      const holder = this.mates.find(m => m.id === "us-hold") || this.mates[0];
      if (holder) this.giveBallForDrill(holder);
    } else if (this.drill.category === "defending") {
      // give to opponent
      const opp = this.opps[0];
      if (opp) this.giveBallForDrill(opp);
    }

    // Fire start coaching tip
    const startTip = this.drill.coaching.find(c => c.trigger === "start");
    if (startTip) {
      this.emitDrill({ type: "coach", message: startTip.message });
    }
  }

  private giveBallForDrill(p: typeof this.you) {
    this.ball.owner = p;
    this.ball.flying = false;
    this.ball.x = p.x;
    this.ball.y = p.y;
    this.poss = p.side;
    this.youHasBall = p === this.you;
    this.ball.lastTouch = p.side;
  }

  private emitDrill(event: DrillEvent) {
    this.drillEventQueue.push(event);
  }

  flushDrillEvents(): DrillEvent[] {
    const events = [...super.flushEvents(), ...this.drillEventQueue] as DrillEvent[];
    this.drillEventQueue = [];
    return events;
  }

  update(dt: number) {
    if (this.drillState.completed) return;

    super.update(dt);
    this.drillState.timeLeft = this.timeLeft;

    // Track drill-specific objectives
    this.trackObjectives();

    // Check time warning
    if (this.timeLeft <= 10000 && this.timeLeft > 9900) {
      const tip = this.drill.coaching.find(c => c.trigger === "timeout_warning");
      if (tip) this.emitDrill({ type: "coach", message: tip.message });
    }

    // Check completion
    if (this.timeLeft <= 0 || this.allObjectivesMet()) {
      this.completeDrill();
    }
  }

  private trackObjectives() {
    switch (this.drill.id) {
      case "find-the-pass":
        this.trackPassing();
        break;
      case "find-space":
        this.trackSpaceFinding();
        break;
      case "press-the-ball":
        this.trackPressing();
        break;
    }
  }

  private trackPassing() {
    // Detect when you successfully pass to a teammate
    // We hook into the engine's event stream to detect completed passes
    const events = super.flushEvents();
    for (const ev of events) {
      this.drillEventQueue.push(ev);

      if (ev.type === "coach") {
        if (ev.message.includes("Good ball") || ev.message.includes("passed")) {
          this.incrementObjective("passes");
          const tip = this.drill.coaching.find(c => c.trigger === "pass_complete");
          if (tip) this.emitDrill({ type: "coach", message: tip.message });
        }
        if (ev.message.includes("Intercepted") || ev.message.includes("cut out")) {
          const tip = this.drill.coaching.find(c => c.trigger === "pass_intercepted");
          if (tip) this.emitDrill({ type: "coach", message: tip.message });
        }
      }
    }

    // Idle check: if you have the ball and aren't moving
    if (this.youHasBall) {
      this.drillState.idleFrames++;
      if (this.drillState.idleFrames > 120) {
        this.drillState.idleFrames = 0;
        const tip = this.drill.coaching.find(c => c.trigger === "idle");
        if (tip) this.emitDrill({ type: "coach", message: tip.message });
      }
    } else {
      this.drillState.idleFrames = 0;
    }
  }

  private trackSpaceFinding() {
    if (this.drillState.spaceCheckCooldown > 0) {
      this.drillState.spaceCheckCooldown--;
      return;
    }

    // Check if player is in any target zone AND far enough from defenders
    for (const zone of this.drillState.zones) {
      if (
        this.you.x >= zone.x && this.you.x <= zone.x + zone.w &&
        this.you.y >= zone.y && this.you.y <= zone.y + zone.h
      ) {
        // Check distance to nearest opponent
        let nearestOppDist = Infinity;
        for (const opp of this.opps) {
          const d = Math.hypot(this.you.x - opp.x, this.you.y - opp.y);
          if (d < nearestOppDist) nearestOppDist = d;
        }

        if (nearestOppDist > 50) {
          this.incrementObjective("space_found");
          this.drillState.spaceCheckCooldown = 90; // ~1.5s cooldown
          const tip = this.drill.coaching.find(c => c.trigger === "space_found");
          if (tip) this.emitDrill({ type: "coach", message: tip.message });
          this.emitDrill({ type: "drill:zoneEnter", zoneLabel: zone.label || "Zone" });
        } else if (nearestOppDist < 30) {
          const tip = this.drill.coaching.find(c => c.trigger === "too_close_to_defender");
          if (tip) {
            this.drillState.spaceCheckCooldown = 60;
            this.emitDrill({ type: "coach", message: tip.message });
          }
        }
      }
    }

    // Standing still check
    const dx = Math.abs(this.you.x - (this.you.px ?? this.you.x));
    const dy = Math.abs(this.you.y - (this.you.py ?? this.you.y));
    if (dx < 0.3 && dy < 0.3) {
      this.drillState.idleFrames++;
      if (this.drillState.idleFrames > 150) {
        this.drillState.idleFrames = 0;
        const tip = this.drill.coaching.find(c => c.trigger === "standing_still");
        if (tip) this.emitDrill({ type: "coach", message: tip.message });
      }
    } else {
      this.drillState.idleFrames = 0;
    }
  }

  private trackPressing() {
    if (this.drillState.pressCooldown > 0) {
      this.drillState.pressCooldown--;
      return;
    }

    // Check if user is close to the ball carrier (opponent)
    const carrier = this.ball.owner;
    if (!carrier || carrier.side === "us") return;

    const distToCarrier = Math.hypot(this.you.x - carrier.x, this.you.y - carrier.y);

    if (distToCarrier < CONTACT + 8) {
      this.incrementObjective("interceptions");
      this.drillState.pressCooldown = 90;
      const tip = this.drill.coaching.find(c => c.trigger === "press_success");
      if (tip) this.emitDrill({ type: "coach", message: tip.message });
    } else if (distToCarrier > 150) {
      this.drillState.idleFrames++;
      if (this.drillState.idleFrames > 100) {
        this.drillState.idleFrames = 0;
        const tip = this.drill.coaching.find(c => c.trigger === "too_far");
        if (tip) this.emitDrill({ type: "coach", message: tip.message });
      }
    } else {
      this.drillState.idleFrames = 0;
    }
  }

  private incrementObjective(id: string) {
    if (this.drillState.objectives[id] !== undefined) {
      this.drillState.objectives[id]++;
      this.emitDrill({
        type: "drill:objectiveProgress",
        objectiveId: id,
        current: this.drillState.objectives[id],
        target: this.drillState.targets[id],
      });
    }
  }

  private allObjectivesMet(): boolean {
    for (const [id, current] of Object.entries(this.drillState.objectives)) {
      if (current < (this.drillState.targets[id] || Infinity)) return false;
    }
    return true;
  }

  private completeDrill() {
    this.drillState.completed = true;
    this.running = false;

    // Calculate stars based on objectives met percentage
    let totalPct = 0;
    let count = 0;
    for (const [id, current] of Object.entries(this.drillState.objectives)) {
      const target = this.drillState.targets[id] || 1;
      totalPct += Math.min(1, current / target);
      count++;
    }
    const avgPct = count > 0 ? totalPct / count : 0;

    // Bonus for finishing with time remaining
    const timeBonus = this.timeLeft > 0 ? 0.1 : 0;
    const finalPct = Math.min(1, avgPct + timeBonus);

    const stars = calcStars(finalPct);
    this.drillState.stars = stars;

    const xpEarned = Math.round(this.drill.xpReward * (stars / 3));

    this.emitDrill({
      type: "drill:complete",
      stars,
      objectives: { ...this.drillState.objectives },
      xpEarned,
    });
  }
}
