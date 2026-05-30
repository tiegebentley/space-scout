"use client";
// Editable scenario board for the author. Same portrait orientation + lab-coord
// model as ScenarioBoard, but every object is movable and you can add/remove
// players, the ball, and an answer arrow, plus draw / move / resize / delete the
// target zones for answer players. Emits changes back to the author page.
import { useCallback, useEffect, useRef, useState } from "react";
import { clsx } from "clsx";
import { LAB_PITCH } from "@/types/lessons";
import type { BoardObject, Zone } from "@/types/lessons";
import { labToScreen, screenToLab, VIEW_W, VIEW_H } from "./boardTransform";

const PW = LAB_PITCH.w;
const PH = LAB_PITCH.h;
const HOME = "#2E6FE0";
const AWAY = "#E0463B";
const R = 22;
const GOAL_HALF = 110; // goal mouth half-width (lab y units)

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
  updateZone?: (id: string, z: Zone) => void;  // move/resize an existing zone
  removeZone?: (id: string) => void;           // delete a zone
  tool: AuthorTool;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
}

export function AuthorBoard({
  objects, setObjects, answerMode, answerIds, arrowId, zones, setZone, updateZone, removeZone, tool, selectedId, onSelect,
}: Props) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const drag = useRef<{ id: string; end?: "tip" | "tail" } | null>(null);
  // Live preview of the rectangle being drawn (lab coords), for the cursor box.
  const [drawPreview, setDrawPreview] = useState<Zone | null>(null);
  // A zone selected for editing (move/resize/delete) — keyed by answer-player id.
  const [editZoneId, setEditZoneId] = useState<string | null>(null);
  // Keep latest objects/setObjects for the window-level drag listeners.
  const objectsRef = useRef(objects);
  const setObjectsRef = useRef(setObjects);
  useEffect(() => { objectsRef.current = objects; setObjectsRef.current = setObjects; });

  const toLab = useCallback((cx: number, cy: number) => {
    const svg = svgRef.current;
    if (!svg) return { x: 0, y: 0 };
    const r = svg.getBoundingClientRect();
    const sx = ((cx - r.left) / r.width) * VIEW_W;
    const sy = ((cy - r.top) / r.height) * VIEW_H;
    const { x, y } = screenToLab(sx, sy);
    return { x: clamp(x, 0, PW), y: clamp(y, 0, PH) };
  }, []);

  const rectFrom = (x0: number, y0: number, x: number, y: number): Zone => ({
    x: Math.round(Math.min(x0, x)), y: Math.round(Math.min(y0, y)),
    w: Math.round(Math.abs(x - x0)), h: Math.round(Math.abs(y - y0)),
  });

  // Start a zone draw. A LIVE preview rectangle follows the cursor (so you can
  // see the box as you drag); commit on release. Window listeners keep it robust.
  const onSvgPointerDown = (e: React.PointerEvent) => {
    if (tool.kind !== "drawZone") return;
    const start = toLab(e.clientX, e.clientY);
    const forId = tool.forId;
    setDrawPreview({ x: start.x, y: start.y, w: 0, h: 0 });
    const move = (ev: PointerEvent) => {
      const p = toLab(ev.clientX, ev.clientY);
      setDrawPreview(rectFrom(start.x, start.y, p.x, p.y));
    };
    const up = (ev: PointerEvent) => {
      const p = toLab(ev.clientX, ev.clientY);
      const rect = rectFrom(start.x, start.y, p.x, p.y);
      setDrawPreview(null);
      if (rect.w > 20 && rect.h > 20) { setZone(forId, rect); setEditZoneId(forId); }
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };

  // Drag/resize an existing zone (move = whole box; corner = resize).
  const onZonePointerDown = (id: string, z: Zone, handle: "move" | "se") => (e: React.PointerEvent) => {
    e.stopPropagation();
    setEditZoneId(id);
    onSelect(null);
    const start = toLab(e.clientX, e.clientY);
    const orig = { ...z };
    const move = (ev: PointerEvent) => {
      const p = toLab(ev.clientX, ev.clientY);
      const dx = p.x - start.x, dy = p.y - start.y;
      let next: Zone;
      if (handle === "move") {
        next = { x: clamp(orig.x + dx, 0, PW - orig.w), y: clamp(orig.y + dy, 0, PH - orig.h), w: orig.w, h: orig.h };
      } else {
        next = { x: orig.x, y: orig.y, w: Math.max(30, orig.w + dx), h: Math.max(30, orig.h + dy) };
      }
      (updateZone ?? setZone)(id, { x: Math.round(next.x), y: Math.round(next.y), w: Math.round(next.w), h: Math.round(next.h) });
    };
    const up = () => { window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", up); };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };

  // Drag a token via window listeners (robust across re-renders).
  const onObjPointerDown = (id: string, end?: "tip" | "tail") => (e: React.PointerEvent) => {
    if (tool.kind === "drawZone") return; // zone tool ignores tokens
    e.stopPropagation();
    onSelect(id);
    drag.current = { id, end };
    const move = (ev: PointerEvent) => {
      if (!drag.current) return;
      const { x, y } = toLab(ev.clientX, ev.clientY);
      const { id: did, end: dend } = drag.current;
      setObjectsRef.current(objectsRef.current.map((o) => {
        if (o.id !== did) return o;
        if (o.type === "arrow") return dend === "tail" ? { ...o, x1: x, y1: y } : { ...o, x2: x, y2: y };
        return { ...o, x, y };
      }));
    };
    const up = () => { drag.current = null; window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", up); };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };

  // An editable zone: filled rect (drag to move) + SE resize handle + delete ×.
  // Screen-space rect from the lab rect (the two corners after rotation).
  const editableZone = (id: string, z: Zone) => {
    const c1 = labToScreen(z.x, z.y), c2 = labToScreen(z.x + z.w, z.y + z.h);
    const x = Math.min(c1.sx, c2.sx), y = Math.min(c1.sy, c2.sy);
    const w = Math.abs(c2.sx - c1.sx), h = Math.abs(c2.sy - c1.sy);
    const active = editZoneId === id || (tool.kind === "drawZone" && tool.forId === id);
    return (
      <g key={`z-${id}`}>
        <rect x={x} y={y} width={w} height={h}
          fill={active ? "rgba(255,209,102,.28)" : "rgba(255,209,102,.14)"}
          stroke="#FFD166" strokeWidth={3} strokeDasharray="10 8" rx={10}
          style={{ cursor: "move" }}
          onPointerDown={onZonePointerDown(id, z, "move")} />
        {active && <>
          {/* SE resize handle */}
          <circle cx={x + w} cy={y + h} r={11} fill="#FFD166" stroke="#16241c" strokeWidth={2}
            style={{ cursor: "nwse-resize" }} onPointerDown={onZonePointerDown(id, z, "se")} />
          {/* Delete button (top-right) */}
          <g style={{ cursor: "pointer" }} onPointerDown={(e) => { e.stopPropagation(); removeZone?.(id); if (editZoneId === id) setEditZoneId(null); }}>
            <circle cx={x + w} cy={y} r={11} fill="#E0463B" stroke="#fff" strokeWidth={2} />
            <text x={x + w} y={y + 4} textAnchor="middle" fontSize={14} fontWeight={900} fill="#fff" style={{ pointerEvents: "none" }}>×</text>
          </g>
        </>}
      </g>
    );
  };

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
      className={clsx("w-full max-w-[420px] mx-auto block rounded-2xl border-2 touch-none select-none shadow-sm",
        tool.kind === "drawZone" ? "border-[#FFD166] cursor-crosshair" : "border-[rgba(20,60,35,.15)]")}
      onPointerDown={onSvgPointerDown}
    >
      {Array.from({ length: 10 }).map((_, i) => (
        <rect key={i} x={0} y={(VIEW_H / 10) * i} width={VIEW_W} height={VIEW_H / 10} fill={i % 2 ? "#2F9354" : "#2B8A4E"} />
      ))}
      <rect x={6} y={6} width={VIEW_W - 12} height={VIEW_H - 12} fill="none" stroke="rgba(255,255,255,.7)" strokeWidth={3} rx={10} />
      <line x1={6} y1={VIEW_H / 2} x2={VIEW_W - 6} y2={VIEW_H / 2} stroke="rgba(255,255,255,.7)" strokeWidth={3} />
      <circle cx={VIEW_W / 2} cy={VIEW_H / 2} r={70} fill="none" stroke="rgba(255,255,255,.7)" strokeWidth={3} />
      {/* Penalty boxes + goals, top (their goal) and bottom (our goal) */}
      <rect x={VIEW_W / 2 - 130} y={6} width={260} height={110} fill="none" stroke="rgba(255,255,255,.55)" strokeWidth={3} />
      <rect x={VIEW_W / 2 - 130} y={VIEW_H - 116} width={260} height={110} fill="none" stroke="rgba(255,255,255,.55)" strokeWidth={3} />
      {/* Goal mouths (the actual goals) */}
      <rect x={VIEW_W / 2 - GOAL_HALF} y={-2} width={GOAL_HALF * 2} height={12} fill="rgba(255,255,255,.92)" stroke="#16241c" strokeWidth={2} />
      <rect x={VIEW_W / 2 - GOAL_HALF} y={VIEW_H - 10} width={GOAL_HALF * 2} height={12} fill="rgba(255,255,255,.92)" stroke="#16241c" strokeWidth={2} />

      {/* Existing zones for answer players — editable (move / resize / delete) */}
      {answerMode === "move" && answerIds.map((id) => {
        const z = zones[id];
        if (!z) return null;
        const zz = Array.isArray(z) ? z[0] : z;
        return zz ? editableZone(id, zz) : null;
      })}

      {/* Live preview rectangle while drawing (the cursor box you see as you drag) */}
      {drawPreview && (() => {
        const c1 = labToScreen(drawPreview.x, drawPreview.y);
        const c2 = labToScreen(drawPreview.x + drawPreview.w, drawPreview.y + drawPreview.h);
        return <rect x={Math.min(c1.sx, c2.sx)} y={Math.min(c1.sy, c2.sy)} width={Math.abs(c2.sx - c1.sx)} height={Math.abs(c2.sy - c1.sy)}
          fill="rgba(255,209,102,.30)" stroke="#FFD166" strokeWidth={4} strokeDasharray="8 6" rx={8} pointerEvents="none" />;
      })()}

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
