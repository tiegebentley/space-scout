"use client";
// Drives a Lesson's ordered steps: explanation cards, graded scenarios (with the
// lab learn loop — hints, 5 tries, reveal), and a final "play" step that preloads
// a space-scout match config and routes to /play. Tracks per-scenario correctness
// for a score, shows a finish summary with a % + Retry, and records completion
// (+ best score) in the store.
import { useMemo, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { clsx } from "clsx";
import { ScenarioBoard, type ScenarioResult } from "./ScenarioBoard";
import { ScenarioView } from "./ScenarioView";
import { useGameStore } from "@/stores/gameStore";
import type { Lesson } from "@/types/lessons";

export function LessonPlayer({ lesson }: { lesson: Lesson }) {
  const router = useRouter();
  const setMatchConfig = useGameStore((s) => s.setMatchConfig);
  const recordLesson = useGameStore((s) => s.recordLesson);

  const [stepIdx, setStepIdx] = useState(0);
  const [resolved, setResolved] = useState(false); // current scenario can advance
  const [objectiveMet, setObjectiveMet] = useState(false); // live-scenario complete
  // correctness keyed by scenario id (so retrying a step doesn't double count)
  const [results, setResults] = useState<Record<string, boolean>>({});
  const [showSummary, setShowSummary] = useState(false);
  const [runId, setRunId] = useState(0); // bump to remount the board on retry

  const step = lesson.steps[stepIdx];
  const total = lesson.steps.length;
  const scenarioCount = useMemo(() => lesson.steps.filter((s) => s.kind === "scenario").length, [lesson]);

  const onResult = useCallback(
    (r: ScenarioResult) => {
      setResolved(r.solved);
      if (step.kind === "scenario") {
        setResults((prev) => ({ ...prev, [step.scenario.id]: r.correct }));
      }
    },
    [step]
  );

  const canAdvance =
    step.kind === "explain" ||
    (step.kind === "scenario" && resolved) ||
    (step.kind === "live-scenario" && objectiveMet);

  const goNext = useCallback(() => {
    if (stepIdx >= total - 1) return;
    setResolved(false);
    setObjectiveMet(false);
    setStepIdx((i) => i + 1);
  }, [stepIdx, total]);

  const goBack = useCallback(() => {
    if (stepIdx === 0) return;
    setResolved(false);
    setObjectiveMet(false);
    setStepIdx((i) => i - 1);
  }, [stepIdx]);

  const score = useMemo(() => Object.values(results).filter(Boolean).length, [results]);
  const pct = scenarioCount > 0 ? Math.round((score / scenarioCount) * 100) : 100;

  const finishToSummary = useCallback(() => {
    setShowSummary(true);
  }, []);

  const launchGame = useCallback(() => {
    if (step.kind !== "play") return;
    recordLesson(lesson.id, pct);
    setMatchConfig(step.matchConfig);
    router.push("/play");
  }, [step, lesson.id, pct, recordLesson, setMatchConfig, router]);

  const retry = useCallback(() => {
    setResults({});
    setResolved(false);
    setStepIdx(0);
    setShowSummary(false);
    setRunId((n) => n + 1);
  }, []);

  const progressPct = useMemo(() => Math.round(((stepIdx + 1) / total) * 100), [stepIdx, total]);

  // ----- Finish summary -----
  if (showSummary) {
    const low = pct < 60;
    return (
      <main className="flex-1 flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md text-center bg-white rounded-2xl shadow-lg border border-[rgba(20,60,35,.08)] p-8">
          <h1 className="font-[Fredoka] font-bold text-2xl text-[#16241c] mb-1">{lesson.title}</h1>
          <p className="text-sm font-bold text-[#5d6f63]">Lesson complete!</p>
          <div className={clsx("font-[Fredoka] font-black my-4 leading-none", low ? "text-[#E0463B] text-5xl" : "text-[#2B8A4E] text-6xl")}>
            {pct}%
          </div>
          <p className="text-sm font-bold text-[#5d6f63] mb-6">
            You got {score} of {scenarioCount} scenarios right.
          </p>
          <div className="flex flex-col gap-2">
            <Link href="/learn" className="rounded-xl bg-[#2E6FE0] text-white font-extrabold text-sm py-3">Back to lessons</Link>
            <button onClick={retry} className="rounded-xl bg-white border border-[rgba(20,60,35,.15)] text-[#33433a] font-bold text-sm py-3 cursor-pointer">
              Retry lesson
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="flex-1 flex flex-col items-center p-4">
      {/* Wider while showing a scenario so the field + side panel sit side by side */}
      <div className={clsx("w-full", step.kind === "scenario" ? "max-w-5xl" : "max-w-xl")} data-step={step.kind}>
        {/* Header + progress */}
        <div className="flex items-center justify-between mb-2">
          <Link href="/learn" className="text-xs font-extrabold text-[#5d6f63] hover:underline">← Lessons</Link>
          <div className="flex items-center gap-3">
            {scenarioCount > 0 && (
              <span className="text-xs font-extrabold text-[#2B8A4E]">Score {score}/{scenarioCount}</span>
            )}
            <span className="text-xs font-extrabold tracking-wide text-[#5d6f63]">Step {stepIdx + 1} / {total}</span>
          </div>
        </div>
        <h1 className="font-[Fredoka] font-bold text-2xl text-[#16241c] mb-1">{lesson.title}</h1>
        <div className="w-full bg-[#e8f0e6] rounded-full h-2.5 overflow-hidden mb-5">
          <div className="h-full bg-gradient-to-r from-[#3f87ef] to-[#2E6FE0] rounded-full transition-all duration-300" style={{ width: `${progressPct}%` }} />
        </div>

        {step.kind === "explain" && (
          <div className="bg-white rounded-2xl shadow-lg border border-[rgba(20,60,35,.08)] p-6 mb-5">
            <h2 className="font-[Fredoka] font-semibold text-xl text-[#2E6FE0] mb-2">{step.title}</h2>
            <p className="text-[15px] leading-relaxed font-semibold text-[#33433a]">{step.body}</p>
          </div>
        )}

        {step.kind === "scenario" && (
          <div className="bg-white rounded-2xl shadow-lg border border-[rgba(20,60,35,.08)] p-4 mb-5">
            <h2 className="font-[Fredoka] font-semibold text-lg text-[#16241c] mb-1">{step.scenario.question}</h2>
            {step.scenario.instruction && (
              <p className="text-sm font-semibold text-[#5d6f63] mb-3">{step.scenario.instruction}</p>
            )}
            <ScenarioBoard key={`${step.scenario.id}-${runId}`} scenario={step.scenario} onResult={onResult} />
          </div>
        )}

        {step.kind === "live-scenario" && (
          <div className="bg-white rounded-2xl shadow-lg border border-[rgba(20,60,35,.08)] p-4 mb-5">
            <h2 className="font-[Fredoka] font-semibold text-lg text-[#16241c] mb-1">{step.title}</h2>
            {step.body && <p className="text-sm font-semibold text-[#5d6f63] mb-3">{step.body}</p>}
            <ScenarioView
              key={`${stepIdx}-${runId}`}
              matchConfig={{ ...step.matchConfig, scenarioSetup: step.scenarioSetup }}
              objective={step.objective}
              onComplete={() => setObjectiveMet(true)}
            />
          </div>
        )}

        {step.kind === "play" && (
          <div className="bg-gradient-to-b from-[#43c46e] to-[#2B8A4E] text-white rounded-2xl shadow-lg p-6 mb-5">
            <h2 className="font-[Fredoka] font-semibold text-2xl mb-2">{step.title}</h2>
            <p className="text-[15px] leading-relaxed font-semibold opacity-95 mb-5">{step.body}</p>
            <button onClick={launchGame} className="w-full rounded-xl bg-white text-[#1F6E3D] font-[Fredoka] font-bold text-lg py-3 shadow-[0_4px_0_rgba(0,0,0,.15)] active:translate-y-[2px] transition-transform cursor-pointer">
              ▶ Start the live game
            </button>
            {scenarioCount > 0 && (
              <button onClick={finishToSummary} className="w-full mt-2 rounded-xl bg-white/15 text-white font-bold text-sm py-2.5 cursor-pointer hover:bg-white/25">
                See my score
              </button>
            )}
          </div>
        )}

        {/* Nav (not on play step) */}
        {step.kind !== "play" && (
          <div className="flex items-center gap-3">
            <button onClick={goBack} disabled={stepIdx === 0} className="rounded-xl px-4 py-2.5 text-sm font-bold bg-white border border-[rgba(20,60,35,.15)] text-[#33433a] cursor-pointer disabled:opacity-35 disabled:cursor-default">
              Back
            </button>
            <button
              onClick={goNext}
              disabled={!canAdvance}
              className="flex-1 rounded-xl px-4 py-2.5 text-sm font-extrabold text-white cursor-pointer transition-colors disabled:opacity-40 disabled:cursor-default bg-[#2E6FE0] hover:bg-[#2961c9]"
            >
              {step.kind === "scenario" && !resolved ? "Answer to continue…"
                : step.kind === "live-scenario" && !objectiveMet ? "Complete the objective…"
                : "Next"}
            </button>
          </div>
        )}
      </div>
    </main>
  );
}
