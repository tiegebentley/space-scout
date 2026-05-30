"use client";
// Native React/SVG scenario board ported from soccer-iq-lab. Renders a scenario
// on a PORTRAIT pitch (attack up/down) to match space-scout's live game, and
// supports all four lab answer modes:
//   move   — drag the named home players into their zones (graded by relations+zones)
//   choice — pick the correct option
//   arrow  — drag an arrow's tip into a target zone (pass/run line)
//   info   — tap each named player to reveal a role card; done when all seen
// Plus the lab learn loop: up to 5 attempts with escalating hints, then reveal
// the answer + explanation. All scenario DATA and grading stay in lab (landscape
// 1000x620) coordinates; only rendering + pointer input are rotated to portrait
// via boardTransform, so the grader's directional rules remain valid.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { clsx } from "clsx";
import { LAB_PITCH } from "@/types/lessons";
import type { BoardObject, Scenario } from "@/types/lessons";
import { gradeMoveScenario, gradeArrowScenario } from "@/engine/scenarioGrader";
import { labToScreen, screenToLab, VIEW_W, VIEW_H } from "./boardTransform";

const PW = LAB_PITCH.w;
const HOME = "#2E6FE0";
const AWAY = "#E0463B";
const R = 22;
const MAX_TRIES = 5;

// Result reported up to the LessonPlayer when a scenario resolves.
export interface ScenarioResult {
  solved: boolean;   // gate to advance (true once correct OR answer revealed)
  correct: boolean;  // did the user actually get it right (for scoring)
}

interface Props {
  scenario: Scenario;
  onResult: (r: ScenarioResult) => void;
}

