"use client";
// Portrait preview of a match formation for the author's Scenario/Game steps —
// shows both teams' starting spots, highlights the player you control, draws
// zone-rule boundaries, and (interactively) lets you place the RESTART POINT or
// draw the objective ZONE for receive-in-zone objectives.
//
// Restart point + objective zone are in ENGINE coords (W×H), which we treat as
// lab coords for rendering (engine 900×650 ≈ lab 1000×620 — same convention the
// zone-rule overlay already uses).
import { useRef, useState } from "react";
import { FORMATIONS, JERSEY_NUMBERS, W as ENGINE_W, H as ENGINE_H } from "@/engine/constants";
import type { ZoneRule, EngineRect } from "@/types/game";
import { LAB_PITCH } from "@/types/lessons";
import { labToScreen, screenToLab, VIEW_W, VIEW_H } from "./boardTransform";
import { BoardGoals } from "./BoardGoals";

const HOME = "#2E6FE0";
const AWAY = "#E0463B";

// ── Zone-rule box ↔ screen mapping ──────────────────────────────────────────
// A ZoneRule's fractions follow the ENGINE convention (see engine/renderer.ts
// drawRuleBoxes + GameEngine.clampToZoneRules + data/zonePresets.ts):
//   • yMin/yMax = DEPTH   (0 = own goal, 1 = opponent goal)   → the attacking axis
//   • xMin/xMax = FLANK   (0 = left touchline, 1 = right)     → the sideways axis
// This editor is the live pitch rotated to portrait with "us" attacking UP, so:
//   depth → lab X (0..PW) → screen vertical   (labToScreen maps labX → sy)
//   flank → lab Y (0..PH) → screen horizontal (labToScreen maps labY → sx)
// Two prior bugs lived here: (1) depth/flank were SWAPPED (boxes rendered on the
// wrong axis vs the live game), and (2) fractions were mapped over the engine's
// inset L/R/TOP/BOT pixel bounds, making each goal's final ~12% of the pitch
// unreachable when drawing/dragging. Both are fixed by mapping over the full
// lab pitch on the correct axis — exactly how the player dots (spotToScreen) map.
const PW = LAB_PITCH.w; // 1000 — depth axis length
const PH = LAB_PITCH.h; // 620  — flank axis length
// "us" attacks UP: depth 0 (own goal) sits at the BOTTOM (labX 0 → sy=PW), depth
// 1 (opp goal) at the TOP (labX PW → sy=0). So depth fraction d → labX = d*PW.
const depthToLabX = (d: number) => d * PW;
const flankToLabY = (f: number) => f * PH;
// Screen rect (sx,sy,w,h in viewBox units) for a rule's fractional bounds.
const ruleScreenRect = (xMin: number, xMax: number, yMin: number, yMax: number) => {
  const c1 = labToScreen(depthToLabX(yMin), flankToLabY(xMin));
  const c2 = labToScreen(depthToLabX(yMax), flankToLabY(xMax));
  return {
    sx: Math.min(c1.sx, c2.sx), sy: Math.min(c1.sy, c2.sy),
    w: Math.abs(c2.sx - c1.sx), h: Math.abs(c2.sy - c1.sy),
  };
};

