"use client";
// Scenario author — ported from soccer-iq-lab's author mode. Build a custom
// lesson: place/move/remove board objects, pick an answer mode, set answer
// players + draw their target zones (move), set choices (choice), draw an answer
// arrow (arrow), or pick info players (info), write the question/explanation,
// page through multiple scenarios, test-play, and save/export/import. Custom
// lessons persist in the store and appear under "Your Lessons" on /learn.
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { clsx } from "clsx";
import { AuthorBoard, type AuthorTool } from "@/components/lessons/AuthorBoard";
import { FormationPreview } from "@/components/lessons/FormationPreview";
import { MatchSetupControls } from "@/components/game/MatchSetupControls";
import { LessonPlayer } from "@/components/lessons/LessonPlayer";
import { useGameStore } from "@/stores/gameStore";
import { getLesson } from "@/data/lessons";
import { W, H } from "@/engine/constants";
import type { BoardObject, Scenario, Zone, Lesson, Choice, InfoCard, LessonStep, ScenarioObjective } from "@/types/lessons";
import type { ZoneRule } from "@/types/game";

type Mode = "move" | "choice" | "arrow" | "info";
// The three lesson modes a step can be.
type StepKind = "instructional" | "scenario" | "game";
type ObjType = "passCount" | "receiveInZone" | "score" | "keepPossession" | "winBack";

interface DraftScenario {
  id: string;
  stepKind: StepKind;        // which of the 3 modes this step is
  // Instructional (static board) SETUP + content fields:
  questionType: "positioning" | "movement" | "decision";
  difficulty: "beginner" | "intermediate" | "advanced";
  youAre: "home" | "away";
  attackDir: "right" | "left";
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
  // Scenario (live) + Game fields:
  liveTitle: string;
  liveBody: string;
  format: "3v3" | "5v5" | "7v7";
  userRole: string;          // role the player controls
  oppTacticId: string;       // opponent tactic preset
  duration: number;          // match length (ms)
  aiDifficulty: "easy" | "medium" | "hard";
  forcedRestart: "" | "throwin" | "goalkick" | "kickoff" | "corner";
  objType: ObjType;
  objTarget: number;
  objToRole: string;         // passCount: pass-to role; receiveInZone: receiver
  zoneRules: ZoneRule[];     // boundaries / rules for scenario & game steps
}

let seq = 0;
const nid = (p: string) => `${p}-${Date.now().toString(36)}-${seq++}`;

function blankScenario(kind: StepKind = "instructional"): DraftScenario {
  return {
    id: nid("sc"), stepKind: kind,
    questionType: "positioning", difficulty: "beginner", youAre: "home", attackDir: "right",
    question: "", instruction: "", optimalNote: "", explanation: "",
    mode: "move", objects: [], answerIds: [], arrowId: null, zones: {}, choices: [
      { text: "", correct: true }, { text: "", correct: false },
    ], infoCards: {},
    liveTitle: kind === "game" ? "Now play a game" : "Try it live",
    liveBody: "", format: "5v5", userRole: "hold",
    oppTacticId: "possession", duration: 180000, aiDifficulty: "medium",
    forcedRestart: "",
    objType: "passCount", objTarget: 5, objToRole: "gk", zoneRules: [],
  };
}

