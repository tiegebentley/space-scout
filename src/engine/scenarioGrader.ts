// Pure scenario grader — ported from soccer-iq-lab (index.html checkRelation /
// checkAllRelations / playerPassesCheck / pointInZone). No DOM, no side effects:
// given the current board positions plus a scenario's zones + relations, decide
// whether each dragged player is in a correct spot. Used by ScenarioBoard.
import { LAB_PITCH } from "@/types/lessons";
import type { BoardObject, Zone, RelationRule } from "@/types/lessons";

function pointInZone(pt: { x: number; y: number }, z: Zone): boolean {
  return pt.x >= z.x && pt.x <= z.x + z.w && pt.y >= z.y && pt.y <= z.y + z.h;
}

// Does `player` satisfy a single relation rule against the other named object?
// Missing target → vacuously true (matches the lab's lenient behavior).
export function checkRelation(
  rule: RelationRule,
  player: BoardObject,
  objects: BoardObject[]
): boolean {
  const other = objects.find((o) => o.id === rule.relativeTo);
  if (!other) return true;
  const cy = LAB_PITCH.h / 2;
  switch (rule.type) {
    case "minDistX":
      return Math.abs(player.x - other.x) >= (rule.min ?? 100);
    case "minDistY":
      return Math.abs(player.y - other.y) >= (rule.min ?? 100);
    case "mustBeAhead": // further forward = higher x when attacking right
      return player.x > other.x + (rule.margin ?? 20);
    case "mustBeBehind":
      return player.x < other.x - (rule.margin ?? 20);
    case "oppositeSideY": // opposite halves vertically
      return (player.y - cy) * (other.y - cy) < 0;
    case "sameSideY":
      return (player.y - cy) * (other.y - cy) > 0;
    case "widerThan": // further from the vertical center than the other
      return Math.abs(player.y - cy) > Math.abs(other.y - cy) + (rule.margin ?? 20);
    case "minDist": {
      const d = Math.hypot(player.x - other.x, player.y - other.y);
      return d >= (rule.min ?? 80);
    }
    case "maxDist": {
      const d = Math.hypot(player.x - other.x, player.y - other.y);
      return d <= (rule.max ?? 200);
    }
    case "relativeZone": {
      const dx = player.x - other.x;
      const dy = player.y - other.y;
      const r = rule.rect ?? { x: -100, y: -100, w: 200, h: 200 };
      return dx >= r.x && dx <= r.x + r.w && dy >= r.y && dy <= r.y + r.h;
    }
    default:
      return true;
  }
}

function checkAllRelations(
  playerId: string,
  objects: BoardObject[],
  relations: Record<string, RelationRule[]> | undefined
): boolean {
  const rules = relations?.[playerId];
  if (!rules || !rules.length) return true;
  const player = objects.find((o) => o.id === playerId);
  if (!player) return true;
  return rules.every((r) => checkRelation(r, player, objects));
}

// A player passes if it satisfies its zones (in ANY one of them) AND all of its
// relations. A player with neither constraint passes trivially.
export function playerPassesCheck(
  id: string,
  objects: BoardObject[],
  zones: Record<string, Zone | Zone[]> | undefined,
  relations: Record<string, RelationRule[]> | undefined
): boolean {
  const o = objects.find((x) => x.id === id);
  if (!o) return false;
  const pt = { x: o.x, y: o.y };
  const zoneEntry = zones?.[id];
  const zoneArr = zoneEntry ? (Array.isArray(zoneEntry) ? zoneEntry : [zoneEntry]) : [];
  const relRules = relations?.[id];
  const hasZones = zoneArr.length > 0;
  const hasRelations = !!relRules && relRules.length > 0;
  if (!hasZones && !hasRelations) return true;
  const zoneOk = !hasZones || zoneArr.some((z) => pointInZone(pt, z));
  const relOk = !hasRelations || checkAllRelations(id, objects, relations);
  return zoneOk && relOk;
}

// Grade a whole `move` scenario: every player in objectIds must pass.
export function gradeMoveScenario(
  objectIds: string[],
  objects: BoardObject[],
  zones: Record<string, Zone | Zone[]> | undefined,
  relations: Record<string, RelationRule[]> | undefined
): { allCorrect: boolean; perPlayer: Record<string, boolean> } {
  const perPlayer: Record<string, boolean> = {};
  for (const id of objectIds) {
    perPlayer[id] = playerPassesCheck(id, objects, zones, relations);
  }
  return { allCorrect: objectIds.every((id) => perPlayer[id]), perPlayer };
}