// The restart point + objective zone are consumed by the ENGINE in its own
// coords (ENGINE_W×ENGINE_H = 900×650), but the board works in LAB coords
// (1000×620). CRUCIALLY the two assign X/Y to OPPOSITE physical axes:
//   • lab:    X = depth (own→opp goal, 0..PW),   Y = flank (touchline→touchline)
//   • engine: X = flank (left→right, 0..ENGINE_W), Y = depth (own→opp goal)
// (see spotToScreen above: labX = depth*1000, labY = flank*620; and the engine's
// homeXY: x from flank, y = depthToY(depth)). So the conversion must SWAP axes —
// not doing so put a left-touchline-at-halfway marker up at the opposition goal.
// The depth axis also FLIPS direction, not just axes. On this board "us" attacks
// UP: own goal sits at the BOTTOM (labToScreen: sy = PW - labX, so labX 0 → screen
// bottom). In the engine, depthToY("us", d) = BOT - (BOT-TOP)*d, so OUR own goal
// is at high y (BOT, the bottom) and the opponent goal at low y (TOP). Mapping
// labX → engineY linearly (labX 0 → engineY 0) put own-goal content at engineY 0
// = the TOP = opponent goal — so an author-drawn build-up zone showed up at the
// far end in play. Invert the depth axis (labX 0 ↔ engineY ENGINE_H) to line the
// two up. Used for BOTH the objective zone and the restart point.
const labToEngine = (lx: number, ly: number) => ({
  x: (ly / PH) * ENGINE_W,           // engine flank-X  ← lab flank-Y
  y: (1 - lx / PW) * ENGINE_H,       // engine depth-Y  ← lab depth-X (flipped)
});
const engineToLab = (ex: number, ey: number) => ({
  x: (1 - ey / ENGINE_H) * PW,       // lab depth-X  ← engine depth-Y (flipped)
  y: (ex / ENGINE_W) * PH,           // lab flank-Y  ← engine flank-X
});
// Engine point → board screen coords (for drawing the saved marker/zone).
const engineToScreen = (ex: number, ey: number) => {
  const l = engineToLab(ex, ey);
  return labToScreen(l.x, l.y);
};

function spotToScreen(fx: number, fy: number, side: "us" | "them") {
  const labX = (side === "us" ? fy : 1 - fy) * 1000;
  const labY = fx * 620;
  return labToScreen(labX, labY);
}

type PlaceMode = "restart" | "zone" | null;

interface Props {
  format: "3v3" | "5v5" | "7v7";
  userRole?: string;
  zoneRules?: ZoneRule[];
  // interactive authoring:
  placeMode?: PlaceMode | `rule:${string}`;
  restartPoint?: { x: number; y: number } | null;
  objectiveZone?: EngineRect | null;
  selectedRuleId?: string | null;
  onPlaceRestart?: (x: number, y: number) => void;
  onDrawZone?: (rect: EngineRect) => void;
  // Draw / move / resize a zone-rule box; bounds are fractional 0..1.
  onDrawRule?: (id: string, bounds: RuleBounds) => void;
  onUpdateRule?: (id: string, bounds: RuleBounds) => void;
  onSelectRule?: (id: string) => void;
  onDeleteRule?: (id: string) => void;
}

type RuleBounds = { xMin: number; xMax: number; yMin: number; yMax: number };

