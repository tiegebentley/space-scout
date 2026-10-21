import type { SsgConfig } from "./types";
import { DEFAULT_SSG } from "./SmallSidedEngine";

export interface SsgPreset {
  id: string;
  group: "rondo" | "possession";
  blurb: string;
  config: SsgConfig;
}

const base = DEFAULT_SSG;

export const SSG_PRESETS: SsgPreset[] = [
  {
    id: "rondo-3v1", group: "rondo",
    blurb: "The classic starter. Three on the outside, one in the middle — make the triangle.",
    config: { ...base, name: "Rondo 3v1", teamA: 3, teamB: 1, boxW: 11, boxH: 11, passesForPoint: 8 },
  },
  {
    id: "rondo-4v1", group: "rondo",
    blurb: "Four sides of the box. Give your teammate an angle and play away from pressure.",
    config: { ...base, name: "Rondo 4v1", teamA: 4, teamB: 1, boxW: 10, boxH: 10, passesForPoint: 10 },
  },
  {
    id: "rondo-4v2", group: "rondo",
    blurb: "Two in the middle. Look for the split pass between the defenders.",
    config: { ...base, name: "Rondo 4v2", teamA: 4, teamB: 2, boxW: 13, boxH: 13, passesForPoint: 8 },
  },
  {
    id: "rondo-5v2", group: "rondo",
    blurb: "Bigger rondo, more angles. Quick ball, scan before you receive.",
    config: { ...base, name: "Rondo 5v2", teamA: 5, teamB: 2, boxW: 13, boxH: 13, passesForPoint: 10 },
  },
  {
    id: "poss-4v4-2n", group: "possession",
    blurb: "Even teams plus two neutrals who always play with the ball. 5 passes = a point.",
    config: { ...base, name: "4v4 + 2 Neutrals", mode: "possession", perimeter: false, swapOnTurnover: false,
      teamA: 4, teamB: 4, neutrals: 2, boxW: 24, boxH: 30, passesForPoint: 5, touchLimit: 0, duration: 180 },
  },
  {
    id: "poss-3v3-4b", group: "possession",
    blurb: "3v3 inside, a bumper on every side. Use the wall pass to escape pressure.",
    config: { ...base, name: "3v3 + 4 Bumpers", mode: "possession", perimeter: false, swapOnTurnover: false,
      teamA: 3, teamB: 3, bumpers: 4, boxW: 20, boxH: 24, passesForPoint: 5, touchLimit: 2, duration: 180 },
  },
  {
    id: "poss-5v3", group: "possession",
    blurb: "Uneven numbers. Use the overload — find the free player before they close you down.",
    config: { ...base, name: "5v3 Overload", mode: "possession", perimeter: false, swapOnTurnover: false,
      teamA: 5, teamB: 3, boxW: 24, boxH: 28, passesForPoint: 8, touchLimit: 0, duration: 180 },
  },
  {
    id: "poss-4v3-1n-2b", group: "possession",
    blurb: "4v3 with a neutral inside and bumpers at each end. Switch play end to end.",
    config: { ...base, name: "4v3 + Neutral + 2 Bumpers", mode: "possession", perimeter: false, swapOnTurnover: false,
      teamA: 4, teamB: 3, neutrals: 1, bumpers: 2, boxW: 22, boxH: 30, passesForPoint: 6, touchLimit: 0, duration: 180 },
  },
];

export const SSG_LIMITS = {
  team: [1, 7] as const,
  neutrals: [0, 3] as const,
  bumpers: [0, 4] as const,
  box: [8, 40] as const,
  passes: [3, 15] as const,
};

/** Clamp/validate a config (from a link or the builder) into a playable one. */
export function sanitizeSsg(c: Partial<SsgConfig>): SsgConfig {
  const n = (v: unknown, lo: number, hi: number, d: number) => {
    const x = typeof v === "number" && Number.isFinite(v) ? Math.round(v) : d;
    return Math.min(hi, Math.max(lo, x));
  };
  const mode = c.mode === "possession" ? "possession" : "rondo";
  const teamA = n(c.teamA, 1, 7, base.teamA);
  const teamB = n(c.teamB, 1, 7, base.teamB);
  const neutrals = n(c.neutrals, 0, 3, 0);
  const bumpers = n(c.bumpers, 0, 4, 0);
  // You need at least one other player to pass to.
  const fixedA = teamA + neutrals + bumpers < 2 ? 2 : teamA;
  return {
    ...base,
    name: typeof c.name === "string" && c.name.trim() ? c.name.trim().slice(0, 40) : "Custom game",
    mode,
    boxW: n(c.boxW, 8, 40, base.boxW),
    boxH: n(c.boxH, 8, 40, base.boxH),
    teamA: fixedA,
    teamB,
    neutrals,
    bumpers,
    perimeter: mode === "rondo" ? c.perimeter !== false : false,
    swapOnTurnover: mode === "rondo" ? c.swapOnTurnover !== false : false,
    passesForPoint: n(c.passesForPoint, 3, 15, mode === "rondo" ? 10 : 6),
    touchLimit: c.touchLimit === 1 || c.touchLimit === 2 ? c.touchLimit : 0,
    duration: [60, 120, 180, 300].includes(c.duration as number) ? (c.duration as number) : 120,
    userTeam: c.userTeam === "B" ? "B" : "A",
    difficulty: (["easy", "medium", "hard", "elite"] as const).includes(c.difficulty as never) ? c.difficulty! : "medium",
    speed: c.speed === 0.8 || c.speed === 1.2 ? c.speed : 1,
  };
}

/** Compact, URL-safe encoding so a custom game can be shared as a link. */
export function encodeSsg(c: SsgConfig): string {
  const json = JSON.stringify(c);
  const b64 = typeof window === "undefined" ? Buffer.from(json).toString("base64") : btoa(unescape(encodeURIComponent(json)));
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
export function decodeSsg(s: string): SsgConfig | null {
  try {
    const b64 = s.replace(/-/g, "+").replace(/_/g, "/");
    const json = typeof window === "undefined" ? Buffer.from(b64, "base64").toString() : decodeURIComponent(escape(atob(b64)));
    return sanitizeSsg(JSON.parse(json));
  } catch { return null; }
}

/** One-line summary: "4v1 · 12×12 yd · 2-touch". */
export function ssgSummary(c: SsgConfig): string {
  const parts = [`${c.teamA}v${c.teamB}`];
  if (c.neutrals) parts[0] += ` +${c.neutrals}N`;
  if (c.bumpers) parts[0] += ` +${c.bumpers}B`;
  parts.push(`${c.boxW}×${c.boxH} yd`);
  parts.push(c.touchLimit === 1 ? "1-touch" : c.touchLimit === 2 ? "2-touch" : "free play");
  return parts.join(" · ");
}
