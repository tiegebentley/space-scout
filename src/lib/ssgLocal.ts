// Per-device conveniences for small-sided games: saved custom games and
// personal bests. Browser storage can be unavailable (private mode, WebView
// quirks), so every access is guarded and the UI works without it.
import type { SsgConfig } from "@/engine/ssg/types";
import { sanitizeSsg, ssgSummary } from "@/engine/ssg/presets";

const GAMES_KEY = "siq-ssg-custom";
const BEST_KEY = "siq-ssg-best";

export interface SavedSsg { id: string; config: SsgConfig; savedAt: number }

function read<T>(key: string, fallback: T): T {
  try { const v = localStorage.getItem(key); return v ? (JSON.parse(v) as T) : fallback; } catch { return fallback; }
}
function write(key: string, v: unknown) {
  try { localStorage.setItem(key, JSON.stringify(v)); } catch { /* storage unavailable */ }
}

export function loadCustomGames(): SavedSsg[] {
  const list = read<SavedSsg[]>(GAMES_KEY, []);
  return Array.isArray(list) ? list.filter((g) => g && g.id && g.config).map((g) => ({ ...g, config: sanitizeSsg(g.config) })) : [];
}
export function saveCustomGame(config: SsgConfig, id?: string): SavedSsg {
  const list = loadCustomGames();
  const entry: SavedSsg = { id: id ?? `g${Date.now().toString(36)}`, config: { ...config, id: undefined }, savedAt: Date.now() };
  const next = [entry, ...list.filter((g) => g.id !== entry.id)].slice(0, 40);
  write(GAMES_KEY, next);
  return entry;
}
export function deleteCustomGame(id: string) {
  write(GAMES_KEY, loadCustomGames().filter((g) => g.id !== id));
}

export interface SsgBest { streak: number; points: number }
function bestKey(c: SsgConfig) { return `${c.name}|${ssgSummary(c)}|${c.mode}|${c.difficulty}|${c.userTeam}`; }
export function loadBest(c: SsgConfig): SsgBest | null {
  return read<Record<string, SsgBest>>(BEST_KEY, {})[bestKey(c)] ?? null;
}
/** Records a result; returns true when it beats the previous best streak. */
export function recordBest(c: SsgConfig, r: SsgBest): boolean {
  const all = read<Record<string, SsgBest>>(BEST_KEY, {});
  const prev = all[bestKey(c)];
  const better = !prev || r.streak > prev.streak;
  all[bestKey(c)] = { streak: Math.max(prev?.streak ?? 0, r.streak), points: Math.max(prev?.points ?? 0, r.points) };
  write(BEST_KEY, all);
  return better && r.streak > 0;
}
