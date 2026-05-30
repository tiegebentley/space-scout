"use client";
// Editable scenario board for the author. Same portrait orientation + lab-coord
// model as ScenarioBoard, but every object is movable and you can add/remove
// players, the ball, and an answer arrow, plus draw target zones for the answer
// players. Emits changes back to the author page via callbacks.
import { useCallback, useRef } from "react";
import { clsx } from "clsx";
import { LAB_PITCH } from "@/types/lessons";
import type { BoardObject, Zone } from "@/types/lessons";
import { labToScreen, screenToLab, VIEW_W, VIEW_H } from "./boardTransform";

const PW = LAB_PITCH.w;
const PH = LAB_PITCH.h;
const HOME = "#2E6FE0";
const AWAY = "#E0463B";
const R = 22;

export type AuthorTool =
  | { kind: "select" }
  | { kind: "drawZone"; forId: string }; // dragging makes a zone for this answer player

interface Props {
  objects: BoardObject[];
  setObjects: (next: BoardObject[]) => void;
  answerMode: "move" | "choice" | "arrow" | "info";
  answerIds: string[];                 // highlighted answer players (move/info)
  arrowId: string | null;              // the answer arrow (arrow mode)
  zones: Record<string, Zone | Zone[]>;
  setZone: (id: string, z: Zone) => void;
  tool: AuthorTool;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
}

