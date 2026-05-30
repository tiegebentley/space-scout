"use client";
// Drives a Lesson's ordered steps: explanation cards, graded scenarios (must
// pass to advance), and a final "play" step that preloads a space-scout match
// config and routes to /play. Marks the lesson complete in the store on finish.
import { useMemo, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { clsx } from "clsx";
import { ScenarioBoard } from "./ScenarioBoard";
import { useGameStore } from "@/stores/gameStore";
import type { Lesson } from "@/types/lessons";

export function LessonPlayer({ lesson }: { lesson: Lesson }) {
  const router = useRouter();
  const setMatchConfig = useGameStore((s) => s.setMatchConfig);
  const recordLesson = useGameStore((s) => s.recordLesson);

  const [stepIdx, setStepIdx] = useState(0);
  const [scenarioSolved, setScenarioSolved] = useState(false);

  const step = lesson.steps[stepIdx];
  const total = lesson.steps.length;
  const isLast = stepIdx === total - 1;

  // explain steps and a solved scenario can advance; play step has its own CTA.
  const canAdvance = step.kind === "explain" || (step.kind === "scenario" && scenarioSolved);

  const goNext = useCallback(() => {
    if (isLast) return;
    setScenarioSolved(false);
    setStepIdx((i) => i + 1);
  }, [isLast]);

  const goBack = useCallback(() => {
    if (stepIdx === 0) return;
    setScenarioSolved(false);
    setStepIdx((i) => i - 1);
  }, [stepIdx]);

  const launchGame = useCallback(() => {
    if (step.kind !== "play") return;
    recordLesson(lesson.id); // completing the lesson is reaching + launching the live game
    setMatchConfig(step.matchConfig);
    router.push("/play");
  }, [step, lesson.id, recordLesson, setMatchConfig, router]);

  const pct = useMemo(() => Math.round(((stepIdx + 1) / total) * 100), [stepIdx, total]);

  return (
    <main className="flex-1 flex flex-col items-center p-4">
      <div className="w-full max-w-xl">
        {/* Header + progress */}
        <div className="flex items-center justify-between mb-2">
          <Link href="/learn" className="text-xs font-extrabold text-[#5d6f63] hover:underline">← Lessons</Link>
          <p className="text-xs font-extrabold tracking-wide text-[#5d6f63]">
            Step {stepIdx + 1} / {total}
          </p>
        </div>
        <h1 className="font-[Fredoka] font-bold text-2xl text-[#16241c] mb-1">{lesson.title}</h1>
        <div className="w-full bg-[#e8f0e6] rounded-full h-2.5 overflow-hidden mb-5">
          <div className="h-full bg-gradient-to-r from-[#3f87ef] to-[#2E6FE0] rounded-full transition-all duration-300" style={{ width: `${pct}%` }} />
        </div>

        {/* Step body */}
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
            <ScenarioBoard scenario={step.scenario} onSolved={setScenarioSolved} />
          </div>
        )}

        {step.kind === "play" && (
          <div className="bg-gradient-to-b from-[#43c46e] to-[#2B8A4E] text-white rounded-2xl shadow-lg p-6 mb-5">
            <h2 className="font-[Fredoka] font-semibold text-2xl mb-2">{step.title}</h2>
            <p className="text-[15px] leading-relaxed font-semibold opacity-95 mb-5">{step.body}</p>
            <button
              onClick={launchGame}
              className="w-full rounded-xl bg-white text-[#1F6E3D] font-[Fredoka] font-bold text-lg py-3 shadow-[0_4px_0_rgba(0,0,0,.15)] active:translate-y-[2px] transition-transform cursor-pointer"
            >
              ▶ Start the live game
            </button>
          </div>
        )}

        {/* Nav */}
        {step.kind !== "play" && (
          <div className="flex items-center gap-3">
            <button
              onClick={goBack}
              disabled={stepIdx === 0}
              className="rounded-xl px-4 py-2.5 text-sm font-bold bg-white border border-[rgba(20,60,35,.15)] text-[#33433a] cursor-pointer disabled:opacity-35 disabled:cursor-default"
            >
              Back
            </button>
            <button
              onClick={goNext}
              disabled={!canAdvance}
              className={clsx(
                "flex-1 rounded-xl px-4 py-2.5 text-sm font-extrabold text-white cursor-pointer transition-colors disabled:opacity-40 disabled:cursor-default",
                "bg-[#2E6FE0] hover:bg-[#2961c9]"
              )}
            >
              {step.kind === "scenario" && !scenarioSolved ? "Solve to continue…" : "Next"}
            </button>
          </div>
        )}
      </div>
    </main>
  );
}