export function FormationPreview({ format, userRole, zoneRules, placeMode, restartPoint, objectiveZone, selectedRuleId, onPlaceRestart, onDrawZone, onDrawRule, onUpdateRule, onSelectRule, onDeleteRule }: Props) {
  const formation = FORMATIONS[format] || FORMATIONS["5v5"];
  const roles = Object.keys(formation);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [preview, setPreview] = useState<EngineRect | null>(null);

  const tokens: { x: number; y: number; side: "us" | "them"; label: string; you: boolean }[] = [];
  for (const side of ["us", "them"] as const) {
    tokens.push({ ...gkScreen(side), side, label: "1", you: false });
    for (const r of roles) {
      const cfg = formation[r];
      const s = spotToScreen(cfg.fx, cfg.fy, side);
      tokens.push({ x: s.sx, y: s.sy, side, label: String(JERSEY_NUMBERS[r] ?? "?"), you: side === "us" && r === userRole });
    }
  }

  // Screen pointer → engine coords (treated as lab coords here).
  const toEngine = (cx: number, cy: number) => {
    const svg = svgRef.current!;
    const rb = svg.getBoundingClientRect();
    const sx = ((cx - rb.left) / rb.width) * VIEW_W;
    const sy = ((cy - rb.top) / rb.height) * VIEW_H;
    const { x, y } = screenToLab(sx, sy);
    return { x: Math.round(x), y: Math.round(y) };
  };

  // Screen pointer → fractional zone-rule bounds (0..1). e.x is the lab DEPTH
  // axis (→ yMin/yMax), e.y the lab FLANK axis (→ xMin/xMax). Mapped over the
  // full lab pitch so a box reaches either goal line.
  //   fx = flank fraction (xMin/xMax), fy = depth fraction (yMin/yMax)
  const toFraction = (cx: number, cy: number) => {
    const e = toEngine(cx, cy);
    return { fx: e.y / PH, fy: e.x / PW };
  };
  const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

  // Drag a rule box (move whole box, or resize via its corner). Works in
  // fractional space so it round-trips cleanly to the ZoneRule bounds.
  const onRuleDown = (rule: ZoneRule, handle: "move" | "se") => (e: React.PointerEvent) => {
    e.stopPropagation();
    onSelectRule?.(rule.id);
    if (!onUpdateRule) return;
    const orig: RuleBounds = { xMin: rule.xMin, xMax: rule.xMax, yMin: rule.yMin, yMax: rule.yMax };
    const w = orig.xMax - orig.xMin, h = orig.yMax - orig.yMin;
    if (handle === "move") {
      const start = toFraction(e.clientX, e.clientY);
      const move = (ev: PointerEvent) => {
        const p = toFraction(ev.clientX, ev.clientY);
        const nx = clamp01(Math.min(orig.xMin + (p.fx - start.fx), 1 - w));
        const ny = clamp01(Math.min(orig.yMin + (p.fy - start.fy), 1 - h));
        onUpdateRule(rule.id, { xMin: nx, yMin: ny, xMax: nx + w, yMax: ny + h });
      };
      const up = () => { window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", up); };
      window.addEventListener("pointermove", move); window.addEventListener("pointerup", up);
      return;
    }
    // Resize: pin the SCREEN corner diagonally opposite the handle, and let the
    // pointer drive the dragged corner — robust to the board's rotation. Both
    // screen corners are converted back to fractions and normalized.
    const rs = ruleScreenRect(orig.xMin, orig.xMax, orig.yMin, orig.yMax);
    const anchorScreen = { sx: rs.sx, sy: rs.sy }; // screen NW (fixed)
    const move = (ev: PointerEvent) => {
      const a = toFraction(anchorScreenToClient(anchorScreen).x, anchorScreenToClient(anchorScreen).y);
      const p = toFraction(ev.clientX, ev.clientY);
      const b: RuleBounds = {
        xMin: clamp01(Math.min(a.fx, p.fx)), xMax: clamp01(Math.max(a.fx, p.fx)),
        yMin: clamp01(Math.min(a.fy, p.fy)), yMax: clamp01(Math.max(a.fy, p.fy)),
      };
      if (b.xMax - b.xMin < 0.05) b.xMax = b.xMin + 0.05;
      if (b.yMax - b.yMin < 0.05) b.yMax = b.yMin + 0.05;
      onUpdateRule(rule.id, b);
    };
    const up = () => { window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", up); };
    window.addEventListener("pointermove", move); window.addEventListener("pointerup", up);
  };

  // SVG-screen coords → client (px) so we can feed them back through toFraction.
  const anchorScreenToClient = (s: { sx: number; sy: number }) => {
    const svg = svgRef.current!; const rb = svg.getBoundingClientRect();
    return { x: rb.left + (s.sx / VIEW_W) * rb.width, y: rb.top + (s.sy / VIEW_H) * rb.height };
  };

  const ruleId = typeof placeMode === "string" && placeMode.startsWith("rule:") ? placeMode.slice(5) : null;

  const onPointerDown = (e: React.PointerEvent) => {
    if (placeMode === "restart" && onPlaceRestart) {
      const lab = toEngine(e.clientX, e.clientY); // (lab coords, despite the name)
      const eng = labToEngine(lab.x, lab.y);      // store in engine coords
      onPlaceRestart(Math.round(eng.x), Math.round(eng.y));
    } else if ((placeMode === "zone" && onDrawZone) || (ruleId && onDrawRule)) {
      const start = toEngine(e.clientX, e.clientY);
      const move = (ev: PointerEvent) => {
        const p = toEngine(ev.clientX, ev.clientY);
        setPreview({ x: Math.min(start.x, p.x), y: Math.min(start.y, p.y), w: Math.abs(p.x - start.x), h: Math.abs(p.y - start.y) });
      };
      const up = (ev: PointerEvent) => {
        const p = toEngine(ev.clientX, ev.clientY);
        const rect = { x: Math.min(start.x, p.x), y: Math.min(start.y, p.y), w: Math.abs(p.x - start.x), h: Math.abs(p.y - start.y) };
        setPreview(null);
        if (rect.w > 30 && rect.h > 30) {
          if (ruleId && onDrawRule) {
            // toEngine's x is the DEPTH axis (→ yMin/yMax), y the FLANK axis
            // (→ xMin/xMax). Map each over the full pitch (0..PW depth, 0..PH flank).
            const yMin = rect.x / PW, yMax = (rect.x + rect.w) / PW;
            const xMin = rect.y / PH, xMax = (rect.y + rect.h) / PH;
            onDrawRule(ruleId, {
              xMin: Math.max(0, Math.min(1, xMin)), xMax: Math.max(0, Math.min(1, xMax)),
              yMin: Math.max(0, Math.min(1, yMin)), yMax: Math.max(0, Math.min(1, yMax)),
            });
          } else if (onDrawZone) {
            // rect is in lab coords; the engine consumes the zone in engine
            // coords. labToEngine SWAPS axes, so normalize the two converted
            // corners into a positive-size engine rect.
            const a = labToEngine(rect.x, rect.y);
            const b = labToEngine(rect.x + rect.w, rect.y + rect.h);
            const x = Math.min(a.x, b.x), y = Math.min(a.y, b.y);
            onDrawZone({
              x: Math.round(x), y: Math.round(y),
              w: Math.round(Math.abs(b.x - a.x)), h: Math.round(Math.abs(b.y - a.y)),
            });
          }
        }
        window.removeEventListener("pointermove", move);
        window.removeEventListener("pointerup", up);
      };
      window.addEventListener("pointermove", move);
      window.addEventListener("pointerup", up);
    }
  };

  // Engine-coord rect (the SAVED objective zone) → screen rect (rotated).
  const engRect = (z: EngineRect) => {
    const c1 = engineToScreen(z.x, z.y), c2 = engineToScreen(z.x + z.w, z.y + z.h);
    return { x: Math.min(c1.sx, c2.sx), y: Math.min(c1.sy, c2.sy), w: Math.abs(c2.sx - c1.sx), h: Math.abs(c2.sy - c1.sy) };
  };
  // Lab-coord rect (the in-progress drag PREVIEW) → screen rect (rotated).
  const labRect = (z: EngineRect) => {
    const c1 = labToScreen(z.x, z.y), c2 = labToScreen(z.x + z.w, z.y + z.h);
    return { x: Math.min(c1.sx, c2.sx), y: Math.min(c1.sy, c2.sy), w: Math.abs(c2.sx - c1.sx), h: Math.abs(c2.sy - c1.sy) };
  };

  return (
    <svg ref={svgRef} viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
      onPointerDown={onPointerDown}
      className={`w-full max-w-[420px] mx-auto block rounded-2xl border-2 shadow-sm ${placeMode ? "border-[#FFD166] cursor-crosshair touch-none select-none" : "border-[rgba(20,60,35,.15)]"}`}>
      {Array.from({ length: 10 }).map((_, i) => (
        <rect key={i} x={0} y={(VIEW_H / 10) * i} width={VIEW_W} height={VIEW_H / 10} fill={i % 2 ? "#2F9354" : "#2B8A4E"} />
      ))}
      <rect x={6} y={6} width={VIEW_W - 12} height={VIEW_H - 12} fill="none" stroke="rgba(255,255,255,.7)" strokeWidth={3} rx={10} />
      <line x1={6} y1={VIEW_H / 2} x2={VIEW_W - 6} y2={VIEW_H / 2} stroke="rgba(255,255,255,.7)" strokeWidth={3} />
      <circle cx={VIEW_W / 2} cy={VIEW_H / 2} r={70} fill="none" stroke="rgba(255,255,255,.7)" strokeWidth={3} />
      <rect x={VIEW_W / 2 - 130} y={6} width={260} height={110} fill="none" stroke="rgba(255,255,255,.55)" strokeWidth={3} />
      <rect x={VIEW_W / 2 - 130} y={VIEW_H - 116} width={260} height={110} fill="none" stroke="rgba(255,255,255,.55)" strokeWidth={3} />
      <BoardGoals />

      {/* Boundaries / rules (both teams) — drag to move, corner to resize, × to
          delete. The selected rule shows its handles. Interactive only when the
          edit callbacks are provided (i.e. in the author). */}
      {(zoneRules || []).map((z) => {
        const { sx: x, sy: y, w, h } = ruleScreenRect(z.xMin, z.xMax, z.yMin, z.yMax);
        const blue = z.team === "us";
        const sel = z.id === selectedRuleId;
        const interactive = !!onUpdateRule;
        // Only the SELECTED rule's box is editable (move/resize/delete). Unselected
        // boxes are locked: view-only, pointer-through, and dimmed — so you can't
        // accidentally drag a box you didn't pick in the rule list.
        const editable = interactive && sel;
        return (
          <g key={z.id}>
            <rect x={x} y={y} width={w} height={h}
              fill={blue ? "rgba(46,111,224,.12)" : "rgba(224,70,59,.12)"} stroke={blue ? "rgba(46,111,224,.8)" : "rgba(224,70,59,.8)"}
              strokeWidth={sel ? 4 : 2} strokeDasharray="8 6" rx={8} opacity={interactive && !sel ? 0.55 : 1}
              style={editable ? { cursor: "move" } : undefined}
              pointerEvents={editable ? undefined : "none"}
              onPointerDown={editable ? onRuleDown(z, "move") : undefined} />
            {editable && <>
              <circle cx={x + w} cy={y + h} r={10} fill="#FFD166" stroke="#16241c" strokeWidth={2} style={{ cursor: "nwse-resize" }} onPointerDown={onRuleDown(z, "se")} />
              <g style={{ cursor: "pointer" }} onPointerDown={(e) => { e.stopPropagation(); onDeleteRule?.(z.id); }}>
                <circle cx={x + w} cy={y} r={10} fill="#E0463B" stroke="#fff" strokeWidth={2} />
                <text x={x + w} y={y + 4} textAnchor="middle" fontSize={13} fontWeight={900} fill="#fff" style={{ pointerEvents: "none" }}>×</text>
              </g>
            </>}
          </g>
        );
      })}

      {/* Objective zone (receive-in-zone) */}
      {objectiveZone && (() => { const r = engRect(objectiveZone); return <rect x={r.x} y={r.y} width={r.w} height={r.h} fill="rgba(255,209,102,.20)" stroke="#FFD166" strokeWidth={3} strokeDasharray="10 8" rx={10} pointerEvents="none" />; })()}
      {preview && (() => { const r = labRect(preview); return <rect x={r.x} y={r.y} width={r.w} height={r.h} fill="rgba(255,209,102,.30)" stroke="#FFD166" strokeWidth={4} strokeDasharray="8 6" rx={8} pointerEvents="none" />; })()}

      {tokens.map((t, i) => (
        <g key={i}>
          <circle cx={t.x} cy={t.y} r={20} fill={t.side === "us" ? HOME : AWAY} stroke={t.you ? "#FFD166" : "rgba(255,255,255,.85)"} strokeWidth={t.you ? 5 : 2} />
          <text x={t.x} y={t.y + 6} textAnchor="middle" fontSize={18} fontWeight={800} fill="#fff" style={{ fontFamily: "Fredoka, sans-serif" }}>{t.label}</text>
        </g>
      ))}

      {/* Restart point marker */}
      {restartPoint && (() => { const s = engineToScreen(restartPoint.x, restartPoint.y); return (
        <g pointerEvents="none">
          <circle cx={s.sx} cy={s.sy} r={13} fill="#FFD166" stroke="#16241c" strokeWidth={2} />
          <text x={s.sx} y={s.sy + 4} textAnchor="middle" fontSize={12} fontWeight={900} fill="#16241c">⚽</text>
        </g>
      ); })()}
    </svg>
  );
}

function gkScreen(side: "us" | "them") {
  const s = side === "us" ? labToScreen(40, 310) : labToScreen(960, 310);
  return { x: s.sx, y: s.sy };
}