export function AuthorBoard({
  objects, setObjects, answerMode, answerIds, arrowId, zones, setZone, tool, selectedId, onSelect,
}: Props) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const drag = useRef<{ id: string; end?: "tip" | "tail" } | null>(null);
  const zoneDraw = useRef<{ forId: string; x0: number; y0: number } | null>(null);

  const toLab = useCallback((cx: number, cy: number) => {
    const svg = svgRef.current;
    if (!svg) return { x: 0, y: 0 };
    const r = svg.getBoundingClientRect();
    const sx = ((cx - r.left) / r.width) * VIEW_W;
    const sy = ((cy - r.top) / r.height) * VIEW_H;
    const { x, y } = screenToLab(sx, sy);
    return { x: clamp(x, 0, PW), y: clamp(y, 0, PH) };
  }, []);

  const onSvgPointerDown = (e: React.PointerEvent) => {
    // Start a zone-draw if the active tool is drawZone (and not on a token).
    if (tool.kind === "drawZone") {
      const { x, y } = toLab(e.clientX, e.clientY);
      zoneDraw.current = { forId: tool.forId, x0: x, y0: y };
      (e.currentTarget as Element).setPointerCapture?.(e.pointerId);
    }
  };

  const onObjPointerDown = (id: string, end?: "tip" | "tail") => (e: React.PointerEvent) => {
    if (tool.kind === "drawZone") return; // zone tool ignores tokens
    e.stopPropagation();
    onSelect(id);
    drag.current = { id, end };
    (e.target as Element).setPointerCapture?.(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (drag.current) {
      const { x, y } = toLab(e.clientX, e.clientY);
      const { id, end } = drag.current;
      setObjects(objects.map((o) => {
        if (o.id !== id) return o;
        if (o.type === "arrow") return end === "tail" ? { ...o, x1: x, y1: y } : { ...o, x2: x, y2: y };
        return { ...o, x, y };
      }));
    } else if (zoneDraw.current) {
      // live preview handled by reading zoneDraw in render via state? keep simple:
      // we only commit on pointer up.
    }
  };

  const onPointerUp = (e: React.PointerEvent) => {
    if (drag.current) { drag.current = null; return; }
    if (zoneDraw.current) {
      const { x, y } = toLab(e.clientX, e.clientY);
      const z = zoneDraw.current;
      const rect: Zone = {
        x: Math.round(Math.min(z.x0, x)),
        y: Math.round(Math.min(z.y0, y)),
        w: Math.round(Math.abs(x - z.x0)),
        h: Math.round(Math.abs(y - z.y0)),
      };
      if (rect.w > 20 && rect.h > 20) setZone(z.forId, rect);
      zoneDraw.current = null;
    }
  };

  const zoneRect = (z: Zone, key: string, active: boolean) => {
    const c1 = labToScreen(z.x, z.y), c2 = labToScreen(z.x + z.w, z.y + z.h);
    return (
      <rect key={key} x={Math.min(c1.sx, c2.sx)} y={Math.min(c1.sy, c2.sy)}
        width={Math.abs(c2.sx - c1.sx)} height={Math.abs(c2.sy - c1.sy)}
        fill={active ? "rgba(255,209,102,.22)" : "rgba(255,209,102,.12)"}
        stroke="rgba(255,209,102,.9)" strokeWidth={3} strokeDasharray="10 8" rx={10} />
    );
  };

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
      className={clsx("w-full max-w-[420px] mx-auto block rounded-2xl border-2 touch-none select-none shadow-sm",
        tool.kind === "drawZone" ? "border-[#FFD166] cursor-crosshair" : "border-[rgba(20,60,35,.15)]")}
      onPointerDown={onSvgPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerLeave={onPointerUp}
    >
      {Array.from({ length: 10 }).map((_, i) => (
        <rect key={i} x={0} y={(VIEW_H / 10) * i} width={VIEW_W} height={VIEW_H / 10} fill={i % 2 ? "#2F9354" : "#2B8A4E"} />
      ))}
      <rect x={6} y={6} width={VIEW_W - 12} height={VIEW_H - 12} fill="none" stroke="rgba(255,255,255,.7)" strokeWidth={3} rx={10} />
      <line x1={6} y1={VIEW_H / 2} x2={VIEW_W - 6} y2={VIEW_H / 2} stroke="rgba(255,255,255,.7)" strokeWidth={3} />
      <circle cx={VIEW_W / 2} cy={VIEW_H / 2} r={70} fill="none" stroke="rgba(255,255,255,.7)" strokeWidth={3} />

      {/* Existing zones for answer players */}
      {answerMode === "move" && answerIds.map((id) => {
        const z = zones[id];
        if (!z) return null;
        const arr = Array.isArray(z) ? z : [z];
        return arr.map((zz, i) => zoneRect(zz, `z-${id}-${i}`, tool.kind === "drawZone" && tool.forId === id));
      })}

      {/* Tokens */}
      {objects.map((o) => {
        if (o.type === "arrow") {
          const a = labToScreen(o.x1 ?? o.x, o.y1 ?? o.y);
          const b = labToScreen(o.x2 ?? o.x, o.y2 ?? o.y);
          const isAns = o.id === arrowId;
          return (
            <g key={o.id}>
              <line x1={a.sx} y1={a.sy} x2={b.sx} y2={b.sy} stroke={o.color || HOME} strokeWidth={5} strokeLinecap="round" strokeDasharray={o.style === "run" ? "10 8" : undefined} />
              <circle cx={a.sx} cy={a.sy} r={12} fill="rgba(46,111,224,.4)" stroke={o.color || HOME} strokeWidth={2} style={{ cursor: "grab" }} onPointerDown={onObjPointerDown(o.id, "tail")} />
              <circle cx={b.sx} cy={b.sy} r={14} fill="rgba(255,209,102,.5)" stroke="#FFD166" strokeWidth={3} style={{ cursor: "grab" }} onPointerDown={onObjPointerDown(o.id, "tip")} />
              {isAns && <text x={(a.sx + b.sx) / 2} y={(a.sy + b.sy) / 2 - 10} textAnchor="middle" fontSize={14} fontWeight={800} fill="#FFD166">answer</text>}
            </g>
          );
        }
        const s = labToScreen(o.x, o.y);
        if (o.type === "ball") {
          return <circle key={o.id} cx={s.sx} cy={s.sy} r={12} fill="#fff" stroke={selectedId === o.id ? "#FFD166" : "#222"} strokeWidth={selectedId === o.id ? 4 : 2} style={{ cursor: "grab" }} onPointerDown={onObjPointerDown(o.id)} />;
        }
        const isHome = o.team === "home";
        const isAnswer = answerIds.includes(o.id);
        const sel = selectedId === o.id;
        return (
          <g key={o.id} style={{ cursor: "grab" }} onPointerDown={onObjPointerDown(o.id)}>
            <circle cx={s.sx} cy={s.sy} r={R} fill={isHome ? HOME : AWAY}
              stroke={sel ? "#fff" : isAnswer ? "#FFD166" : "rgba(255,255,255,.85)"} strokeWidth={sel ? 6 : isAnswer ? 5 : 2} />
            <text x={s.sx} y={s.sy + 6} textAnchor="middle" fontSize={20} fontWeight={800} fill="#fff" style={{ fontFamily: "Fredoka, sans-serif", pointerEvents: "none" }}>
              {o.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

function clamp(v: number, a: number, b: number) {
  return v < a ? a : v > b ? b : v;
}
