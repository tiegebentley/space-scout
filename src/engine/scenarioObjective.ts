// Pure objective tracker for live "Scenario" lesson steps. It reduces the
// engine's possession / goal / stateChange events into objective progress. No
// engine internals or DOM — fully unit-testable.
import type { ScenarioObjective } from "@/types/game";
import type { EngineEvent } from "./GameEngine";

export interface ObjectiveState {
  progress: number;   // current count / elapsed (units depend on type)
  target: number;     // what progress must reach
  done: boolean;      // objective complete
  failed: boolean;    // this attempt failed (e.g. winBack window expired)
  label: string;      // human-readable, for the HUD
}

export interface ObjectiveTracker {
  state: ObjectiveState;
  // Feed an engine event; returns the new immutable state.
  onEvent(ev: EngineEvent): ObjectiveState;
  // Feed elapsed time (ms) for time-based objectives (keepPossession/winBack).
  onTick(dtMs: number): ObjectiveState;
}

function targetOf(o: ScenarioObjective): number {
  switch (o.type) {
    case "passCount": return o.target;
    case "receiveInZone": return o.target ?? 1;
    case "score": return o.target;
    case "keepPossession": return o.seconds;
    case "winBack": return 1;
  }
}

export function createObjectiveTracker(objective: ScenarioObjective): ObjectiveTracker {
  const target = targetOf(objective);
  let progress = 0;
  let done = false;
  let failed = false;
  // keepPossession: ms of unbroken "us" possession. winBack: ms since we lost it.
  let possMs = 0;
  let usHolds = false; // currently in unbroken "us" possession (keepPossession)
  let lostMs = -1; // -1 = not currently in a "lost it" window

  const snap = (): ObjectiveState => ({ progress, target, done, failed, label: objective.label });

  const finishIfDone = () => { if (progress >= target) done = true; };

  return {
    get state() { return snap(); },

    onEvent(ev: EngineEvent): ObjectiveState {
      if (done) return snap();
      switch (objective.type) {
        case "passCount": {
          if (ev.type === "possession") {
            const isPass = ev.sameTeam && !ev.fromRestart && ev.toSide === "us";
            const toRoleOk = !objective.toRole || ev.toRole === objective.toRole;
            if (isPass && toRoleOk) { progress += 1; finishIfDone(); }
            // consecutive: a turnover to the other team resets the streak.
            else if (objective.consecutive && ev.toSide === "them") progress = 0;
          }
          break;
        }
        case "receiveInZone": {
          if (ev.type === "possession" && ev.toRole === objective.role) {
            const z = objective.zone;
            const inZone = ev.x >= z.x && ev.x <= z.x + z.w && ev.y >= z.y && ev.y <= z.y + z.h;
            if (inZone) { progress += 1; finishIfDone(); }
          }
          break;
        }
        case "score": {
          if (ev.type === "goal" && ev.team === "us") { progress += 1; finishIfDone(); }
          break;
        }
        case "keepPossession": {
          // Count only unbroken "us" possession; losing it resets the streak.
          if (ev.type === "possession") {
            if (ev.toSide === "us") usHolds = true;
            else { usHolds = false; possMs = 0; progress = 0; }
          }
          break;
        }
        case "winBack": {
          if (ev.type === "possession") {
            if (ev.toSide === "them") lostMs = 0;          // we just lost it → start window
            else if (lostMs >= 0) { progress = 1; done = true; lostMs = -1; } // regained in time
          }
          break;
        }
      }
      return snap();
    },

    onTick(dtMs: number): ObjectiveState {
      if (done) return snap();
      if (objective.type === "keepPossession") {
        if (usHolds) { possMs += dtMs; progress = Math.floor(possMs / 1000); finishIfDone(); }
      } else if (objective.type === "winBack" && lostMs >= 0) {
        lostMs += dtMs;
        if (lostMs > objective.withinSeconds * 1000) { failed = true; lostMs = -1; }
      }
      return snap();
    },
  };
}
