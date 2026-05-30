"use client";
// Native React/SVG port of the soccer-iq-lab scenario board. Renders a scenario
// on a scaled 1000x620 pitch, lets the user drag the "home" players named in the
// scenario answer, grades the arrangement (engine/scenarioGrader), and surfaces
// per-player correct/incorrect feedback + optional optimal markers on reveal.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { clsx } from "clsx";
import { LAB_PITCH } from "@/types/lessons";
import type { BoardObject, Scenario, Zone } from "@/types/lessons";
import { gradeMoveScenario } from "@/engine/scenarioGrader";

const { w: PW, h: PH } = LAB_PITCH;
const HOME = "#2E6FE0"; // blue (user's team)
const AWAY = "#E0463B"; // red (opponent)
const R = 22; // player token radius (lab coords)

interface Props {
  scenario: Scenario;
  // Called whenever the pass/fail state changes so the parent (LessonPlayer) can
  // gate the "Next" button. For choice scenarios, fires on selection.
  onSolved: (solved: boolean) => void;
}

export function ScenarioBoard({ scenario, onSolved }: Props) {
  const isMove = scenario.answer.mode === "move";
  const draggableIds = useMemo(
    () => (scenario.answer.mode === "move" ? scenario.answer.objectIds : []),
    [scenario]
  );

  // Live board positions (only home/draggable players move). Reset on scenario change.
  const [objects, setObjects] = useState<BoardObject[]>(() =>
    scenario.board.objects.map((o) => ({ ...o }))
  );
  const [solved, setSolved] = useState(false);
  const [reveal, setReveal] = useState(false);
  const [choiceIdx, setChoiceIdx] = useState<number | null>(null);
  const [perPlayer, setPerPlayer] = useState<Record<string, boolean>>({});

  useEffect(() => {
    setObjects(scenario.board.objects.map((o) => ({ ...o })));
    setSolved(false);
    setReveal(false);
    setChoiceIdx(null);
    setPerPlayer({});
    onSolved(false);
  }, [scenario, onSolved]);

  const svgRef = useRef<SVGSVGElement | null>(null);
  const dragId = useRef<string | null>(null);

  // Convert a pointer event to lab (1000x620) coordinates.
  const toLab = useCallback((clientX: number, clientY: number) => {
    const svg = svgRef.current;
    if (!svg) return { x: 0, y: 0 };
    const rect = svg.getBoundingClientRect();
    const x = ((clientX - rect.left) / rect.width) * PW;
    const y = ((clientY - rect.top) / rect.height) * PH;
    return { x: clamp(x, R, PW - R), y: clamp(y, R, PH - R) };
  }, []);

  const grade = useCallback(
    (objs: BoardObject[]) => {
      if (scenario.answer.mode !== "move") return;
      const { allCorrect, perPlayer: pp } = gradeMoveScenario(
        scenario.answer.objectIds,
        objs,
        scenario.zones,
        scenario.relations
      );
      setPerPlayer(pp);
      setSolved(allCorrect);
      onSolved(allCorrect);
    },
    [scenario, onSolved]
  );

  const onPointerDown = (id: string) => (e: React.PointerEvent) => {
    if (!draggableIds.includes(id)) return;
    e.preventDefault();
    dragId.current = id;
    (e.target as Element).setPointerCapture?.(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragId.current) return;
    const { x, y } = toLab(e.clientX, e.clientY);
    setObjects((prev) => prev.map((o) => (o.id === dragId.current ? { ...o, x, y } : o)));
  };

  const onPointerUp = () => {
    if (!dragId.current) return;
    dragId.current = null;
    // Grade against the latest positions. `objects` in this closure is current
    // for the just-finished drag; grading here (not inside a setState updater)
    // keeps the parent setState out of React's render phase.
    grade(objects);
  };

  const onPickChoice = (i: number) => {
    setChoiceIdx(i);
    const correct = !!scenario.choices?.[i]?.correct;
    setSolved(correct);
    setReveal(true);
    onSolved(correct);
  };

  // Zone hints for the currently-relevant draggable players (move scenarios).
  const zoneHints = useMemo(() => {
    const hints: { id: string; zones: Zone[] }[] = [];
    if (scenario.zones) {
      for (const id of draggableIds) {
        const z = scenario.zones[id];
        if (z) hints.push({ id, zones: Array.isArray(z) ? z : [z] });
      }
    }
    return hints;
  }, [scenario, draggableIds]);

  return (
    <div className="w-full">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${PW} ${PH}`}
        className="w-full rounded-2xl border-2 border-[rgba(20,60,35,.15)] touch-none select-none shadow-sm"
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerUp}
      >
        {/* Striped grass */}
        {Array.from({ length: 10 }).map((_, i) => (
          <rect key={i} x={(PW / 10) * i} y={0} width={PW / 10} height={PH} fill={i % 2 ? "#2F9354" : "#2B8A4E"} />
        ))}
        {/* Markings */}
        <rect x={6} y={6} width={PW - 12} height={PH - 12} fill="none" stroke="rgba(255,255,255,.7)" strokeWidth={3} rx={10} />
        <line x1={PW / 2} y1={6} x2={PW / 2} y2={PH - 6} stroke="rgba(255,255,255,.7)" strokeWidth={3} />
        <circle cx={PW / 2} cy={PH / 2} r={70} fill="none" stroke="rgba(255,255,255,.7)" strokeWidth={3} />
        {/* Penalty boxes (left/right) */}
        <rect x={6} y={PH / 2 - 130} width={120} height={260} fill="none" stroke="rgba(255,255,255,.6)" strokeWidth={3} />
        <rect x={PW - 126} y={PH / 2 - 130} width={120} height={260} fill="none" stroke="rgba(255,255,255,.6)" strokeWidth={3} />

        {/* Zone hints (dashed gold target areas) for draggable players not yet correct */}
        {!reveal &&
          zoneHints.map(({ id, zones }) =>
            zones.map((z, zi) =>
              perPlayer[id] ? null : (
                <rect
                  key={`${id}-${zi}`}
                  x={z.x}
                  y={z.y}
                  width={z.w}
                  height={z.h}
                  fill="rgba(255,209,102,.18)"
                  stroke="rgba(255,209,102,.9)"
                  strokeWidth={3}
                  strokeDasharray="10 8"
                  rx={10}
                />
              )
            )
          )}

        {/* Optimal markers on reveal */}
        {reveal &&
          scenario.optimals &&
          Object.entries(scenario.optimals).map(([id, p]) => (
            <circle key={`opt-${id}`} cx={p.x} cy={p.y} r={R + 6} fill="none" stroke="#FFD166" strokeWidth={4} strokeDasharray="6 6" />
          ))}

        {/* Tokens */}
        {objects.map((o) => {
          if (o.type === "ball") {
            return <circle key={o.id} cx={o.x} cy={o.y} r={12} fill="#fff" stroke="#222" strokeWidth={2} />;
          }
          const isHome = o.team === "home";
          const draggable = draggableIds.includes(o.id);
          const graded = o.id in perPlayer;
          const ok = perPlayer[o.id];
          const ring = graded ? (ok ? "#2B8A4E" : "#E0463B") : draggable ? "#FFD166" : "rgba(255,255,255,.85)";
          return (
            <g
              key={o.id}
              onPointerDown={onPointerDown(o.id)}
              className={clsx(draggable && "cursor-grab")}
              style={{ cursor: draggable ? "grab" : "default" }}
            >
              <circle cx={o.x} cy={o.y} r={R} fill={isHome ? HOME : AWAY} stroke={ring} strokeWidth={draggable || graded ? 5 : 2} />
              <text x={o.x} y={o.y + 6} textAnchor="middle" fontSize={20} fontWeight={800} fill="#fff" style={{ fontFamily: "Fredoka, sans-serif", pointerEvents: "none" }}>
                {o.label}
              </text>
            </g>
          );
        })}
      </svg>

      {/* Choice buttons (decision scenarios) */}
      {!isMove && scenario.choices && (
        <div className="mt-3 grid gap-2">
          {scenario.choices.map((c, i) => (
            <button
              key={i}
              onClick={() => onPickChoice(i)}
              className={clsx(
                "rounded-xl border-2 px-4 py-3 text-left text-sm font-bold transition-colors cursor-pointer",
                choiceIdx === i
                  ? c.correct
                    ? "border-[#2B8A4E] bg-[#2B8A4E12] text-[#1e5e36]"
                    : "border-[#E0463B] bg-[#E0463B12] text-[#a32a22]"
                  : "border-[rgba(20,60,35,.15)] bg-white text-[#33433a] hover:bg-[#f3f7f2]"
              )}
            >
              {c.text}
            </button>
          ))}
        </div>
      )}

      {/* Feedback line */}
      <div className="mt-3 min-h-[44px]">
        {solved ? (
          <p className="rounded-xl bg-[#2B8A4E14] border border-[#2B8A4E55] px-3 py-2 text-sm font-bold text-[#1e5e36]">
            ✓ {scenario.optimalNote || "Nice — that's it!"}
          </p>
        ) : isMove ? (
          <button
            onClick={() => setReveal((r) => !r)}
            className="text-xs font-bold text-[#2B8A4E] cursor-pointer hover:underline"
          >
            {reveal ? "Hide the answer" : "Show me the answer"}
          </button>
        ) : null}
      </div>
    </div>
  );
}

function clamp(v: number, a: number, b: number) {
  return v < a ? a : v > b ? b : v;
}
