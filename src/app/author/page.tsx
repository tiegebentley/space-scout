"use client";
// Scenario author — ported from soccer-iq-lab's author mode. Build a custom
// lesson: place/move/remove board objects, pick an answer mode, set answer
// players + draw their target zones (move), set choices (choice), draw an answer
// arrow (arrow), or pick info players (info), write the question/explanation,
// page through multiple scenarios, test-play, and save/export/import. Custom
// lessons persist in the store and appear under "Your Lessons" on /learn.
import { useCallback, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { clsx } from "clsx";
import { AuthorBoard, type AuthorTool } from "@/components/lessons/AuthorBoard";
import { LessonPlayer } from "@/components/lessons/LessonPlayer";
import { useGameStore } from "@/stores/gameStore";
import type { BoardObject, Scenario, Zone, Lesson, Choice, InfoCard } from "@/types/lessons";

type Mode = "move" | "choice" | "arrow" | "info";

interface DraftScenario {
  id: string;
  question: string;
  instruction: string;
  optimalNote: string;
  explanation: string;
  mode: Mode;
  objects: BoardObject[];
  answerIds: string[];
  arrowId: string | null;
  zones: Record<string, Zone>;
  choices: Choice[];
  infoCards: Record<string, InfoCard>;
}

let seq = 0;
const nid = (p: string) => `${p}-${Date.now().toString(36)}-${seq++}`;

function blankScenario(): DraftScenario {
  return {
    id: nid("sc"), question: "", instruction: "", optimalNote: "", explanation: "",
    mode: "move", objects: [], answerIds: [], arrowId: null, zones: {}, choices: [
      { text: "", correct: true }, { text: "", correct: false },
    ], infoCards: {},
  };
}

// Convert a draft into a real Scenario for play/export.
function toScenario(d: DraftScenario): Scenario {
  const base = {
    id: d.id, format: "5v5-1-2-1", youAre: "home" as const, attackDir: "right" as const,
    question: d.question || "Untitled scenario", instruction: d.instruction,
    optimalNote: d.optimalNote, explanation: d.explanation,
    board: { objects: d.objects },
  };
  if (d.mode === "choice") return { ...base, answer: { mode: "choice", objectId: null }, choices: d.choices };
  if (d.mode === "info") return { ...base, answer: { mode: "info", objectIds: d.answerIds }, infoCards: d.infoCards };
  if (d.mode === "arrow") {
    const arrow = d.objects.find((o) => o.id === d.arrowId);
    const optimal = arrow ? { x1: arrow.x1 ?? arrow.x, y1: arrow.y1 ?? arrow.y, x2: arrow.x2 ?? arrow.x, y2: arrow.y2 ?? arrow.y } : null;
    // target zone for the arrow tip: reuse zones["_arrow"] if drawn, else a box around the tip
    const z = d.zones["_arrow"] ?? (arrow ? { x: (arrow.x2 ?? arrow.x) - 80, y: (arrow.y2 ?? arrow.y) - 80, w: 160, h: 160 } : null);
    return { ...base, answer: { mode: "arrow", objectId: d.arrowId || "" }, optimal, zone: z };
  }
  // move
  return {
    ...base,
    answer: { mode: "move", objectIds: d.answerIds },
    zones: d.zones,
    optimals: Object.fromEntries(d.answerIds.map((id) => {
      const o = d.objects.find((x) => x.id === id);
      return [id, { x: Math.round(o?.x ?? 0), y: Math.round(o?.y ?? 0) }];
    })),
  };
}

export default function AuthorPage() {
  const saveCustomLesson = useGameStore((s) => s.saveCustomLesson);

  const [title, setTitle] = useState("My Lesson");
  const [scenarios, setScenarios] = useState<DraftScenario[]>([blankScenario()]);
  const [idx, setIdx] = useState(0);
  const [tool, setTool] = useState<AuthorTool>({ kind: "select" });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [testLesson, setTestLesson] = useState<Lesson | null>(null);
  const [flash, setFlash] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);

  const cur = scenarios[idx];
  const patch = useCallback((p: Partial<DraftScenario>) => {
    setScenarios((prev) => prev.map((s, i) => (i === idx ? { ...s, ...p } : s)));
  }, [idx]);

  const toast = (m: string) => { setFlash(m); setTimeout(() => setFlash(null), 1800); };

  // ---- board object ops ----
  const addPlayer = (team: "home" | "away") => {
    const label = String((cur.objects.filter((o) => o.type === "player" && o.team === team).length % 9) + 2);
    const o: BoardObject = { id: nid(team), type: "player", x: 500, y: 310, team, label };
    patch({ objects: [...cur.objects, o] });
    setSelectedId(o.id);
  };
  const addBall = () => patch({ objects: [...cur.objects.filter((o) => o.type !== "ball"), { id: nid("ball"), type: "ball", x: 500, y: 310 }] });
  const addArrow = () => {
    const o: BoardObject = { id: nid("arr"), type: "arrow", x: 400, y: 310, x1: 400, y1: 310, x2: 550, y2: 250, color: "#2E6FE0", style: "run" };
    patch({ objects: [...cur.objects, o], arrowId: o.id });
    setSelectedId(o.id);
  };
  const removeSelected = () => {
    if (!selectedId) return;
    patch({
      objects: cur.objects.filter((o) => o.id !== selectedId),
      answerIds: cur.answerIds.filter((id) => id !== selectedId),
      arrowId: cur.arrowId === selectedId ? null : cur.arrowId,
    });
    setSelectedId(null);
  };
  const setObjects = (next: BoardObject[]) => patch({ objects: next });
  const setZone = (id: string, z: Zone) => { patch({ zones: { ...cur.zones, [id]: z } }); setTool({ kind: "select" }); toast("Zone set"); };

  const toggleAnswer = (id: string) => {
    const has = cur.answerIds.includes(id);
    patch({ answerIds: has ? cur.answerIds.filter((x) => x !== id) : [...cur.answerIds, id] });
  };

  // ---- scenario pager ----
  const addScenario = () => { setScenarios([...scenarios, blankScenario()]); setIdx(scenarios.length); setSelectedId(null); };
  const delScenario = () => {
    if (scenarios.length <= 1) { toast("A lesson needs at least one scenario"); return; }
    const next = scenarios.filter((_, i) => i !== idx);
    setScenarios(next); setIdx(Math.max(0, idx - 1)); setSelectedId(null);
  };

  // ---- save / export / import ----
  const buildLesson = useCallback((): Lesson => ({
    id: nid("custom"),
    title: title.trim() || "My Lesson",
    description: "Custom lesson",
    difficulty: "beginner",
    category: "custom",
    steps: [
      ...scenarios.map((d) => ({ kind: "scenario" as const, scenario: toScenario(d) })),
      { kind: "play" as const, title: "Now try it live!", body: "Put it into practice in a real game.", matchConfig: { format: "5v5" as const, userRole: "rw" } },
    ],
  }), [title, scenarios]);

  const onSave = () => {
    const lesson = buildLesson();
    saveCustomLesson(lesson);
    toast(`Saved "${lesson.title}" — find it on the Learn page`);
  };
  const onTest = () => setTestLesson(buildLesson());
  const onExport = () => {
    const data = { version: 2, title, scenarios: scenarios.map(toScenario) };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `lesson-${Date.now()}.json`;
    a.click();
    toast("Exported");
  };
  const onImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const rd = new FileReader();
    rd.onload = () => {
      try {
        const d = JSON.parse(String(rd.result));
        const scns: Scenario[] = d.scenarios || [];
        if (!scns.length) { toast("No scenarios found"); return; }
        // Convert imported Scenarios back to drafts (best-effort).
        const drafts: DraftScenario[] = scns.map((s) => ({
          id: s.id || nid("sc"),
          question: s.question || "", instruction: s.instruction || "",
          optimalNote: s.optimalNote || "", explanation: s.explanation || "",
          mode: s.answer.mode,
          objects: s.board.objects.map((o) => ({ ...o })),
          answerIds: s.answer.mode === "move" || s.answer.mode === "info" ? s.answer.objectIds : [],
          arrowId: s.answer.mode === "arrow" ? s.answer.objectId : null,
          zones: (s.zones
            ? Object.fromEntries(Object.entries(s.zones).map(([k, v]) => [k, Array.isArray(v) ? v[0] : v]))
            : {}) as Record<string, Zone>,
          choices: s.choices ?? [{ text: "", correct: true }, { text: "", correct: false }],
          infoCards: s.infoCards ?? {},
        }));
        if (d.title) setTitle(d.title);
        setScenarios(drafts); setIdx(0); setSelectedId(null);
        toast(`Imported ${drafts.length} scenarios`);
      } catch { toast("Could not read file"); }
    };
    rd.readAsText(f);
    e.target.value = "";
  };

  // ---- test-play overlay ----
  if (testLesson) {
    return (
      <div>
        <div className="flex items-center justify-between p-3 bg-[#16241c] text-white">
          <span className="text-sm font-bold">Testing: {testLesson.title}</span>
          <button onClick={() => setTestLesson(null)} className="rounded-lg bg-white/15 px-3 py-1.5 text-xs font-bold cursor-pointer">✕ Back to editor</button>
        </div>
        <LessonPlayer lesson={testLesson} />
      </div>
    );
  }

  const players = cur.objects.filter((o) => o.type === "player");

  return (
    <main className="flex-1 flex flex-col items-center p-4">
      <div className="w-full max-w-xl">
        <div className="flex items-center justify-between mb-3">
          <Link href="/learn" className="text-xs font-extrabold text-[#5d6f63] hover:underline">← Lessons</Link>
          <span className="text-xs font-extrabold tracking-wide text-[#5d6f63]">AUTHOR</span>
        </div>

        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Lesson title"
          className="w-full rounded-xl border-2 border-[rgba(20,60,35,.12)] px-3 py-2 font-[Fredoka] font-bold text-lg mb-3" />

        {/* Scenario pager */}
        <div className="flex items-center gap-1.5 flex-wrap mb-3">
          <span className="text-[11px] font-extrabold text-[#5d6f63] mr-1">Scenarios:</span>
          {scenarios.map((_, i) => (
            <button key={i} onClick={() => { setIdx(i); setSelectedId(null); }}
              className={clsx("w-7 h-7 rounded-lg text-xs font-extrabold cursor-pointer border", i === idx ? "bg-[#2E6FE0] text-white border-[#2E6FE0]" : "bg-white text-[#33433a] border-[rgba(20,60,35,.15)]")}>
              {i + 1}
            </button>
          ))}
          <button onClick={addScenario} className="w-7 h-7 rounded-lg text-xs font-extrabold bg-[#2B8A4E] text-white cursor-pointer" title="Add scenario">+</button>
          {scenarios.length > 1 && <button onClick={delScenario} className="w-7 h-7 rounded-lg text-xs bg-white border border-[rgba(20,60,35,.15)] text-[#E0463B] cursor-pointer" title="Delete scenario">🗑</button>}
        </div>

        {/* Board */}
        <p className="text-center text-[10px] font-extrabold tracking-wide text-[#5d6f63] mb-1">▲ ATTACK THIS WAY ▲</p>
        <AuthorBoard
          objects={cur.objects} setObjects={setObjects}
          answerMode={cur.mode} answerIds={cur.answerIds} arrowId={cur.arrowId}
          zones={cur.zones} setZone={setZone}
          tool={tool} selectedId={selectedId} onSelect={setSelectedId}
        />

        {/* Palette */}
        <div className="flex flex-wrap gap-2 mt-3">
          <button onClick={() => addPlayer("home")} className="rounded-lg px-3 py-1.5 text-xs font-extrabold bg-[#2E6FE0] text-white cursor-pointer">+ Blue</button>
          <button onClick={() => addPlayer("away")} className="rounded-lg px-3 py-1.5 text-xs font-extrabold bg-[#E0463B] text-white cursor-pointer">+ Red</button>
          <button onClick={addBall} className="rounded-lg px-3 py-1.5 text-xs font-extrabold bg-white border border-[rgba(20,60,35,.15)] cursor-pointer">+ Ball</button>
          {cur.mode === "arrow" && <button onClick={addArrow} className="rounded-lg px-3 py-1.5 text-xs font-extrabold bg-white border border-[rgba(20,60,35,.15)] cursor-pointer">+ Arrow</button>}
          <button onClick={removeSelected} disabled={!selectedId} className="rounded-lg px-3 py-1.5 text-xs font-extrabold bg-white border border-[rgba(20,60,35,.15)] text-[#E0463B] cursor-pointer disabled:opacity-40">Remove selected</button>
        </div>

        {/* Answer mode */}
        <div className="mt-4">
          <p className="text-[11px] font-extrabold text-[#5d6f63] mb-1">ANSWER TYPE</p>
          <div className="flex rounded-lg overflow-hidden border border-[rgba(20,60,35,.15)] text-[11px] font-extrabold">
            {(["move", "choice", "arrow", "info"] as Mode[]).map((m) => (
              <button key={m} onClick={() => patch({ mode: m })}
                className={clsx("flex-1 py-1.5 cursor-pointer capitalize", cur.mode === m ? "bg-[#2E6FE0] text-white" : "bg-white text-[#5d6f63]")}>{m}</button>
            ))}
          </div>
        </div>

        {/* Mode-specific controls */}
        {(cur.mode === "move" || cur.mode === "info") && (
          <div className="mt-3">
            <p className="text-[11px] font-extrabold text-[#5d6f63] mb-1">
              {cur.mode === "move" ? "ANSWER PLAYERS (tap to toggle, then draw a zone for each)" : "INFO PLAYERS (tap to toggle)"}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {players.map((p) => (
                <button key={p.id} onClick={() => toggleAnswer(p.id)}
                  className={clsx("rounded-lg px-2.5 py-1 text-xs font-extrabold cursor-pointer border",
                    cur.answerIds.includes(p.id) ? "bg-[#FFD166] text-[#5a4500] border-[#FFD166]" : "bg-white text-[#33433a] border-[rgba(20,60,35,.15)]")}>
                  {p.team === "home" ? "Blue" : "Red"} #{p.label}
                </button>
              ))}
            </div>
            {cur.mode === "move" && cur.answerIds.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {cur.answerIds.map((id) => {
                  const p = cur.objects.find((o) => o.id === id);
                  return (
                    <button key={id} onClick={() => setTool({ kind: "drawZone", forId: id })}
                      className={clsx("rounded-lg px-2.5 py-1 text-[11px] font-bold cursor-pointer border",
                        tool.kind === "drawZone" && tool.forId === id ? "bg-[#FFD166] border-[#FFD166]" : cur.zones[id] ? "bg-[#2B8A4E14] border-[#2B8A4E55] text-[#1e5e36]" : "bg-white border-[rgba(20,60,35,.15)]")}>
                      {cur.zones[id] ? "✓ " : "Draw zone: "}#{p?.label}
                    </button>
                  );
                })}
              </div>
            )}
            {cur.mode === "info" && cur.answerIds.map((id) => {
              const p = cur.objects.find((o) => o.id === id);
              const card = cur.infoCards[id] || { title: "", text: "" };
              return (
                <div key={id} className="mt-2 rounded-lg border border-[rgba(20,60,35,.12)] p-2">
                  <p className="text-[11px] font-extrabold text-[#2E6FE0] mb-1">Role card for #{p?.label}</p>
                  <input value={card.title || ""} onChange={(e) => patch({ infoCards: { ...cur.infoCards, [id]: { ...card, title: e.target.value } } })}
                    placeholder="Title (e.g. #6 — Holding Mid)" className="w-full rounded-md border border-[rgba(20,60,35,.12)] px-2 py-1 text-xs font-bold mb-1" />
                  <textarea value={card.text} onChange={(e) => patch({ infoCards: { ...cur.infoCards, [id]: { ...card, text: e.target.value } } })}
                    placeholder="What this player does" className="w-full rounded-md border border-[rgba(20,60,35,.12)] px-2 py-1 text-xs font-semibold" rows={2} />
                </div>
              );
            })}
          </div>
        )}

        {cur.mode === "arrow" && (
          <p className="mt-3 text-[11px] font-semibold text-[#5d6f63]">
            Add an arrow, then drag its gold tip to the correct target. The tip position becomes the answer (a zone is auto-created around it).
          </p>
        )}

        {cur.mode === "choice" && (
          <div className="mt-3">
            <p className="text-[11px] font-extrabold text-[#5d6f63] mb-1">CHOICES (tap the circle to mark the correct one)</p>
            <div className="flex flex-col gap-1.5">
              {cur.choices.map((c, i) => (
                <div key={i} className="flex items-center gap-2">
                  <button onClick={() => patch({ choices: cur.choices.map((x, j) => ({ ...x, correct: j === i })) })}
                    className={clsx("w-6 h-6 shrink-0 rounded-full border-2 cursor-pointer", c.correct ? "bg-[#2B8A4E] border-[#2B8A4E]" : "bg-white border-[rgba(20,60,35,.3)]")} title="Mark correct">
                    {c.correct ? "✓" : ""}
                  </button>
                  <input value={c.text} onChange={(e) => patch({ choices: cur.choices.map((x, j) => (j === i ? { ...x, text: e.target.value } : x)) })}
                    placeholder={`Option ${i + 1}`} className="flex-1 rounded-md border border-[rgba(20,60,35,.12)] px-2 py-1 text-xs font-bold" />
                  {cur.choices.length > 2 && <button onClick={() => patch({ choices: cur.choices.filter((_, j) => j !== i) })} className="text-[#E0463B] text-sm cursor-pointer">×</button>}
                </div>
              ))}
              {cur.choices.length < 4 && <button onClick={() => patch({ choices: [...cur.choices, { text: "", correct: false }] })} className="text-xs font-bold text-[#2B8A4E] cursor-pointer self-start">+ Add option</button>}
            </div>
          </div>
        )}

        {/* Text fields */}
        <div className="mt-4 flex flex-col gap-2">
          <input value={cur.question} onChange={(e) => patch({ question: e.target.value })} placeholder="Question (what the player sees)" className="w-full rounded-md border border-[rgba(20,60,35,.12)] px-2.5 py-1.5 text-sm font-bold" />
          <input value={cur.instruction} onChange={(e) => patch({ instruction: e.target.value })} placeholder="Instruction (what to do)" className="w-full rounded-md border border-[rgba(20,60,35,.12)] px-2.5 py-1.5 text-xs font-semibold" />
          <input value={cur.optimalNote} onChange={(e) => patch({ optimalNote: e.target.value })} placeholder="Success note (shown when correct)" className="w-full rounded-md border border-[rgba(20,60,35,.12)] px-2.5 py-1.5 text-xs font-semibold" />
          <textarea value={cur.explanation} onChange={(e) => patch({ explanation: e.target.value })} placeholder="Explanation (the why — shown on reveal)" rows={2} className="w-full rounded-md border border-[rgba(20,60,35,.12)] px-2.5 py-1.5 text-xs font-semibold" />
        </div>

        {/* Actions */}
        <div className="mt-4 grid grid-cols-2 gap-2">
          <button onClick={onTest} className="rounded-xl bg-[#2E6FE0] text-white font-extrabold text-sm py-2.5 cursor-pointer">▶ Test play</button>
          <button onClick={onSave} className="rounded-xl bg-[#2B8A4E] text-white font-extrabold text-sm py-2.5 cursor-pointer">Save lesson</button>
          <button onClick={onExport} className="rounded-xl bg-white border border-[rgba(20,60,35,.15)] font-bold text-sm py-2.5 cursor-pointer">Export JSON</button>
          <button onClick={() => fileRef.current?.click()} className="rounded-xl bg-white border border-[rgba(20,60,35,.15)] font-bold text-sm py-2.5 cursor-pointer">Import JSON</button>
          <input ref={fileRef} type="file" accept="application/json" onChange={onImport} className="hidden" />
        </div>

        {flash && <p className="mt-3 text-center text-sm font-bold text-[#2B8A4E]">{flash}</p>}
      </div>
    </main>
  );
}
