// Static-pitch renderer for the zone editor on the setup screen.
// Draws the pitch, both teams in their kickoff formation (frozen — no match
// loop), the configured zone rules, and an in-progress draft rectangle. Kept
// separate from the live-match renderer so the setup editor never needs a
// GameEngine instance.
import type { ZoneRule, ZoneCondition } from "@/types/game";
import { W, H, L, R, TOP, BOT, GX0, GX1, FORMATIONS, JERSEY_NUMBERS } from "./constants";

export interface DraftRect { x0: number; y0: number; x1: number; y1: number }

const CONDITION_LABEL: Record<Exclude<ZoneCondition, "always" | "carrier_is">, string> = {
  attacking: "ATK",
  defending: "DEF",
  ball_own_half: "ball own ½",
  ball_opp_half: "ball opp ½",
};

function conditionTag(rule: ZoneRule): string {
  const when = rule.when;
  if (!when || when === "always") return "";
  if (when === "carrier_is") {
    const who = rule.carrierTeam === "us" ? "our" : "their";
    return `  [${who} ${rule.carrierRole ?? "?"} has ball]`;
  }
  return `  [${CONDITION_LABEL[when]}]`;
}

// depthToY: 0 = own goal line, 1 = opponent goal line, per team.
function depthToY(team: "us" | "them", depth: number): number {
  return team === "us" ? (BOT - (BOT - TOP) * depth) : (TOP + (BOT - TOP) * depth);
}

function drawPitch(ctx: CanvasRenderingContext2D) {
  const bands = 10, bh = H / bands;
  for (let i = 0; i < bands; i++) {
    ctx.fillStyle = i % 2 ? "#2F9354" : "#2B8A4E";
    ctx.fillRect(0, i * bh, W, bh);
  }
  ctx.strokeStyle = "rgba(255,255,255,.85)";
  ctx.lineWidth = 2.5;
  ctx.strokeRect(L, TOP, R - L, BOT - TOP);
  ctx.beginPath(); ctx.moveTo(L, H / 2); ctx.lineTo(R, H / 2); ctx.stroke();
  ctx.beginPath(); ctx.arc(W / 2, H / 2, 72, 0, Math.PI * 2); ctx.stroke();
  const boxW = 260, boxH = 70;
  ctx.strokeRect(W / 2 - boxW / 2, TOP, boxW, boxH);
  ctx.strokeRect(W / 2 - boxW / 2, BOT - boxH, boxW, boxH);
  ctx.lineWidth = 6;
  ctx.strokeStyle = "#ffffff";
  ctx.beginPath(); ctx.moveTo(GX0, TOP); ctx.lineTo(GX1, TOP); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(GX0, BOT); ctx.lineTo(GX1, BOT); ctx.stroke();
}

// Formation dot positions for a team in SCREEN coords. "us" attacks up (toward
// TOP), so its players sit in the lower half; "them" mirrors into the top half.
function teamDots(format: string, team: "us" | "them") {
  const formation = FORMATIONS[format] || FORMATIONS["5v5"];
  return Object.entries(formation).map(([roleKey, cfg]) => {
    // cfg.fx/fy are in team-relative frame (fy: 0 own goal → 1 opp goal).
    const fx = team === "them" ? 1 - cfg.fx : cfg.fx;
    const x = L + (R - L) * fx;
    const y = depthToY(team, cfg.fy);
    return { roleKey, x, y, num: JERSEY_NUMBERS[roleKey] ?? 0 };
  });
}

function drawDots(ctx: CanvasRenderingContext2D, format: string, highlightRole: string, highlightTeam: "us" | "them") {
  for (const team of ["us", "them"] as const) {
    for (const d of teamDots(format, team)) {
      const isHL = team === highlightTeam && d.roleKey === highlightRole;
      const fill = team === "us" ? "#2E6FE0" : "#E0463B";
      const stroke = team === "us" ? "#08285e" : "#5a120d";
      ctx.beginPath();
      ctx.arc(d.x, d.y, isHL ? 14 : 11, 0, Math.PI * 2);
      ctx.fillStyle = fill;
      ctx.fill();
      ctx.lineWidth = isHL ? 4 : 2;
      ctx.strokeStyle = isHL ? "#FFC531" : stroke;
      ctx.stroke();
      ctx.fillStyle = "#fff";
      ctx.font = "800 9px Nunito, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(String(d.num), d.x, d.y);
      ctx.textBaseline = "alphabetic";
    }
  }
}

