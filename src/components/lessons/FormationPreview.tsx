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
import { FORMATIONS, JERSEY_NUMBERS, L, R, TOP, BOT } from "@/engine/constants";
import type { ZoneRule, EngineRect } from "@/types/game";
import { labToScreen, screenToLab, VIEW_W, VIEW_H } from "./boardTransform";
import { BoardGoals } from "./BoardGoals";

const HOME = "#2E6FE0";
const AWAY = "#E0463B";

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
  placeMode?: PlaceMode;
  restartPoint?: { x: number; y: number } | null;
  objectiveZone?: EngineRect | null;
  onPlaceRestart?: (x: number, y: number) => void;
  onDrawZone?: (rect: EngineRect) => void;
}

export function FormationPreview({ format, userRole, zoneRules, placeMode, restartPoint, objectiveZone, onPlaceRestart, onDrawZone }: Props) {
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

  const onPointerDown = (e: React.PointerEvent) => {
    if (placeMode === "restart" && onPlaceRestart) {
      const p = toEngine(e.clientX, e.clientY);
      onPlaceRestart(p.x, p.y);
    } else if (placeMode === "zone" && onDrawZone) {
      const start = toEngine(e.clientX, e.clientY);
      const move = (ev: PointerEvent) => {
        const p = toEngine(ev.clientX, ev.clientY);
        setPreview({ x: Math.min(start.x, p.x), y: Math.min(start.y, p.y), w: Math.abs(p.x - start.x), h: Math.abs(p.y - start.y) });
      };
      const up = (ev: PointerEvent) => {
        const p = toEngine(ev.clientX, ev.clientY);
        const rect = { x: Math.min(start.x, p.x), y: Math.min(start.y, p.y), w: Math.abs(p.x - start.x), h: Math.abs(p.y - start.y) };
        setPreview(null);
        if (rect.w > 30 && rect.h > 30) onDrawZone(rect);
        window.removeEventListener("pointermove", move);
        window.removeEventListener("pointerup", up);
      };
      window.addEventListener("pointermove", move);
      window.addEventListener("pointerup", up);
    }
  };

  // Engine-rect → screen rect (rotated).
  const engRect = (z: EngineRect) => {
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

      {/* Boundaries / rules (us team) */}
      {(zoneRules || []).filter((z) => z.team === "us").map((z) => {
        const c1 = labToScreen(L + (R - L) * z.xMin, TOP + (BOT - TOP) * z.yMin);
        const c2 = labToScreen(L + (R - L) * z.xMax, TOP + (BOT - TOP) * z.yMax);
        return <rect key={z.id} x={Math.min(c1.sx, c2.sx)} y={Math.min(c1.sy, c2.sy)} width={Math.abs(c2.sx - c1.sx)} height={Math.abs(c2.sy - c1.sy)} fill="rgba(46,111,224,.12)" stroke="rgba(46,111,224,.7)" strokeWidth={2} strokeDasharray="8 6" rx={8} />;
      })}

      {/* Objective zone (receive-in-zone) */}
      {objectiveZone && (() => { const r = engRect(objectiveZone); return <rect x={r.x} y={r.y} width={r.w} height={r.h} fill="rgba(255,209,102,.20)" stroke="#FFD166" strokeWidth={3} strokeDasharray="10 8" rx={10} pointerEvents="none" />; })()}
      {preview && (() => { const r = engRect(preview); return <rect x={r.x} y={r.y} width={r.w} height={r.h} fill="rgba(255,209,102,.30)" stroke="#FFD166" strokeWidth={4} strokeDasharray="8 6" rx={8} pointerEvents="none" />; })()}

      {tokens.map((t, i) => (
        <g key={i}>
          <circle cx={t.x} cy={t.y} r={20} fill={t.side === "us" ? HOME : AWAY} stroke={t.you ? "#FFD166" : "rgba(255,255,255,.85)"} strokeWidth={t.you ? 5 : 2} />
          <text x={t.x} y={t.y + 6} textAnchor="middle" fontSize={18} fontWeight={800} fill="#fff" style={{ fontFamily: "Fredoka, sans-serif" }}>{t.label}</text>
        </g>
      ))}

      {/* Restart point marker */}
      {restartPoint && (() => { const s = labToScreen(restartPoint.x, restartPoint.y); return (
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
