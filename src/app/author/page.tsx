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
import { W, H, JERSEY_NUMBERS, ROLE_LABELS } from "@/engine/constants";
import { BUILTIN_PRESETS } from "@/data/zonePresets";

// Jersey-number label for a role key, e.g. "hold" → "#6 Holding Mid (6)".
const roleLabel = (r: string) => `#${JERSEY_NUMBERS[r] ?? "?"} ${ROLE_LABELS[r] ?? r}`;
const OBJ_ROLES = ["gk", "hold", "lw", "rw", "fwd", "lcm", "rcm"];
import type { BoardObject, Scenario, Zone, Lesson, Choice, InfoCard, LessonStep, ScenarioObjective } from "@/types/lessons";
import type { ZoneRule, EngineRect, ZoneCondition, ZoneMovement, ZoneAction, ZoneOffBall } from "@/types/game";

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
  restartTeam: "us" | "them";   // which team starts in possession of the restart
  repSeconds: number;            // 0 = single run; >0 = auto-reset every N seconds
  restartDelaySec: number;       // "get set" pause before the ball is taken
  objType: ObjType;
  objTarget: number;
  objToRole: string;         // passCount: pass-to role; receiveInZone: receiver
  objZone: EngineRect | null; // receiveInZone target zone (drawn on the field)
  restartPoint: { x: number; y: number } | null; // where the forced restart is taken
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
    forcedRestart: "", restartTeam: "us", repSeconds: 0, restartDelaySec: 5,
    objType: "passCount", objTarget: 5, objToRole: "gk",
    objZone: null, restartPoint: null, zoneRules: [],
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
  const jn = (r: string) => `#${JERSEY_NUMBERS[r] ?? r}`;
  switch (d.objType) {
    case "passCount":
      return { type: "passCount", label: d.objToRole ? `Passes to ${jn(d.objToRole)}` : "Complete passes", target: t, toRole: d.objToRole || undefined };
    case "receiveInZone":
      // Use the drawn zone if the author placed one; else a default support box.
      return { type: "receiveInZone", label: `${jn(d.objToRole || d.userRole)} receives in the zone`, role: d.objToRole || d.userRole, zone: d.objZone ?? { x: W / 2 - 150, y: H * 0.6, w: 300, h: H * 0.3 }, target: t };
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
      // Build a scenarioSetup whenever ANY of its knobs is set — not only when a
      // restart type is forced. The get-set pause (restartDelaySec) and rep timer
      // apply to normal restarts too, so a step can carry its own delay with no
      // forced restart. restartTeam is only meaningful alongside a forced restart.
      scenarioSetup: (d.forcedRestart || d.repSeconds > 0 || d.restartDelaySec > 0)
        ? {
            ...(d.forcedRestart ? { forcedRestart: d.forcedRestart, restartTeam: d.restartTeam } : {}),
            ...(d.forcedRestart && d.restartPoint ? { restartX: d.restartPoint.x, restartY: d.restartPoint.y } : {}),
            ...(d.repSeconds > 0 ? { repSeconds: d.repSeconds } : {}),
            ...(d.restartDelaySec > 0 ? { restartDelaySec: d.restartDelaySec } : {}),
          }
        : undefined,
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
      d.restartTeam = st.scenarioSetup?.restartTeam ?? "us";
      d.repSeconds = st.scenarioSetup?.repSeconds ?? 0;
      d.restartDelaySec = st.scenarioSetup?.restartDelaySec ?? 5;
      d.objType = st.objective.type;
      d.objTarget = st.objective.type === "keepPossession" ? st.objective.seconds
        : st.objective.type === "winBack" ? st.objective.withinSeconds
        : "target" in st.objective ? (st.objective.target ?? 1) : 1;
      d.objToRole = st.objective.type === "passCount" ? (st.objective.toRole ?? "")
        : st.objective.type === "receiveInZone" ? st.objective.role : "";
      d.objZone = st.objective.type === "receiveInZone" ? st.objective.zone : null;
      d.restartPoint = (st.scenarioSetup?.restartX != null && st.scenarioSetup?.restartY != null)
        ? { x: st.scenarioSetup.restartX, y: st.scenarioSetup.restartY } : null;
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
  // The persisted store rehydrates from localStorage asynchronously after mount.
  // We must wait for that before loading ?edit=<id>, otherwise customLessons is
  // still [] and we'd load the pristine built-in instead of a saved fork/copy.
  // Start false (SSR-safe: persist API is client-only). The effect flips it true
  // once hydration is done — either already, or via the finish callback.
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    const persist = useGameStore.persist;
    if (!persist) { setHydrated(true); return; }
    const unsub = persist.onFinishHydration(() => setHydrated(true));
    if (persist.hasHydrated()) setHydrated(true);
    return unsub;
  }, []);
  const customPresets = useGameStore((s) => s.customPresets) ?? [];
  const allPresets = [...BUILTIN_PRESETS, ...customPresets];
  const searchParams = useSearchParams();
  const editParam = searchParams.get("edit");

  const [title, setTitle] = useState("My Lesson");
  const [scenarios, setScenarios] = useState<DraftScenario[]>([blankScenario()]);
  const [idx, setIdx] = useState(0);
  const [tool, setTool] = useState<AuthorTool>({ kind: "select" });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  // Interactive placing on the Scenario/Game field preview.
  // "rule:<id>" means drawing the box for that zone rule.
  const [placeMode, setPlaceMode] = useState<"restart" | "zone" | `rule:${string}` | null>(null);
  const [selectedRuleId, setSelectedRuleId] = useState<string | null>(null);
  useEffect(() => { setPlaceMode(null); setSelectedRuleId(null); }, [idx]); // clear on step switch
  const [testLesson, setTestLesson] = useState<Lesson | null>(null);
  const [flash, setFlash] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);
  // When editing: the id of the OWN lesson we update in place. Editing a PRISTINE
  // built-in leaves this null so the first Save forks a custom copy (originals in
  // code stay intact). The fork gets a STABLE id derived from the built-in, so
  // re-opening ?edit=<builtinId> reopens your saved copy instead of the original.
  const [editingOwnId, setEditingOwnId] = useState<string | null>(null);
  // The built-in this draft was forked from (if any) — drives the stable fork id
  // and "based on …" labelling. null when authoring a brand-new lesson.
  const [forkedFromBuiltin, setForkedFromBuiltin] = useState<string | null>(null);
  const loadedFor = useRef<string | null>(null);

  // Stable id for the custom copy of a built-in, so edits round-trip across
  // refreshes via the same ?edit=<builtinId> URL.
  const forkIdFor = (builtinId: string) => `custom-of-${builtinId}`;

  // Load a lesson into the editor when arriving via /author?edit=<id>.
  // Gated on hydration so a saved fork/copy in localStorage is found first.
  useEffect(() => {
    if (!hydrated) return;
    if (!editParam || loadedFor.current === editParam) return;
    const builtin = getLesson(editParam);
    // Prefer an existing edit: your own lesson by that id, OR a saved fork of the
    // built-in. Only fall back to the pristine built-in if no edit exists yet.
    const own =
      customLessons.find((l) => l.id === editParam) ??
      (builtin ? customLessons.find((l) => l.id === forkIdFor(editParam)) : undefined);
    const lesson = own ?? builtin;
    if (!lesson) return;
    loadedFor.current = editParam;
    const loaded = lessonToDrafts(lesson);
    setScenarios(loaded);
    seedHistory(loaded);
    setIdx(0);
    setSelectedId(null);
    if (own) {
      // Editing a saved lesson (a fresh custom one, or a saved fork of a built-in).
      setTitle(own.title);
      setEditingOwnId(own.id);
      setForkedFromBuiltin(builtin ? editParam : null);
    } else {
      // First time editing a pristine built-in → next Save forks a copy.
      setTitle(`${lesson.title} (edited)`);
      setEditingOwnId(null);
      setForkedFromBuiltin(editParam);
    }
  }, [editParam, customLessons, hydrated]);

  const cur = scenarios[idx];

  // ---- Undo / redo history (snapshots of the whole `scenarios` array) ----
  // Continuous edits (a rule drag) share a coalesceKey so the whole drag is ONE
  // undo step; discrete edits (key null) each push their own step.
  const [hist, setHist] = useState<{ stack: DraftScenario[][]; index: number }>({ stack: [[blankScenario()]], index: 0 });
  const coalesceKey = useRef<string | null>(null);
  // Keep history seeded once a lesson loads (replace the initial blank snapshot).
  const seedHistory = useCallback((s: DraftScenario[]) => {
    setHist({ stack: [s], index: 0 });
    coalesceKey.current = null;
  }, []);
  const commit = useCallback((next: DraftScenario[], key: string | null = null) => {
    setScenarios(next);
    setHist((h) => {
      if (key !== null && coalesceKey.current === key) {
        const stack = h.stack.slice(0, h.index + 1);
        stack[h.index] = next; // coalesce into the current step
        return { stack, index: h.index };
      }
      const stack = h.stack.slice(0, h.index + 1);
      stack.push(next);
      return { stack, index: stack.length - 1 };
    });
    coalesceKey.current = key;
  }, []);
  const canUndo = hist.index > 0;
  const canRedo = hist.index < hist.stack.length - 1;
  const undo = useCallback(() => {
    setHist((h) => {
      if (h.index <= 0) return h;
      const ni = h.index - 1;
      setScenarios(h.stack[ni]);
      coalesceKey.current = null;
      setIdx((i) => Math.min(i, h.stack[ni].length - 1));
      return { ...h, index: ni };
    });
  }, []);
  const redo = useCallback(() => {
    setHist((h) => {
      if (h.index >= h.stack.length - 1) return h;
      const ni = h.index + 1;
      setScenarios(h.stack[ni]);
      coalesceKey.current = null;
      setIdx((i) => Math.min(i, h.stack[ni].length - 1));
      return { ...h, index: ni };
    });
  }, []);

  // Content edits flow through patch. `coalesce` (e.g. "rule-drag") merges a
  // continuous gesture into a single undo step. Computes next from current
  // `scenarios` then records once (no setState nested inside another updater).
  const patch = useCallback((p: Partial<DraftScenario>, coalesce: string | null = null) => {
    const next = scenarios.map((s, i) => (i === idx ? { ...s, ...p } : s));
    commit(next, coalesce);
  }, [scenarios, idx, commit]);

  const toast = (m: string) => { setFlash(m); setTimeout(() => setFlash(null), 1800); };

  // Keyboard: undo/redo + Delete removes the selected element (ignored while
  // typing in a field). Uses refs so the listener stays bound once.
  const selRef = useRef({ id: null as string | null, ruleId: null as string | null });
  selRef.current = { id: selectedId, ruleId: selectedRuleId };
  const delRef = useRef<{ removeObj: () => void; removeRule: (id: string) => void }>({ removeObj: () => {}, removeRule: () => {} });
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      const typing = t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.tagName === "SELECT");
      if (typing) return;
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) redo(); else undo();
        return;
      }
      if (e.key === "Delete" || e.key === "Backspace") {
        const { id, ruleId } = selRef.current;
        if (ruleId) { e.preventDefault(); delRef.current.removeRule(ruleId); }
        else if (id) { e.preventDefault(); delRef.current.removeObj(); }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [undo, redo]);

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

  // ---- zone-rule editing (Scenario/Game) ----
  const addRule = (team: "us" | "them") => {
    const role = team === "us" ? "lw" : "lw";
    const rule: ZoneRule = {
      id: nid("zr"), team, role,
      xMin: team === "us" ? 0.0 : 0.7, xMax: team === "us" ? 0.3 : 1.0, yMin: 0.1, yMax: 0.9,
      label: `${team === "us" ? "Blue" : "Red"} ${role}`, color: team === "us" ? "rgb(46,111,224)" : "rgb(224,70,59)",
    };
    patch({ zoneRules: [...cur.zoneRules, rule] });
    setSelectedRuleId(rule.id);
  };
  // `coalesce` (set during a box drag) collapses the whole gesture into one undo step.
  const updateRule = (id: string, p: Partial<ZoneRule>, coalesce: string | null = null) =>
    patch({ zoneRules: cur.zoneRules.map((r) => (r.id === id ? { ...r, ...p } : r)) }, coalesce);
  const removeRule = (id: string) => { patch({ zoneRules: cur.zoneRules.filter((r) => r.id !== id) }); if (selectedRuleId === id) setSelectedRuleId(null); };
  // Keep the Delete-key handler pointed at the current remove fns (they close
  // over the current step, so rebind each render).
  delRef.current = { removeObj: removeSelected, removeRule };

  // ---- scenario pager ----
  const addScenario = (kind: StepKind = "instructional") => { const next = [...scenarios, blankScenario(kind)]; commit(next); setIdx(next.length - 1); setSelectedId(null); };
  const setStepKind = (kind: StepKind) => patch({ stepKind: kind });
  // Apply a saved zone-rule preset (built-in or custom) to this step's boundaries.
  const applyPreset = (presetId: string) => {
    if (!presetId) { patch({ zoneRules: [] }); return; }
    const p = allPresets.find((x) => x.id === presetId);
    if (!p) return;
    patch({ zoneRules: p.rules.map((r) => ({ ...r, id: nid("zr") })) });
  };
  const delScenario = () => {
    if (scenarios.length <= 1) { toast("A lesson needs at least one scenario"); return; }
    const next = scenarios.filter((_, i) => i !== idx);
    commit(next); setIdx(Math.max(0, idx - 1)); setSelectedId(null);
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
    commit(next); setIdx(idx + 1); setSelectedId(null);
    toast("Step copied");
  };

  // ---- save / export / import ----
  // Id rules for a save:
  //  • already-own lesson  → keep its id (update in place)
  //  • fork of a built-in  → STABLE `custom-of-<builtinId>` so it round-trips
  //  • brand-new lesson    → fresh random id
  // test-play / fresh saves of a new lesson get a new id.
  const buildLesson = useCallback((forSave = false): Lesson => {
    const id = forSave
      ? editingOwnId ?? (forkedFromBuiltin ? forkIdFor(forkedFromBuiltin) : nid("custom"))
      : nid("custom");
    const base = forkedFromBuiltin ? getLesson(forkedFromBuiltin) : undefined;
    return {
      id,
      title: title.trim() || "My Lesson",
      description: base?.description ?? "Custom lesson",
      difficulty: base?.difficulty ?? "beginner",
      category: base?.category ?? "custom",
      steps: scenarios.map((d) => draftToStep(d)),
    };
  }, [title, scenarios, editingOwnId, forkedFromBuiltin]);

  const onSave = () => {
    const lesson = buildLesson(true);
    saveCustomLesson(lesson);
    const wasUpdate = !!editingOwnId;
    setEditingOwnId(lesson.id); // subsequent saves now update this lesson in place
    toast(
      wasUpdate
        ? `Updated "${lesson.title}"`
        : forkedFromBuiltin
          ? `Saved — "${lesson.title}" now plays your version in the course`
          : `Saved "${lesson.title}" — find it under Your Lessons on the Learn page`
    );
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
        setScenarios(drafts); seedHistory(drafts); setIdx(0); setSelectedId(null);
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

  // BOUNDARIES & RULES group (shared by Scenario + Game) — apply a saved zone-rule
  // preset built on /play. Which preset is selected is inferred from the rule set.
  const rulesGroup = (
    <div className={GROUP}>
      <p className={GLABEL}>BOUNDARIES &amp; RULES</p>
      <select
        value={allPresets.find((p) => JSON.stringify(p.rules.map((r) => ({ ...r, id: undefined }))) === JSON.stringify(cur.zoneRules.map((r) => ({ ...r, id: undefined }))))?.id ?? ""}
        onChange={(e) => applyPreset(e.target.value)}
        className="w-full rounded-md border border-[rgba(20,60,35,.15)] px-2 py-1 text-xs font-bold bg-white"
      >
        <option value="">No zone rules (free positions)</option>
        {BUILTIN_PRESETS.length > 0 && (
          <optgroup label="Built-in presets">
            {BUILTIN_PRESETS.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </optgroup>
        )}
        {customPresets.length > 0 && (
          <optgroup label="Your presets">
            {customPresets.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </optgroup>
        )}
      </select>
      <p className="text-[10px] text-[#5d6f63]">
        {cur.zoneRules.length > 0 ? `${cur.zoneRules.length} rule${cur.zoneRules.length !== 1 ? "s" : ""} — shown on the field. Edit below or add your own.` : "Apply a preset above, or add your own rules below."}
      </p>

      {/* Editable rule list (same controls as the game rule editor) */}
      <div className="space-y-2">
        {cur.zoneRules.map((rule) => {
          const sel = selectedRuleId === rule.id;
          return (
            <div key={rule.id} className={clsx("rounded-lg border p-2 space-y-1.5", sel ? "border-[#FFD166] bg-[#fffaf0]" : "border-[rgba(20,60,35,.12)] bg-white")}>
              <div className="flex items-center gap-1.5">
                <button onClick={() => setSelectedRuleId(sel ? null : rule.id)} className={clsx("rounded-md px-2 py-1 text-[10px] font-extrabold cursor-pointer border", sel ? "bg-[#FFD166] border-[#FFD166]" : "bg-white border-[rgba(20,60,35,.15)] text-[#5d6f63]")}>{sel ? "Editing" : "Select"}</button>
                <div className="flex rounded-md overflow-hidden border border-[rgba(20,60,35,.15)] text-[10px] font-extrabold">
                  <button onClick={() => updateRule(rule.id, { team: "us", color: "rgb(46,111,224)" })} className={clsx("px-2 py-1 cursor-pointer", rule.team === "us" ? "bg-[#2E6FE0] text-white" : "bg-white text-[#5d6f63]")}>BLUE</button>
                  <button onClick={() => updateRule(rule.id, { team: "them", color: "rgb(224,70,59)" })} className={clsx("px-2 py-1 cursor-pointer", rule.team === "them" ? "bg-[#E0463B] text-white" : "bg-white text-[#5d6f63]")}>RED</button>
                </div>
                <select value={rule.role} onChange={(e) => updateRule(rule.id, { role: e.target.value })} className="flex-1 rounded-md border border-[rgba(20,60,35,.15)] px-1.5 py-1 text-[11px] font-bold bg-white">
                  {OBJ_ROLES.filter((r) => r !== "gk").map((r) => <option key={r} value={r}>{roleLabel(r)}</option>)}
                </select>
                <button onClick={() => removeRule(rule.id)} className="shrink-0 w-6 h-6 rounded-md bg-white border border-[rgba(20,60,35,.15)] text-[#E0463B] text-xs font-bold cursor-pointer">×</button>
              </div>
              {sel && (
                <div className="grid grid-cols-2 gap-1.5">
                  <select value={rule.when ?? "always"} onChange={(e) => { const v = e.target.value as ZoneCondition; updateRule(rule.id, { when: v === "always" ? undefined : v }); }} className="rounded-md border border-[rgba(20,60,35,.15)] px-1.5 py-1 text-[11px] font-bold bg-white">
                    <option value="always">Always applies</option>
                    <option value="attacking">When we attack</option>
                    <option value="defending">When we defend</option>
                    <option value="ball_own_half">Ball in our half</option>
                    <option value="ball_opp_half">Ball in their half</option>
                  </select>
                  <select value={rule.movement ?? "roam"} onChange={(e) => updateRule(rule.id, { movement: e.target.value as ZoneMovement })} className="rounded-md border border-[rgba(20,60,35,.15)] px-1.5 py-1 text-[11px] font-bold bg-white">
                    <option value="roam">Roam the whole box</option>
                    <option value="center">Hold the center</option>
                    <option value="free">Free (box is a limit)</option>
                  </select>
                  <select value={rule.action ?? "default"} onChange={(e) => { const v = e.target.value as ZoneAction; updateRule(rule.id, { action: v === "default" ? undefined : v }); }} className="rounded-md border border-[rgba(20,60,35,.15)] px-1.5 py-1 text-[11px] font-bold bg-white">
                    <option value="default">On ball: play normally</option>
                    <option value="cross">On ball: cross to box</option>
                    <option value="shoot">On ball: shoot on sight</option>
                    <option value="dribble">On ball: dribble</option>
                    <option value="recycle">On ball: keep it safe</option>
                  </select>
                  <select value={rule.offBall ?? "default"} onChange={(e) => { const v = e.target.value as ZoneOffBall; updateRule(rule.id, { offBall: v === "default" ? undefined : v }); }} className="rounded-md border border-[rgba(20,60,35,.15)] px-1.5 py-1 text-[11px] font-bold bg-white">
                    <option value="default">Off ball: hold shape</option>
                    <option value="hold_width">Off ball: stay wide</option>
                    <option value="drop_deep">Off ball: drop deep</option>
                  </select>
                  <button onClick={() => setPlaceMode(placeMode === `rule:${rule.id}` ? null : `rule:${rule.id}`)}
                    className={clsx("col-span-2 rounded-md px-2 py-1 text-[11px] font-extrabold cursor-pointer border", placeMode === `rule:${rule.id}` ? "bg-[#FFD166] border-[#FFD166]" : "bg-white border-[rgba(20,60,35,.15)]")}>
                    {placeMode === `rule:${rule.id}` ? "Drag the field to draw the box…" : "▭ Draw this rule's box on the field"}
                  </button>
                </div>
              )}
            </div>
          );
        })}
        <div className="flex gap-2">
          <button onClick={() => addRule("us")} className="rounded-md px-2.5 py-1 text-[11px] font-extrabold bg-[#2E6FE0] text-white cursor-pointer">+ Blue rule</button>
          <button onClick={() => addRule("them")} className="rounded-md px-2.5 py-1 text-[11px] font-extrabold bg-[#E0463B] text-white cursor-pointer">+ Red rule</button>
        </div>
      </div>
    </div>
  );

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

        {/* Editing a course lesson — your saved version becomes the active one. */}
        {forkedFromBuiltin && (
          <div className="rounded-xl bg-[#eef4ff] border border-[#9cc0f5] px-3 py-2 mb-3 text-[12px] font-semibold text-[#274b86]">
            Editing this course lesson. <b>{editingOwnId ? "Update lesson" : "Save"}</b> saves your changes and they become the version played in the course. (The original ships with the app, so you can always reset.)
          </div>
        )}

        {/* Undo / Redo (whole-lesson history). Stays clearly visible even when
            disabled (dimmed text, not near-invisible). */}
        <div className="flex items-center gap-2 mb-3">
          <button onClick={undo} disabled={!canUndo} title="Undo (Ctrl+Z)"
            className={clsx("rounded-lg px-4 py-2 text-sm font-extrabold bg-white border-2 active:translate-y-[1px] transition",
              canUndo ? "border-[#2E6FE0] text-[#2E6FE0] cursor-pointer hover:bg-[#eef4ff]" : "border-[rgba(20,60,35,.15)] text-[#9aa79f] cursor-default")}>↶ Undo</button>
          <button onClick={redo} disabled={!canRedo} title="Redo (Ctrl+Shift+Z)"
            className={clsx("rounded-lg px-4 py-2 text-sm font-extrabold bg-white border-2 active:translate-y-[1px] transition",
              canRedo ? "border-[#2E6FE0] text-[#2E6FE0] cursor-pointer hover:bg-[#eef4ff]" : "border-[rgba(20,60,35,.15)] text-[#9aa79f] cursor-default")}>↷ Redo</button>
          <span className="text-[10px] font-bold text-[#9aa79f] ml-1">Ctrl+Z / Ctrl+Shift+Z · Del removes selected</span>
        </div>

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
              <FormationPreview
                format={cur.format} userRole={cur.userRole} zoneRules={cur.zoneRules}
                placeMode={placeMode}
                restartPoint={cur.restartPoint}
                objectiveZone={cur.objType === "receiveInZone" ? cur.objZone : null}
                selectedRuleId={selectedRuleId}
                onPlaceRestart={(x, y) => { patch({ restartPoint: { x, y } }); setPlaceMode(null); toast("Restart point set"); }}
                onDrawZone={(rect) => { patch({ objZone: rect }); setPlaceMode(null); toast("Objective zone set"); }}
                onDrawRule={(id, b) => { updateRule(id, b); setPlaceMode(null); toast("Rule box drawn"); }}
                onUpdateRule={(id, b) => updateRule(id, b, `rule-drag:${id}`)}
                onSelectRule={(id) => setSelectedRuleId(id)}
                onDeleteRule={(id) => removeRule(id)}
              />
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
                  {cur.forcedRestart && (
                    <>
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-bold text-[#5d6f63]">Taken by</span>
                        <div className="flex rounded-lg overflow-hidden border border-[rgba(20,60,35,.15)] text-[10px] font-extrabold">
                          <button onClick={() => patch({ restartTeam: "us" })} className={clsx("px-3 py-1 cursor-pointer", cur.restartTeam === "us" ? "bg-[#2E6FE0] text-white" : "bg-white text-[#5d6f63]")}>BLUE (you)</button>
                          <button onClick={() => patch({ restartTeam: "them" })} className={clsx("px-3 py-1 cursor-pointer", cur.restartTeam === "them" ? "bg-[#E0463B] text-white" : "bg-white text-[#5d6f63]")}>RED</button>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button onClick={() => setPlaceMode(placeMode === "restart" ? null : "restart")}
                          className={clsx("rounded-lg px-2.5 py-1 text-[11px] font-extrabold cursor-pointer border", placeMode === "restart" ? "bg-[#FFD166] border-[#FFD166]" : cur.restartPoint ? "bg-[#2B8A4E14] border-[#2B8A4E55] text-[#1e5e36]" : "bg-white border-[rgba(20,60,35,.15)]")}>
                          {placeMode === "restart" ? "Click the field…" : cur.restartPoint ? "✓ Restart point set" : "⚽ Set restart point"}
                        </button>
                        {cur.restartPoint && <button onClick={() => patch({ restartPoint: null })} className="text-[11px] font-bold text-[#E0463B] cursor-pointer">clear</button>}
                      </div>
                      {/* Rep-based drilling: auto-reset to a fresh restart every N seconds. */}
                      <div className="flex items-center gap-2">
                        <label className="flex items-center gap-1.5 text-[11px] font-bold text-[#5d6f63] cursor-pointer">
                          <input type="checkbox" checked={cur.repSeconds > 0} onChange={(e) => patch({ repSeconds: e.target.checked ? 15 : 0 })} />
                          Repeat reps
                        </label>
                        {cur.repSeconds > 0 && (
                          <label className="text-[11px] font-bold text-[#5d6f63]">every
                            <input type="number" min={3} max={120} value={cur.repSeconds}
                              onChange={(e) => patch({ repSeconds: Math.max(3, Math.min(120, Number(e.target.value) || 15)) })}
                              className="mx-1 w-14 rounded-md border border-[rgba(20,60,35,.15)] px-2 py-1 text-xs font-bold bg-white" />
                            sec, until the target count is reached
                          </label>
                        )}
                      </div>
                    </>
                  )}
                  {/* "Get set" pause before the ball is taken — time to move into
                      position. Applies to ANY restart (not just forced ones), so
                      it lives outside the forcedRestart gate: every scenario step
                      can set its own per-step delay. */}
                  <label className="flex items-center gap-1 text-[11px] font-bold text-[#5d6f63]">
                    Get-set pause
                    <input type="number" min={0} max={30} value={cur.restartDelaySec}
                      onChange={(e) => patch({ restartDelaySec: Math.max(0, Math.min(30, Number(e.target.value) || 0)) })}
                      className="mx-1 w-14 rounded-md border border-[rgba(20,60,35,.15)] px-2 py-1 text-xs font-bold bg-white" />
                    sec before the ball is taken (move into position)
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
                          {OBJ_ROLES.map((r) => <option key={r} value={r}>{roleLabel(r)}</option>)}
                        </select>
                      </label>
                    )}
                  </div>
                  {cur.objType === "receiveInZone" && (
                    <div className="flex items-center gap-2">
                      <button onClick={() => setPlaceMode(placeMode === "zone" ? null : "zone")}
                        className={clsx("rounded-lg px-2.5 py-1 text-[11px] font-extrabold cursor-pointer border", placeMode === "zone" ? "bg-[#FFD166] border-[#FFD166]" : cur.objZone ? "bg-[#2B8A4E14] border-[#2B8A4E55] text-[#1e5e36]" : "bg-white border-[rgba(20,60,35,.15)]")}>
                        {placeMode === "zone" ? "Drag the field…" : cur.objZone ? "✓ Zone drawn" : "▭ Draw target zone"}
                      </button>
                      {cur.objZone && <button onClick={() => patch({ objZone: null })} className="text-[11px] font-bold text-[#E0463B] cursor-pointer">clear</button>}
                      {!cur.objZone && <span className="text-[10px] text-[#9aa79f]">(uses a default box if not drawn)</span>}
                    </div>
                  )}
                </div>
                {rulesGroup}
              </>
            )}

            {/* ── GAME editor ── */}
            {cur.stepKind === "game" && (
              <>
                <div className={GROUP}>
                  <p className={GLABEL}>MATCH SETUP</p>
                  <MatchSetupControls
                    value={{ format: cur.format, userRole: cur.userRole, oppTacticId: cur.oppTacticId, duration: cur.duration, aiDifficulty: cur.aiDifficulty }}
                    onChange={(p) => patch(p as Partial<DraftScenario>)}
                  />
                </div>
                {rulesGroup}
              </>
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
              <button onClick={onSave} className="rounded-xl bg-[#2B8A4E] text-white font-extrabold text-sm py-2.5 cursor-pointer col-span-2">💾 {editingOwnId ? "Update lesson" : "Save lesson"}</button>
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