// Convert a draft into a real Scenario for play/export.
function toScenario(d: DraftScenario): Scenario {
  const base = {
    id: d.id, format: "5v5-1-2-1", type: d.questionType, difficulty: d.difficulty,
    youAre: d.youAre, attackDir: d.attackDir,
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

// Build the objective for a live-scenario draft.
function draftToObjective(d: DraftScenario): ScenarioObjective {
  const t = Math.max(1, Math.round(d.objTarget));
  switch (d.objType) {
    case "passCount":
      return { type: "passCount", label: d.objToRole ? `Passes to #${d.objToRole}` : "Complete passes", target: t, toRole: d.objToRole || undefined };
    case "receiveInZone":
      // Default support box: central, in our (bottom) half.
      return { type: "receiveInZone", label: `Receive in the zone`, role: d.objToRole || d.userRole, zone: { x: W / 2 - 150, y: H * 0.6, w: 300, h: H * 0.3 }, target: t };
    case "score":
      return { type: "score", label: "Score a goal", target: t };
    case "keepPossession":
      return { type: "keepPossession", label: `Keep the ball ${t}s`, seconds: t };
    case "winBack":
      return { type: "winBack", label: `Win it back within ${t}s`, withinSeconds: t };
  }
}

// Convert a draft into the right lesson step for its kind.
function draftToStep(d: DraftScenario): LessonStep {
  if (d.stepKind === "scenario") {
    return {
      kind: "live-scenario",
      title: d.liveTitle || "Try it live",
      body: d.liveBody,
      matchConfig: { format: d.format, userRole: d.userRole, oppTacticId: d.oppTacticId, duration: d.duration, aiDifficulty: d.aiDifficulty, zoneRules: d.zoneRules },
      objective: draftToObjective(d),
      scenarioSetup: d.forcedRestart ? { forcedRestart: d.forcedRestart } : undefined,
    };
  }
  if (d.stepKind === "game") {
    return {
      kind: "play",
      title: d.liveTitle || "Play a game",
      body: d.liveBody,
      matchConfig: { format: d.format, userRole: d.userRole, oppTacticId: d.oppTacticId, duration: d.duration, aiDifficulty: d.aiDifficulty, zoneRules: d.zoneRules },
    };
  }
  return { kind: "scenario", scenario: toScenario(d) };
}

// Convert a stored Scenario back into an editable draft (reverse of toScenario).
// Used by both Import JSON and Edit-an-existing-lesson.
function scenarioToDraft(s: Scenario): DraftScenario {
  return {
    ...blankScenario("instructional"),
    id: s.id || nid("sc"),
    questionType: (s.type as DraftScenario["questionType"]) || "positioning",
    difficulty: (s.difficulty as DraftScenario["difficulty"]) || "beginner",
    youAre: s.youAre || "home", attackDir: s.attackDir || "right",
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
  };
}

// Pull a lesson's steps into editable drafts (all 3 kinds).
function lessonToDrafts(lesson: Lesson): DraftScenario[] {
  const drafts: DraftScenario[] = [];
  for (const st of lesson.steps) {
    if (st.kind === "scenario") {
      drafts.push(scenarioToDraft(st.scenario));
    } else if (st.kind === "live-scenario") {
      const d = blankScenario("scenario");
      d.liveTitle = st.title; d.liveBody = st.body;
      d.format = (st.matchConfig.format as DraftScenario["format"]) ?? "5v5";
      d.userRole = st.matchConfig.userRole ?? "hold";
      d.oppTacticId = st.matchConfig.oppTacticId ?? "possession";
      d.duration = st.matchConfig.duration ?? 180000;
      d.aiDifficulty = st.matchConfig.aiDifficulty ?? "medium";
      d.zoneRules = st.matchConfig.zoneRules ?? [];
      d.forcedRestart = st.scenarioSetup?.forcedRestart ?? "";
      d.objType = st.objective.type;
      d.objTarget = st.objective.type === "keepPossession" ? st.objective.seconds
        : st.objective.type === "winBack" ? st.objective.withinSeconds
        : "target" in st.objective ? (st.objective.target ?? 1) : 1;
      d.objToRole = st.objective.type === "passCount" ? (st.objective.toRole ?? "")
        : st.objective.type === "receiveInZone" ? st.objective.role : "";
      drafts.push(d);
    } else if (st.kind === "play") {
      const d = blankScenario("game");
      d.liveTitle = st.title; d.liveBody = st.body;
      d.format = (st.matchConfig.format as DraftScenario["format"]) ?? "5v5";
      d.userRole = st.matchConfig.userRole ?? "hold";
      d.oppTacticId = st.matchConfig.oppTacticId ?? "possession";
      d.duration = st.matchConfig.duration ?? 180000;
      d.aiDifficulty = st.matchConfig.aiDifficulty ?? "medium";
      d.zoneRules = st.matchConfig.zoneRules ?? [];
      drafts.push(d);
    }
    // explain steps are skipped (the author models content via scenarios/steps)
  }
  return drafts.length ? drafts : [blankScenario()];
}

// useSearchParams (for ?edit=) requires a Suspense boundary in Next 16.
export default function AuthorPage() {
  return (
    <Suspense fallback={<main className="flex-1 p-4" />}>
      <AuthorEditor />
    </Suspense>
  );
}

function AuthorEditor() {
  const saveCustomLesson = useGameStore((s) => s.saveCustomLesson);
  const customLessons = useGameStore((s) => s.customLessons) ?? [];
  const searchParams = useSearchParams();
  const editParam = searchParams.get("edit");

  const [title, setTitle] = useState("My Lesson");
  const [scenarios, setScenarios] = useState<DraftScenario[]>([blankScenario()]);
  const [idx, setIdx] = useState(0);
  const [tool, setTool] = useState<AuthorTool>({ kind: "select" });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [testLesson, setTestLesson] = useState<Lesson | null>(null);
  const [flash, setFlash] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);
  // When editing: the id of the OWN lesson we update in place. Editing a built-in
  // leaves this null so Save forks a new custom copy (originals stay intact).
  const [editingOwnId, setEditingOwnId] = useState<string | null>(null);
  const loadedFor = useRef<string | null>(null);

  // Load a lesson into the editor when arriving via /author?edit=<id>.
  useEffect(() => {
    if (!editParam || loadedFor.current === editParam) return;
    const builtin = getLesson(editParam);
    const own = customLessons.find((l) => l.id === editParam);
    const lesson = builtin ?? own;
    if (!lesson) return;
    loadedFor.current = editParam;
    setScenarios(lessonToDrafts(lesson));
    setIdx(0);
    setSelectedId(null);
    if (own) {
      setTitle(own.title);
      setEditingOwnId(own.id); // update in place
    } else {
      setTitle(`${lesson.title} (edited)`); // forking a built-in
      setEditingOwnId(null);
    }
  }, [editParam, customLessons]);

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
  // Move/resize an existing zone (no tool reset — stays in edit/select mode).
  const updateZone = (id: string, z: Zone) => patch({ zones: { ...cur.zones, [id]: z } });
  const removeZone = (id: string) => { const next = { ...cur.zones }; delete next[id]; patch({ zones: next }); toast("Zone removed"); };

  const toggleAnswer = (id: string) => {
    const has = cur.answerIds.includes(id);
    patch({ answerIds: has ? cur.answerIds.filter((x) => x !== id) : [...cur.answerIds, id] });
  };

  // ---- scenario pager ----
  const addScenario = (kind: StepKind = "instructional") => { setScenarios([...scenarios, blankScenario(kind)]); setIdx(scenarios.length); setSelectedId(null); };
  const setStepKind = (kind: StepKind) => patch({ stepKind: kind });
  const delScenario = () => {
    if (scenarios.length <= 1) { toast("A lesson needs at least one scenario"); return; }
    const next = scenarios.filter((_, i) => i !== idx);
    setScenarios(next); setIdx(Math.max(0, idx - 1)); setSelectedId(null);
  };
  // Duplicate the current step (same settings) right after it — handy for
  // building progressions. Board objects get fresh ids and zones/infoCards/
  // answerIds/arrowId are re-keyed to match, so the copy is fully independent.
  const copyScenario = () => {
    const src = scenarios[idx];
    const idMap: Record<string, string> = {};
    const objects = src.objects.map((o) => {
      const nidNew = nid(o.type);
      idMap[o.id] = nidNew;
      return { ...o, id: nidNew };
    });
    const remap = (id: string) => idMap[id] ?? id;
    const dup: DraftScenario = {
      ...src,
      id: nid("sc"),
      objects,
      answerIds: src.answerIds.map(remap),
      arrowId: src.arrowId ? remap(src.arrowId) : null,
      zones: Object.fromEntries(Object.entries(src.zones).map(([k, v]) => [remap(k), { ...v }])),
      infoCards: Object.fromEntries(Object.entries(src.infoCards).map(([k, v]) => [remap(k), { ...v }])),
      choices: src.choices.map((c) => ({ ...c })),
      zoneRules: src.zoneRules.map((r) => ({ ...r })),
    };
    const next = [...scenarios.slice(0, idx + 1), dup, ...scenarios.slice(idx + 1)];
    setScenarios(next); setIdx(idx + 1); setSelectedId(null);
    toast("Step copied");
  };

  // ---- save / export / import ----
  // forSave keeps the existing id when updating an own lesson in place; test-play
  // and fresh saves get a new id.
  const buildLesson = useCallback((forSave = false): Lesson => ({
    id: forSave && editingOwnId ? editingOwnId : nid("custom"),
    title: title.trim() || "My Lesson",
    description: "Custom lesson",
    difficulty: "beginner",
    category: "custom",
    steps: scenarios.map((d) => draftToStep(d)),
  }), [title, scenarios, editingOwnId]);

  const onSave = () => {
    const lesson = buildLesson(true);
    saveCustomLesson(lesson);
    setEditingOwnId(lesson.id); // subsequent saves now update this lesson in place
    toast(editingOwnId ? `Updated "${lesson.title}"` : `Saved "${lesson.title}" — find it on the Learn page`);
  };
  const onTest = () => setTestLesson(buildLesson());
  const onExport = () => {
    // Export the full lesson (all step kinds). Instructional-only lessons also
    // include a `scenarios` array for back-compat with old imports.
    const lesson = buildLesson();
    const instructional = scenarios.filter((d) => d.stepKind === "instructional");
    const data = { version: 3, title, lesson, scenarios: instructional.map(toScenario) };
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
        // v3: a full lesson (all step kinds). Older: a scenarios array.
        let drafts: DraftScenario[];
        if (d.lesson && Array.isArray(d.lesson.steps)) {
          drafts = lessonToDrafts(d.lesson as Lesson);
        } else {
          const scns: Scenario[] = d.scenarios || [];
          if (!scns.length) { toast("No scenarios found"); return; }
          drafts = scns.map(scenarioToDraft);
        }
        if (d.title) setTitle(d.title);
        setScenarios(drafts); setIdx(0); setSelectedId(null);
        setEditingOwnId(null); // imported = a new lesson
        toast(`Imported ${drafts.length} steps`);
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

  const GROUP = "rounded-xl border border-[rgba(20,60,35,.12)] bg-[#f8faf8] p-3 space-y-2";
  const GLABEL = "text-[10px] font-extrabold tracking-wide text-[#5d6f63]";

  return (
    <main className="flex-1 flex flex-col items-center p-4">
      <div className="w-full max-w-6xl">
        {/* Top bar */}
        <div className="flex items-center justify-between mb-3">
          <Link href="/learn" className="text-xs font-extrabold text-[#5d6f63] hover:underline">← Lessons</Link>
          <span className="text-xs font-extrabold tracking-wide text-[#5d6f63]">{editParam ? "EDITING" : "AUTHOR"}</span>
        </div>

        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Lesson title"
          className="w-full rounded-xl border-2 border-[rgba(20,60,35,.12)] px-3 py-2 font-[Fredoka] font-bold text-lg mb-3" />

        {/* Step pager — each pill is colored by its kind */}
        <div className="flex items-center gap-1.5 flex-wrap mb-4">
          <span className="text-[11px] font-extrabold text-[#5d6f63] mr-1">Steps:</span>
          {scenarios.map((s, i) => (
            <button key={i} onClick={() => { setIdx(i); setSelectedId(null); }}
              title={s.stepKind}
              className={clsx("w-7 h-7 rounded-lg text-xs font-extrabold cursor-pointer border",
                i === idx ? "text-white border-transparent" : "bg-white text-[#33433a] border-[rgba(20,60,35,.15)]")}
              style={i === idx ? { backgroundColor: s.stepKind === "scenario" ? "#2E6FE0" : s.stepKind === "game" ? "#2B8A4E" : "#B07E00" } : undefined}>
              {i + 1}
            </button>
          ))}
          <button onClick={() => addScenario("instructional")} className="rounded-lg px-2 h-7 text-[11px] font-extrabold bg-[#B07E00] text-white cursor-pointer" title="Add instructional step">+ Instr</button>
          <button onClick={() => addScenario("scenario")} className="rounded-lg px-2 h-7 text-[11px] font-extrabold bg-[#2E6FE0] text-white cursor-pointer" title="Add scenario step">+ Scenario</button>
          <button onClick={() => addScenario("game")} className="rounded-lg px-2 h-7 text-[11px] font-extrabold bg-[#2B8A4E] text-white cursor-pointer" title="Add game step">+ Game</button>
          {scenarios.length > 1 && <button onClick={delScenario} className="w-7 h-7 rounded-lg text-xs bg-white border border-[rgba(20,60,35,.15)] text-[#E0463B] cursor-pointer" title="Delete step">🗑</button>}
        </div>

        {/* Step-kind selector — what this step IS */}
        <div className="mb-4">
          <p className={GLABEL}>STEP TYPE</p>
          <div className="flex rounded-lg overflow-hidden border border-[rgba(20,60,35,.15)] text-[11px] font-extrabold mt-1">
            {([["instructional", "Instructional"], ["scenario", "Scenario"], ["game", "Game"]] as [StepKind, string][]).map(([k, lbl]) => (
              <button key={k} onClick={() => setStepKind(k)}
                className={clsx("flex-1 py-2 cursor-pointer", cur.stepKind === k ? "bg-[#16241c] text-white" : "bg-white text-[#5d6f63]")}>{lbl}</button>
            ))}
          </div>
          <p className="text-[11px] font-semibold text-[#5d6f63] mt-1">
            {cur.stepKind === "instructional" ? "Static board — drag/tap to learn (the lab-style teaching mode)."
              : cur.stepKind === "scenario" ? "Live game with an objective to complete."
              : "Free live game to put it all together."}
          </p>
        </div>

        {/* Two columns: FIELD on the left, EDITOR sidebar on the right.
            Instructional → editable static board. Scenario/Game → formation
            preview of the configured match (so the field always shows). */}
        <div className="flex flex-col md:flex-row md:items-start gap-5">
          <div className="md:w-[420px] md:shrink-0 md:sticky md:top-4">
            <p className="text-center text-[11px] font-extrabold tracking-wide text-[#5d6f63] mb-1">▲ ATTACK THIS WAY ▲</p>
            {cur.stepKind === "instructional" ? (
              <AuthorBoard
                objects={cur.objects} setObjects={setObjects}
                answerMode={cur.mode} answerIds={cur.answerIds} arrowId={cur.arrowId}
                zones={cur.zones} setZone={setZone} updateZone={updateZone} removeZone={removeZone}
                tool={tool} selectedId={selectedId} onSelect={setSelectedId}
              />
            ) : (
              <FormationPreview format={cur.format} userRole={cur.userRole} zoneRules={cur.zoneRules} />
            )}
          </div>

          {/* EDITOR (right) */}
          <div className="flex-1 min-w-0 space-y-3">
            {/* ── SCENARIO (live) editor ── */}
            {cur.stepKind === "scenario" && (
              <>
                <div className={GROUP}>
                  <p className={GLABEL}>MATCH SETUP</p>
                  <MatchSetupControls
                    value={{ format: cur.format, userRole: cur.userRole, oppTacticId: cur.oppTacticId, duration: cur.duration, aiDifficulty: cur.aiDifficulty }}
                    onChange={(p) => patch(p as Partial<DraftScenario>)}
                  />
                  <label className="block text-[11px] font-extrabold tracking-wide text-[#5d6f63] mt-1">EVERY RESTART IS A
                    <select value={cur.forcedRestart} onChange={(e) => patch({ forcedRestart: e.target.value as DraftScenario["forcedRestart"] })} className="ml-2 rounded-md border border-[rgba(20,60,35,.15)] px-2 py-1 text-xs font-bold bg-white">
                      <option value="">(normal)</option><option value="throwin">Throw-in</option><option value="goalkick">Goal kick</option><option value="corner">Corner</option><option value="kickoff">Kick-off</option>
                    </select>
                  </label>
                </div>
                <div className={GROUP}>
                  <p className={GLABEL}>OBJECTIVE</p>
                  <select value={cur.objType} onChange={(e) => patch({ objType: e.target.value as ObjType })} className="w-full rounded-md border border-[rgba(20,60,35,.15)] px-2 py-1 text-xs font-bold bg-white">
                    <option value="passCount">Complete N passes (to a role)</option>
                    <option value="receiveInZone">Receive in a zone</option>
                    <option value="score">Score N goals</option>
                    <option value="keepPossession">Keep possession N seconds</option>
                    <option value="winBack">Win the ball back within N seconds</option>
                  </select>
                  <div className="flex items-center gap-2">
                    <label className="text-[11px] font-bold text-[#5d6f63]">Target
                      <input type="number" min={1} value={cur.objTarget} onChange={(e) => patch({ objTarget: Number(e.target.value) })} className="ml-2 w-16 rounded-md border border-[rgba(20,60,35,.15)] px-2 py-1 text-xs font-bold bg-white" />
                    </label>
                    {(cur.objType === "passCount" || cur.objType === "receiveInZone") && (
                      <label className="text-[11px] font-bold text-[#5d6f63]">{cur.objType === "passCount" ? "Pass to" : "Receiver"}
                        <select value={cur.objToRole} onChange={(e) => patch({ objToRole: e.target.value })} className="ml-2 rounded-md border border-[rgba(20,60,35,.15)] px-2 py-1 text-xs font-bold bg-white">
                          {cur.objType === "passCount" && <option value="">any teammate</option>}
                          {["gk", "hold", "lw", "rw", "fwd", "lcm", "rcm"].map((r) => <option key={r} value={r}>#{r}</option>)}
                        </select>
                      </label>
                    )}
                  </div>
                </div>
              </>
            )}

            {/* ── GAME editor ── */}
            {cur.stepKind === "game" && (
              <div className={GROUP}>
                <p className={GLABEL}>MATCH SETUP</p>
                <MatchSetupControls
                  value={{ format: cur.format, userRole: cur.userRole, oppTacticId: cur.oppTacticId, duration: cur.duration, aiDifficulty: cur.aiDifficulty }}
                  onChange={(p) => patch(p as Partial<DraftScenario>)}
                />
              </div>
            )}

            {/* ── SCENARIO / GAME shared text (title + intro) ── */}
            {cur.stepKind !== "instructional" && (
              <div className={GROUP}>
                <p className={GLABEL}>TITLE &amp; INTRO</p>
                <input value={cur.liveTitle} onChange={(e) => patch({ liveTitle: e.target.value })} placeholder="Step title" className="w-full rounded-md border border-[rgba(20,60,35,.12)] px-2.5 py-1.5 text-sm font-bold bg-white" />
                <textarea value={cur.liveBody} onChange={(e) => patch({ liveBody: e.target.value })} placeholder="What to do / coaching note" rows={2} className="w-full rounded-md border border-[rgba(20,60,35,.12)] px-2.5 py-1.5 text-xs font-semibold bg-white" />
              </div>
            )}

            {/* ── INSTRUCTIONAL (static board) editor ── */}
            {cur.stepKind === "instructional" && <>
            {/* Setup (lab-style) */}
            <div className={GROUP}>
              <p className={GLABEL}>SETUP</p>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold text-[#5d6f63] w-20">Question</span>
                <div className="flex rounded-lg overflow-hidden border border-[rgba(20,60,35,.15)] text-[10px] font-extrabold">
                  {(["positioning", "movement", "decision"] as const).map((q) => (
                    <button key={q} onClick={() => patch({ questionType: q })} className={clsx("px-2 py-1 cursor-pointer capitalize", cur.questionType === q ? "bg-[#2E6FE0] text-white" : "bg-white text-[#5d6f63]")}>{q}</button>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold text-[#5d6f63] w-20">Difficulty</span>
                <div className="flex rounded-lg overflow-hidden border border-[rgba(20,60,35,.15)] text-[10px] font-extrabold">
                  {(["beginner", "intermediate", "advanced"] as const).map((q) => (
                    <button key={q} onClick={() => patch({ difficulty: q })} className={clsx("px-2 py-1 cursor-pointer capitalize", cur.difficulty === q ? "bg-[#2E6FE0] text-white" : "bg-white text-[#5d6f63]")}>{q}</button>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold text-[#5d6f63] w-20">You are</span>
                <div className="flex rounded-lg overflow-hidden border border-[rgba(20,60,35,.15)] text-[10px] font-extrabold">
                  <button onClick={() => patch({ youAre: "home" })} className={clsx("px-3 py-1 cursor-pointer", cur.youAre === "home" ? "bg-[#2E6FE0] text-white" : "bg-white text-[#5d6f63]")}>Blue</button>
                  <button onClick={() => patch({ youAre: "away" })} className={clsx("px-3 py-1 cursor-pointer", cur.youAre === "away" ? "bg-[#E0463B] text-white" : "bg-white text-[#5d6f63]")}>Red</button>
                </div>
                <span className="text-[11px] font-bold text-[#5d6f63] ml-2">Attacking</span>
                <div className="flex rounded-lg overflow-hidden border border-[rgba(20,60,35,.15)] text-[10px] font-extrabold">
                  <button onClick={() => patch({ attackDir: "right" })} className={clsx("px-2 py-1 cursor-pointer", cur.attackDir === "right" ? "bg-[#16241c] text-white" : "bg-white text-[#5d6f63]")}>→ Right</button>
                  <button onClick={() => patch({ attackDir: "left" })} className={clsx("px-2 py-1 cursor-pointer", cur.attackDir === "left" ? "bg-[#16241c] text-white" : "bg-white text-[#5d6f63]")}>Left ←</button>
                </div>
              </div>
            </div>

            {/* Add objects */}
            <div className={GROUP}>
              <p className={GLABEL}>ADD TO THE BOARD</p>
              <div className="flex flex-wrap gap-2">
                <button onClick={() => addPlayer("home")} className="rounded-lg px-3 py-1.5 text-xs font-extrabold bg-[#2E6FE0] text-white cursor-pointer">+ Player (Blue)</button>
                <button onClick={() => addPlayer("away")} className="rounded-lg px-3 py-1.5 text-xs font-extrabold bg-[#E0463B] text-white cursor-pointer">+ Player (Red)</button>
                <button onClick={addBall} className="rounded-lg px-3 py-1.5 text-xs font-extrabold bg-white border border-[rgba(20,60,35,.15)] cursor-pointer">+ Ball</button>
                {cur.mode === "arrow" && <button onClick={addArrow} className="rounded-lg px-3 py-1.5 text-xs font-extrabold bg-white border border-[rgba(20,60,35,.15)] cursor-pointer">+ Arrow</button>}
                <button onClick={removeSelected} disabled={!selectedId} className="ml-auto rounded-lg px-3 py-1.5 text-xs font-extrabold bg-white border border-[rgba(20,60,35,.15)] text-[#E0463B] cursor-pointer disabled:opacity-40">🗑 Del</button>
              </div>
              {/* Selected player: color + label (lab parity) */}
              {(() => {
                const sel = cur.objects.find((o) => o.id === selectedId && o.type === "player");
                if (!sel) return null;
                const setSel = (patchObj: Partial<BoardObject>) => setObjects(cur.objects.map((o) => o.id === sel.id ? { ...o, ...patchObj } : o));
                return (
                  <div className="flex items-center gap-2 pt-1">
                    <span className="text-[11px] font-bold text-[#5d6f63]">Selected:</span>
                    <button onClick={() => setSel({ team: "home" })} className={clsx("w-6 h-6 rounded-full cursor-pointer", sel.team === "home" ? "ring-2 ring-offset-1 ring-[#2E6FE0]" : "")} style={{ background: "#2E6FE0" }} title="Blue" />
                    <button onClick={() => setSel({ team: "away" })} className={clsx("w-6 h-6 rounded-full cursor-pointer", sel.team === "away" ? "ring-2 ring-offset-1 ring-[#E0463B]" : "")} style={{ background: "#E0463B" }} title="Red" />
                    <span className="text-[11px] font-bold text-[#5d6f63] ml-1">Label</span>
                    <input value={sel.label ?? ""} onChange={(e) => setSel({ label: e.target.value.slice(0, 3) })} className="w-14 rounded-md border border-[rgba(20,60,35,.15)] px-2 py-1 text-xs font-bold bg-white" />
                  </div>
                );
              })()}
            </div>

            {/* Answer type */}
            <div className={GROUP}>
              <p className={GLABEL}>ANSWER TYPE</p>
              <div className="flex rounded-lg overflow-hidden border border-[rgba(20,60,35,.15)] text-[11px] font-extrabold">
                {([["move", "Move player"], ["arrow", "Draw arrow"], ["choice", "Multiple choice"], ["info", "Info (tap)"]] as [Mode, string][]).map(([m, lbl]) => (
                  <button key={m} onClick={() => patch({ mode: m })}
                    className={clsx("flex-1 py-1.5 cursor-pointer", cur.mode === m ? "bg-[#2E6FE0] text-white" : "bg-white text-[#5d6f63]")}>{lbl}</button>
                ))}
              </div>

              {/* Move/Info: pick answer players */}
              {(cur.mode === "move" || cur.mode === "info") && (
                <div className="space-y-2 pt-1">
                  <p className="text-[11px] font-semibold text-[#5d6f63]">
                    {cur.mode === "move" ? "⌖ Toggle answer players, then draw a zone for each." : "⌖ Toggle the players to learn about."}
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {players.map((p) => (
                      <button key={p.id} onClick={() => toggleAnswer(p.id)}
                        className={clsx("rounded-lg px-2.5 py-1 text-xs font-extrabold cursor-pointer border",
                          cur.answerIds.includes(p.id) ? "bg-[#FFD166] text-[#5a4500] border-[#FFD166]" : "bg-white text-[#33433a] border-[rgba(20,60,35,.15)]")}>
                        {p.team === "home" ? "Blue" : "Red"} #{p.label}
                      </button>
                    ))}
                    {players.length === 0 && <span className="text-[11px] text-[#9aa79f]">Add players to the board first.</span>}
                  </div>
                  {cur.mode === "move" && cur.answerIds.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {cur.answerIds.map((id) => {
                        const p = cur.objects.find((o) => o.id === id);
                        return (
                          <button key={id} onClick={() => setTool({ kind: "drawZone", forId: id })}
                            className={clsx("rounded-lg px-2.5 py-1 text-[11px] font-bold cursor-pointer border",
                              tool.kind === "drawZone" && tool.forId === id ? "bg-[#FFD166] border-[#FFD166]" : cur.zones[id] ? "bg-[#2B8A4E14] border-[#2B8A4E55] text-[#1e5e36]" : "bg-white border-[rgba(20,60,35,.15)]")}>
                            {cur.zones[id] ? "✓ zone " : "▭ Draw zone "}#{p?.label}
                          </button>
                        );
                      })}
                    </div>
                  )}
                  {cur.mode === "info" && cur.answerIds.map((id) => {
                    const p = cur.objects.find((o) => o.id === id);
                    const card = cur.infoCards[id] || { title: "", text: "" };
                    return (
                      <div key={id} className="rounded-lg border border-[rgba(20,60,35,.12)] bg-white p-2">
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
                <p className="text-[11px] font-semibold text-[#5d6f63] pt-1">
                  Add an arrow, then drag its gold tip to the correct target — the tip becomes the answer.
                </p>
              )}

              {cur.mode === "choice" && (
                <div className="space-y-1.5 pt-1">
                  <p className="text-[11px] font-semibold text-[#5d6f63]">Tap the circle to mark the correct option.</p>
                  {cur.choices.map((c, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <button onClick={() => patch({ choices: cur.choices.map((x, j) => ({ ...x, correct: j === i })) })}
                        className={clsx("w-6 h-6 shrink-0 rounded-full border-2 cursor-pointer text-xs text-white", c.correct ? "bg-[#2B8A4E] border-[#2B8A4E]" : "bg-white border-[rgba(20,60,35,.3)]")} title="Mark correct">
                        {c.correct ? "✓" : ""}
                      </button>
                      <input value={c.text} onChange={(e) => patch({ choices: cur.choices.map((x, j) => (j === i ? { ...x, text: e.target.value } : x)) })}
                        placeholder={`Option ${i + 1}`} className="flex-1 rounded-md border border-[rgba(20,60,35,.12)] px-2 py-1 text-xs font-bold bg-white" />
                      {cur.choices.length > 2 && <button onClick={() => patch({ choices: cur.choices.filter((_, j) => j !== i) })} className="text-[#E0463B] text-sm cursor-pointer">×</button>}
                    </div>
                  ))}
                  {cur.choices.length < 4 && <button onClick={() => patch({ choices: [...cur.choices, { text: "", correct: false }] })} className="text-xs font-bold text-[#2B8A4E] cursor-pointer">+ Add Option</button>}
                </div>
              )}
            </div>

            {/* Text fields */}
            <div className={GROUP}>
              <p className={GLABEL}>QUESTION &amp; EXPLANATION</p>
              <input value={cur.question} onChange={(e) => patch({ question: e.target.value })} placeholder="Question (what the player sees)" className="w-full rounded-md border border-[rgba(20,60,35,.12)] px-2.5 py-1.5 text-sm font-bold bg-white" />
              <input value={cur.instruction} onChange={(e) => patch({ instruction: e.target.value })} placeholder="Instruction (what to do)" className="w-full rounded-md border border-[rgba(20,60,35,.12)] px-2.5 py-1.5 text-xs font-semibold bg-white" />
              <input value={cur.optimalNote} onChange={(e) => patch({ optimalNote: e.target.value })} placeholder="Success note (shown when correct)" className="w-full rounded-md border border-[rgba(20,60,35,.12)] px-2.5 py-1.5 text-xs font-semibold bg-white" />
              <textarea value={cur.explanation} onChange={(e) => patch({ explanation: e.target.value })} placeholder="Explanation (the why — shown on reveal)" rows={2} className="w-full rounded-md border border-[rgba(20,60,35,.12)] px-2.5 py-1.5 text-xs font-semibold bg-white" />
            </div>
            </>}

            {/* Ready checklist + step counter (lab parity) */}
            {(() => {
              const ready =
                cur.stepKind === "instructional"
                  ? !!cur.question.trim() && (cur.mode === "choice" ? cur.choices.some((c) => c.correct && c.text.trim()) : cur.answerIds.length > 0 || cur.mode === "arrow")
                  : !!cur.liveTitle.trim();
              return (
                <div className="flex items-center justify-between text-[11px] font-bold px-1">
                  <span className={ready ? "text-[#2B8A4E]" : "text-[#9aa79f]"}>{ready ? "✓ Ready to add" : "Fill in this step…"}</span>
                  <span className="text-[#5d6f63]">{scenarios.length} step{scenarios.length !== 1 ? "s" : ""} in lesson</span>
                </div>
              );
            })()}

            {/* Actions */}
            <div className="grid grid-cols-2 gap-2">
              {/* Row 1: Add Step | Copy Step */}
              <button onClick={() => addScenario(cur.stepKind)} className="rounded-xl bg-white border-2 border-[#2B8A4E] text-[#2B8A4E] font-extrabold text-sm py-2.5 cursor-pointer">＋ Add Step</button>
              <button onClick={copyScenario} className="rounded-xl bg-white border-2 border-[#2E6FE0] text-[#2E6FE0] font-extrabold text-sm py-2.5 cursor-pointer">⧉ Copy Step</button>
              {/* Row 2: Test | Delete this step */}
              <button onClick={onTest} className="rounded-xl bg-[#2E6FE0] text-white font-extrabold text-sm py-2.5 cursor-pointer">▶ Test</button>
              <button
                onClick={() => { if (scenarios.length > 1 && confirm(`Delete step ${idx + 1}?`)) delScenario(); else if (scenarios.length <= 1) toast("A lesson needs at least one step"); }}
                disabled={scenarios.length <= 1}
                className="rounded-xl bg-white border-2 border-[#E0463B] text-[#E0463B] font-extrabold text-sm py-2.5 cursor-pointer disabled:opacity-35 disabled:cursor-default"
              >🗑 Delete Step</button>
              <button onClick={onSave} className="rounded-xl bg-[#2B8A4E] text-white font-extrabold text-sm py-2.5 cursor-pointer col-span-2">💾 {editingOwnId ? "Update" : "Save"} lesson</button>
              <button onClick={onExport} className="rounded-xl bg-white border border-[rgba(20,60,35,.15)] font-bold text-sm py-2.5 cursor-pointer">Export JSON</button>
              <button onClick={() => fileRef.current?.click()} className="rounded-xl bg-white border border-[rgba(20,60,35,.15)] font-bold text-sm py-2.5 cursor-pointer">Import JSON</button>
              <input ref={fileRef} type="file" accept="application/json" onChange={onImport} className="hidden" />
            </div>

            {flash && <p className="text-center text-sm font-bold text-[#2B8A4E]">{flash}</p>}
          </div>
        </div>
      </div>
    </main>
  );
}