export function ScenarioBoard({ scenario, onResult }: Props) {
  const mode = scenario.answer.mode;
  const draggableIds = useMemo(
    () => (scenario.answer.mode === "move" ? scenario.answer.objectIds : []),
    [scenario]
  );
  const infoIds = useMemo(
    () => (scenario.answer.mode === "info" ? scenario.answer.objectIds : []),
    [scenario]
  );
  const arrowId = scenario.answer.mode === "arrow" ? scenario.answer.objectId : null;

  const [objects, setObjects] = useState<BoardObject[]>(() => scenario.board.objects.map((o) => ({ ...o })));
  const [correct, setCorrect] = useState(false);
  const [reveal, setReveal] = useState(false);
  const [choiceIdx, setChoiceIdx] = useState<number | null>(null);
  const [perPlayer, setPerPlayer] = useState<Record<string, boolean>>({});
  const [attempts, setAttempts] = useState(0);
  const [verdict, setVerdict] = useState<{ kind: "ok" | "miss"; text: string } | null>(null);
  const [viewed, setViewed] = useState<Set<string>>(new Set());

  // Reset everything when the scenario changes.
  useEffect(() => {
    setObjects(scenario.board.objects.map((o) => ({ ...o })));
    setCorrect(false);
    setReveal(false);
    setChoiceIdx(null);
    setPerPlayer({});
    setAttempts(0);
    setVerdict(null);
    setViewed(new Set());
    onResult({ solved: false, correct: false });
  }, [scenario, onResult]);

  const svgRef = useRef<SVGSVGElement | null>(null);
  // For move/arrow drags: which object + (arrow) which endpoint.
  const drag = useRef<{ id: string; end?: "tip" | "tail" } | null>(null);

  // Pointer (screen) -> lab coords.
  const toLab = useCallback((clientX: number, clientY: number) => {
    const svg = svgRef.current;
    if (!svg) return { x: 0, y: 0 };
    const rect = svg.getBoundingClientRect();
    const sx = ((clientX - rect.left) / rect.width) * VIEW_W;
    const sy = ((clientY - rect.top) / rect.height) * VIEW_H;
    const { x, y } = screenToLab(sx, sy);
    return { x: clamp(x, R, PW - R), y: clamp(y, R, LAB_PITCH.h - R) };
  }, []);

  // Pick the right hint for the current attempt count.
  const hintFor = useCallback(
    (n: number) => {
      if (scenario.nudges?.length) return scenario.nudges[Math.min(n - 1, scenario.nudges.length - 1)];
      if (scenario.nudge) return scenario.nudge;
      return scenario.optimalNote || "";
    },
    [scenario]
  );

  // Shared "wrong answer" handling: bump attempts, show a hint, reveal at MAX.
  // Side-effecting setters run outside the setAttempts updater to avoid setState
  // during render.
  const handleWrong = useCallback(() => {
    const n = attempts + 1;
    setAttempts(n);
    if (n >= MAX_TRIES) {
      setReveal(true);
      setCorrect(false);
      setVerdict({ kind: "miss", text: "Answer revealed." });
      onResult({ solved: true, correct: false }); // can advance, but not scored correct
    } else {
      const h = hintFor(n);
      setVerdict({ kind: "miss", text: `Not quite — try again (${n}/${MAX_TRIES}).${h ? " Hint: " + h : ""}` });
    }
  }, [attempts, hintFor, onResult]);

  const handleRight = useCallback(() => {
    setCorrect(true);
    setReveal(true);
    setVerdict({ kind: "ok", text: scenario.optimalNote || "Nice — that's it!" });
    onResult({ solved: true, correct: true });
  }, [scenario, onResult]);

  // ---- grading per mode (called on Check / drop / pick) ----
  const checkMove = useCallback(
    (objs: BoardObject[]) => {
      if (scenario.answer.mode !== "move") return;
      const { allCorrect, perPlayer: pp } = gradeMoveScenario(
        scenario.answer.objectIds,
        objs,
        scenario.zones,
        scenario.relations
      );
      setPerPlayer(pp);
      if (allCorrect) handleRight();
      else handleWrong();
    },
    [scenario, handleRight, handleWrong]
  );

  const checkArrow = useCallback(
    (objs: BoardObject[]) => {
      if (!arrowId) return;
      const arrow = objs.find((o) => o.id === arrowId);
      if (gradeArrowScenario(arrow, scenario.zone)) handleRight();
      else handleWrong();
    },
    [arrowId, scenario, handleRight, handleWrong]
  );

  // ---- pointer handlers ----
  // Drag via window-level listeners attached on pointerdown — robust across SVG
  // token re-renders (setPointerCapture on re-rendered SVG nodes is unreliable).
  const onPointerDownObj = (id: string, end?: "tip" | "tail") => (e: React.PointerEvent) => {
    if (reveal) return;
    const isDraggable = draggableIds.includes(id) || (mode === "arrow" && id === arrowId);
    if (!isDraggable) return;
    e.preventDefault();
    e.stopPropagation();
    drag.current = { id, end };

    const move = (ev: PointerEvent) => {
      if (!drag.current) return;
      const { x, y } = toLab(ev.clientX, ev.clientY);
      const { id: did, end: dend } = drag.current;
      setObjects((prev) =>
        prev.map((o) => {
          if (o.id !== did) return o;
          if (o.type === "arrow") return dend === "tail" ? { ...o, x1: x, y1: y } : { ...o, x2: x, y2: y };
          return { ...o, x, y };
        })
      );
    };
    const up = () => {
      drag.current = null;
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };

  // Tap a player in info mode to reveal its card. Accumulate via functional
  // updater (rapid taps must not clobber each other); completion is detected in
  // the effect below so no parent setState happens inside this updater.
  const onTapInfo = (id: string) => () => {
    if (mode !== "info" || !infoIds.includes(id)) return;
    setViewed((prev) => {
      if (prev.has(id)) return prev;
      const next = new Set(prev);
      next.add(id);
      return next;
    });
  };

  // Info mode: when every named player has been viewed, mark solved (effect, so
  // it runs after render — not during another component's render).
  useEffect(() => {
    if (mode !== "info" || correct) return;
    if (infoIds.length > 0 && viewed.size >= infoIds.length) {
      setCorrect(true);
      setVerdict({ kind: "ok", text: scenario.optimalNote || "You've met everyone!" });
      onResult({ solved: true, correct: true });
    }
  }, [mode, viewed, infoIds, correct, scenario, onResult]);

  const onPickChoice = (i: number) => {
    if (reveal && correct) return;
    setChoiceIdx(i);
    const isRight = !!scenario.choices?.[i]?.correct;
    if (isRight) handleRight();
    else handleWrong();
  };

  // Explicit Check button for move/arrow (the lab's "Reveal Answer" trigger).
  const onCheck = () => {
    if (mode === "move") checkMove(objects);
    else if (mode === "arrow") checkArrow(objects);
  };

  const Arrow = ({ o }: { o: BoardObject }) => {
    const a = labToScreen(o.x1 ?? o.x, o.y1 ?? o.y);
    const b = labToScreen(o.x2 ?? o.x, o.y2 ?? o.y);
    const col = o.color || HOME;
    return (
      <g>
        <defs>
          <marker id={`ah-${o.id}`} markerWidth={8} markerHeight={8} refX={6} refY={3} orient="auto">
            <path d="M0,0 L6,3 L0,6 Z" fill={col} />
          </marker>
        </defs>
        <line
          x1={a.sx} y1={a.sy} x2={b.sx} y2={b.sy}
          stroke={col} strokeWidth={5} strokeLinecap="round"
          strokeDasharray={o.style === "run" ? "10 8" : undefined}
          markerEnd={`url(#ah-${o.id})`}
        />
        {/* draggable tip handle (arrow mode) */}
        {mode === "arrow" && o.id === arrowId && !reveal && (
          <circle cx={b.sx} cy={b.sy} r={14} fill="rgba(255,209,102,.5)" stroke="#FFD166" strokeWidth={3}
            style={{ cursor: "grab" }} onPointerDown={onPointerDownObj(o.id, "tip")} />
        )}
      </g>
    );
  };

  // Whether there's anything to show in the side panel yet (so we can keep it
  // out of the way until it has content on narrow screens).
  const panelHasContent =
    (mode === "info" && viewed.size > 0) ||
    (mode === "choice") ||
    !!verdict || reveal;

  return (
    // Two columns on wider screens: side panel (answers/feedback) on the LEFT,
    // the field on the RIGHT. Stacks vertically on narrow screens.
    <div className="w-full flex flex-col md:flex-row-reverse md:items-start gap-4">
      {/* FIELD — larger and prominent. Capped by both width and viewport height
          so the tall portrait pitch stays fully visible without scrolling. */}
      <div className="md:w-[440px] md:shrink-0 mx-auto">
        <p className="text-center text-[11px] font-extrabold tracking-wide text-[#5d6f63] mb-1">▲ YOU ATTACK THIS WAY ▲</p>
        <svg
          ref={svgRef}
          viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
          className="w-full max-w-[440px] max-h-[68vh] mx-auto block rounded-2xl border-2 border-[rgba(20,60,35,.15)] touch-none select-none shadow-sm"
        >
        {/* Striped grass (horizontal bands up the pitch) */}
        {Array.from({ length: 10 }).map((_, i) => (
          <rect key={i} x={0} y={(VIEW_H / 10) * i} width={VIEW_W} height={VIEW_H / 10} fill={i % 2 ? "#2F9354" : "#2B8A4E"} />
        ))}
        {/* Markings */}
        <rect x={6} y={6} width={VIEW_W - 12} height={VIEW_H - 12} fill="none" stroke="rgba(255,255,255,.7)" strokeWidth={3} rx={10} />
        <line x1={6} y1={VIEW_H / 2} x2={VIEW_W - 6} y2={VIEW_H / 2} stroke="rgba(255,255,255,.7)" strokeWidth={3} />
        <circle cx={VIEW_W / 2} cy={VIEW_H / 2} r={70} fill="none" stroke="rgba(255,255,255,.7)" strokeWidth={3} />
        {/* Goal boxes top/bottom */}
        <rect x={VIEW_W / 2 - 130} y={6} width={260} height={120} fill="none" stroke="rgba(255,255,255,.6)" strokeWidth={3} />
        <rect x={VIEW_W / 2 - 130} y={VIEW_H - 126} width={260} height={120} fill="none" stroke="rgba(255,255,255,.6)" strokeWidth={3} />


        {/* Arrow target zone on reveal (arrow mode) */}
        {reveal && mode === "arrow" && scenario.zone && (() => {
          const z = scenario.zone;
          const c1 = labToScreen(z.x, z.y), c2 = labToScreen(z.x + z.w, z.y + z.h);
          return <rect x={Math.min(c1.sx, c2.sx)} y={Math.min(c1.sy, c2.sy)} width={Math.abs(c2.sx - c1.sx)} height={Math.abs(c2.sy - c1.sy)} fill="rgba(255,209,102,.18)" stroke="#FFD166" strokeWidth={3} rx={10} />;
        })()}

        {/* On reveal (move mode): highlight the correct-answer ZONE(S) for each
            answer player — i.e. the area they should move INTO. (We deliberately
            don't mark scenario.optimals, which can be the player's start spot for
            authored scenarios — that's the stray circle this replaces.) */}
        {reveal && mode === "move" && scenario.zones &&
          draggableIds.flatMap((id) => {
            const z = scenario.zones?.[id];
            if (!z) return [];
            const arr = Array.isArray(z) ? z : [z];
            return arr.map((zz, zi) => {
              const c1 = labToScreen(zz.x, zz.y);
              const c2 = labToScreen(zz.x + zz.w, zz.y + zz.h);
              return (
                <rect key={`ans-${id}-${zi}`} x={Math.min(c1.sx, c2.sx)} y={Math.min(c1.sy, c2.sy)}
                  width={Math.abs(c2.sx - c1.sx)} height={Math.abs(c2.sy - c1.sy)}
                  fill="rgba(255,209,102,.20)" stroke="#FFD166" strokeWidth={3} strokeDasharray="10 8" rx={10} pointerEvents="none" />
              );
            });
          })}

        {/* Optimal arrow on reveal */}
        {reveal && mode === "arrow" && scenario.optimal && (() => {
          const a = labToScreen(scenario.optimal.x1, scenario.optimal.y1);
          const b = labToScreen(scenario.optimal.x2, scenario.optimal.y2);
          return <line x1={a.sx} y1={a.sy} x2={b.sx} y2={b.sy} stroke="#FFD166" strokeWidth={4} strokeDasharray="6 6" />;
        })()}

        {/* Tokens */}
        {objects.map((o) => {
          if (o.type === "arrow") return <Arrow key={o.id} o={o} />;
          const s = labToScreen(o.x, o.y);
          if (o.type === "ball") {
            return <circle key={o.id} cx={s.sx} cy={s.sy} r={12} fill="#fff" stroke="#222" strokeWidth={2} />;
          }
          const isHome = o.team === "home";
          const isDraggable = draggableIds.includes(o.id);
          const isInfo = infoIds.includes(o.id);
          const graded = o.id in perPlayer;
          const ok = perPlayer[o.id];
          const seen = viewed.has(o.id);
          const ring = graded
            ? ok ? "#2B8A4E" : "#E0463B"
            : isInfo ? (seen ? "#2B8A4E" : "#FFD166")
            : isDraggable ? "#FFD166"
            : "rgba(255,255,255,.85)";
          const interactive = isDraggable || isInfo;
          return (
            <g
              key={o.id}
              onPointerDown={isDraggable ? onPointerDownObj(o.id) : undefined}
              onClick={isInfo ? onTapInfo(o.id) : undefined}
              style={{ cursor: interactive ? (isInfo ? "pointer" : "grab") : "default" }}
            >
              <circle cx={s.sx} cy={s.sy} r={R} fill={isHome ? HOME : AWAY} stroke={ring} strokeWidth={interactive || graded ? 5 : 2} />
              <text x={s.sx} y={s.sy + 6} textAnchor="middle" fontSize={20} fontWeight={800} fill="#fff" style={{ fontFamily: "Fredoka, sans-serif", pointerEvents: "none" }}>
                {o.label}
              </text>
            </g>
          );
        })}
        </svg>
      </div>

      {/* SIDE PANEL — answers + feedback, to the left of the field on wide screens */}
      <div className={clsx("flex-1 min-w-0 space-y-2", !panelHasContent && "md:min-h-[1px]")}>

      {/* Info cards revealed by tapping (info mode) */}
      {mode === "info" && (
        <div className="grid gap-2">
          {[...viewed].map((id) => {
            const card = scenario.infoCards?.[id];
            const player = scenario.board.objects.find((o) => o.id === id);
            return (
              <div key={id} className="rounded-xl bg-white border border-[rgba(20,60,35,.12)] px-3 py-2">
                <p className="text-sm font-extrabold text-[#2E6FE0]">{card?.title || `Player #${player?.label}`}</p>
                {card?.text && <p className="text-xs font-semibold text-[#33433a]">{card.text}</p>}
              </div>
            );
          })}
          {viewed.size < infoIds.length && (
            <p className="text-xs font-bold text-[#5d6f63]">Tap each highlighted player ({viewed.size}/{infoIds.length}).</p>
          )}
        </div>
      )}

      {/* Choice buttons */}
      {mode === "choice" && scenario.choices && (
        <div className="grid gap-2">
          {scenario.choices.map((c, i) => (
            <button
              key={i}
              onClick={() => onPickChoice(i)}
              disabled={reveal && correct}
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

      {/* Check button (move / arrow) */}
      {(mode === "move" || mode === "arrow") && !reveal && (
        <button
          onClick={onCheck}
          className="w-full rounded-xl bg-[#2E6FE0] text-white font-extrabold text-sm py-2.5 cursor-pointer hover:bg-[#2961c9]"
        >
          Check my answer
        </button>
      )}

      {/* Verdict + explanation */}
      {verdict && (
        <p className={clsx(
          "rounded-xl px-3 py-2 text-sm font-bold border",
          verdict.kind === "ok"
            ? "bg-[#2B8A4E14] border-[#2B8A4E55] text-[#1e5e36]"
            : "bg-[#fff3e0] border-[#f0b657] text-[#8a5a00]"
        )}>
          {verdict.kind === "ok" ? "✓ " : "✗ "}{verdict.text}
        </p>
      )}
      {reveal && (
        <p className="rounded-xl bg-[#f3f7f2] border border-[rgba(20,60,35,.1)] px-3 py-2 text-[13px] leading-relaxed font-semibold text-[#33433a]">
          {scenario.explanation}
        </p>
      )}
      </div>
    </div>
  );
}

function clamp(v: number, a: number, b: number) {
  return v < a ? a : v > b ? b : v;
}