function drawRuleBoxes(ctx: CanvasRenderingContext2D, rules: ZoneRule[], selectedId: string | null) {
  for (const rule of rules) {
    const x0 = L + (R - L) * rule.xMin;
    const x1 = L + (R - L) * rule.xMax;
    const y0 = depthToY(rule.team, rule.yMax);
    const y1 = depthToY(rule.team, rule.yMin);
    const yLo = Math.min(y0, y1);
    const yHi = Math.max(y0, y1);
    const w = x1 - x0;
    const h = yHi - yLo;
    const sel = rule.id === selectedId;
    const c = rule.team === "us" ? "46,111,224" : "224,70,59";

    ctx.fillStyle = `rgba(${c},${sel ? 0.22 : 0.12})`;
    ctx.fillRect(x0, yLo, w, h);
    ctx.strokeStyle = `rgba(${c},${sel ? 1 : 0.6})`;
    ctx.lineWidth = sel ? 3 : 2;
    ctx.setLineDash(sel ? [] : [8, 5]);
    ctx.strokeRect(x0, yLo, w, h);
    ctx.setLineDash([]);

    ctx.fillStyle = `rgba(${c},.85)`;
    ctx.font = "bold 10px Nunito, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(rule.label + conditionTag(rule), x0 + w / 2, yLo + 13);
  }
}

function drawDraft(ctx: CanvasRenderingContext2D, draft: DraftRect | null, team: "us" | "them", label: string) {
  if (!draft) return;
  const x = Math.min(draft.x0, draft.x1);
  const y = Math.min(draft.y0, draft.y1);
  const w = Math.abs(draft.x1 - draft.x0);
  const h = Math.abs(draft.y1 - draft.y0);
  const c = team === "us" ? "46,111,224" : "224,70,59";
  ctx.fillStyle = `rgba(${c},.16)`;
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = `rgba(${c},.95)`;
  ctx.lineWidth = 2.5;
  ctx.setLineDash([6, 4]);
  ctx.strokeRect(x, y, w, h);
  ctx.setLineDash([]);
  ctx.fillStyle = `rgba(${c},.95)`;
  ctx.font = "bold 11px Nunito, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(label, x + w / 2, y + 14);
}

export interface StaticPitchView {
  format: string;
  rules: ZoneRule[];
  selectedId: string | null;
  draft: DraftRect | null;
  draftTeam: "us" | "them";
  draftLabel: string;
  highlightRole: string;
  highlightTeam: "us" | "them";
}

export function renderStaticPitch(ctx: CanvasRenderingContext2D, view: StaticPitchView) {
  ctx.clearRect(0, 0, W, H);
  drawPitch(ctx);
  drawRuleBoxes(ctx, view.rules, view.selectedId);
  drawDots(ctx, view.format, view.highlightRole, view.highlightTeam);
  drawDraft(ctx, view.draft, view.draftTeam, view.draftLabel);
}

// --- screen <-> fraction conversions (mirror the engine's commitDraw math) ---
export function screenXToFrac(screenX: number): number {
  return Math.max(0, Math.min(1, (screenX - L) / (R - L)));
}
export function screenYToDepth(team: "us" | "them", screenY: number): number {
  const d = team === "us"
    ? (BOT - screenY) / (BOT - TOP)
    : (screenY - TOP) / (BOT - TOP);
  return Math.max(0, Math.min(1, d));
}

// A rule's box in screen coords (already y-sorted).
export function ruleScreenRect(rule: ZoneRule) {
  const x0 = L + (R - L) * rule.xMin;
  const x1 = L + (R - L) * rule.xMax;
  const ya = depthToY(rule.team, rule.yMax);
  const yb = depthToY(rule.team, rule.yMin);
  return { x0, x1, yLo: Math.min(ya, yb), yHi: Math.max(ya, yb) };
}

// Which part of a rule box a point is over. "nw/ne/sw/se" corners, "n/s/e/w"
// edges, "move" for the interior, or null if outside. Edge band is in px.
export type Handle = "nw" | "ne" | "sw" | "se" | "n" | "s" | "e" | "w" | "move";
export function hitTestRuleBox(rule: ZoneRule, sx: number, sy: number, band = 12): Handle | null {
  const { x0, x1, yLo, yHi } = ruleScreenRect(rule);
  if (sx < x0 - band || sx > x1 + band || sy < yLo - band || sy > yHi + band) return null;
  const nearL = Math.abs(sx - x0) <= band;
  const nearR = Math.abs(sx - x1) <= band;
  const nearT = Math.abs(sy - yLo) <= band;
  const nearB = Math.abs(sy - yHi) <= band;
  if (nearT && nearL) return "nw";
  if (nearT && nearR) return "ne";
  if (nearB && nearL) return "sw";
  if (nearB && nearR) return "se";
  if (nearT) return "n";
  if (nearB) return "s";
  if (nearL) return "w";
  if (nearR) return "e";
  // Interior
  if (sx > x0 && sx < x1 && sy > yLo && sy < yHi) return "move";
  return null;
}

// CSS cursor for a handle.
export function handleCursor(h: Handle | null): string {
  switch (h) {
    case "nw": case "se": return "nwse-resize";
    case "ne": case "sw": return "nesw-resize";
    case "n": case "s": return "ns-resize";
    case "e": case "w": return "ew-resize";
    case "move": return "move";
    default: return "crosshair";
  }
}
