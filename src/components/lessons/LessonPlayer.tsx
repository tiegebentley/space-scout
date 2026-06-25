"use client";
// Drives a Lesson's ordered steps: explanation cards, graded scenarios (with the
// lab learn loop — hints, 5 tries, reveal), and a final "play" step that preloads
// a space-scout match config and routes to /play. Tracks per-scenario correctness
// for a score, shows a finish summary with a % + Retry, and records completion
// (+ best score) in the store.
import { useMemo, useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { TapButton } from "@/components/ui/TapButton";
import { clsx } from "clsx";
import { ScenarioBoard, type ScenarioResult } from "./ScenarioBoard";
import { ScenarioView } from "./ScenarioView";
import { useGameStore } from "@/stores/gameStore";
import type { Lesson } from "@/types/lessons";

export function LessonPlayer({ lesson }: { lesson: Lesson }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const setMatchConfig = useGameStore((s) => s.setMatchConfig);
  const recordLesson = useGameStore((s) => s.recordLesson);
  // When the game routes back here (?feedback=1), open straight into the
  // feedback summary. The score is read from the matchConfig.lessonReturn that
  // the play step stashed (this fresh mount has no in-memory results).
  const returningForFeedback = searchParams.get("feedback") === "1";
  const lessonReturn = useGameStore.getState().matchConfig?.lessonReturn;

  const [stepIdx, setStepIdx] = useState(0);
  const [resolved, setResolved] = useState(false); // current scenario can advance
  const [objectiveMet, setObjectiveMet] = useState(false); // live-scenario complete
  // correctness keyed by scenario id (so retrying a step doesn't double count)
  const [results, setResults] = useState<Record<string, boolean>>({});
  const [showSummary, setShowSummary] = useState(returningForFeedback);
  const [runId, setRunId] = useState(0); // bump to remount the board on retry

  // Post-lesson feedback (rating + optional comment, emailed to the coach)
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [fbState, setFbState] = useState<"idle" | "sending" | "sent" | "error">("idle");

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

  const isLastStep = stepIdx >= total - 1;

  const goNext = useCallback(() => {
    if (stepIdx >= total - 1) return;
    setResolved(false);
    setObjectiveMet(false);
    setStepIdx((i) => i + 1);
  }, [stepIdx, total]);

  const goBack = useCallback(() => {
    // On the first step, "Back" exits the lesson (was a dead/greyed button).
    if (stepIdx === 0) { router.push("/learn"); return; }
    setResolved(false);
    setObjectiveMet(false);
    setStepIdx((i) => i - 1);
  }, [stepIdx, router]);

  // When returning from the game for feedback, the in-memory results are gone —
  // use the score the play step stashed in lessonReturn.
  const liveScore = useMemo(() => Object.values(results).filter(Boolean).length, [results]);
  const score = returningForFeedback && lessonReturn ? lessonReturn.score : liveScore;
  const pct =
    returningForFeedback && lessonReturn
      ? lessonReturn.pct
      : scenarioCount > 0
        ? Math.round((liveScore / scenarioCount) * 100)
        : 100;

  // Finishing a lesson WITHOUT a final play step used to dead-end: "Next" on
  // the last step was a no-op and completion was never recorded. Now the last
  // step's button becomes "Complete Lesson" → records the lesson and shows the
  // summary (which links back to the lessons list).
  const finishLesson = useCallback(() => {
    recordLesson(lesson.id, pct);
    setShowSummary(true);
  }, [lesson.id, pct, recordLesson]);

  const launchGame = useCallback(() => {
    if (step.kind !== "play") return;
    // Launch straight into the configured game (skip the /play setup screen).
    // Carry lesson context so the game's "Full time" screen can route back here
    // to the feedback summary — every completed lesson should be ratable.
    recordLesson(lesson.id, pct);
    setMatchConfig({
      ...step.matchConfig,
      fromLesson: true,
      lessonReturn: { id: lesson.id, title: lesson.title, score, total: scenarioCount, pct },
    });
    router.push("/play");
  }, [step, lesson.id, pct, recordLesson, setMatchConfig, router]);

  const retry = useCallback(() => {
    setResults({});
    setResolved(false);
    setStepIdx(0);
    setShowSummary(false);
    setRunId((n) => n + 1);
    setRating(0);
    setComment("");
    setFbState("idle");
  }, []);

  const progressPct = useMemo(() => Math.round(((stepIdx + 1) / total) * 100), [stepIdx, total]);

  const submitFeedback = useCallback(async () => {
    if (rating < 1 || fbState === "sending") return;
    setFbState("sending");
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lessonId: lesson.id,
          lessonTitle: lesson.title,
          score,
          total: scenarioCount,
          pct,
          rating,
          comment: comment.trim(),
        }),
      });
      setFbState(res.ok ? "sent" : "error");
    } catch {
      setFbState("error");
    }
  }, [rating, fbState, lesson.id, lesson.title, score, scenarioCount, pct, comment]);

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

          {/* Rating + feedback (emailed to the coach) */}
          <FeedbackBlock
            rating={rating}
            setRating={setRating}
            comment={comment}
            setComment={setComment}
            fbState={fbState}
            onSubmit={submitFeedback}
          />

          <div className="flex flex-col gap-2">
            <Link href="/learn" className="rounded-xl bg-[#2E6FE0] text-white font-extrabold text-sm py-3">Back to lessons</Link>
            <TapButton onTap={retry} className="rounded-xl bg-white border border-[rgba(20,60,35,.15)] text-[#33433a] font-bold text-sm py-3 cursor-pointer">
              Retry lesson
            </TapButton>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="flex-1 flex flex-col items-center p-4">
      {/* Wider while showing a scenario so the field + side panel sit side by side */}
      <div className={clsx("w-full", step.kind === "scenario" || step.kind === "live-scenario" ? "max-w-5xl" : "max-w-xl")} data-step={step.kind}>
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
            <TapButton onTap={launchGame} className="w-full rounded-xl bg-white text-[#1F6E3D] font-[Fredoka] font-bold text-lg py-3 shadow-[0_4px_0_rgba(0,0,0,.15)] active:translate-y-[2px] transition-transform cursor-pointer">
              ▶ Start the live game
            </TapButton>
            {scenarioCount > 0 && (
              <TapButton onTap={finishLesson} className="w-full mt-2 rounded-xl bg-white/15 text-white font-bold text-sm py-2.5 cursor-pointer hover:bg-white/25">
                See my score
              </TapButton>
            )}
            {/* Rate the lesson right here — no need to play the game first. */}
            <div className="mt-4 rounded-xl bg-white p-4">
              <FeedbackBlock
                rating={rating}
                setRating={setRating}
                comment={comment}
                setComment={setComment}
                fbState={fbState}
                onSubmit={submitFeedback}
              />
            </div>
          </div>
        )}

        {/* Nav (not on play step) */}
        {step.kind !== "play" && (
          <div className="flex items-center gap-3">
            <TapButton onTap={goBack} className="rounded-xl px-4 py-2.5 text-sm font-bold bg-white border border-[rgba(20,60,35,.15)] text-[#33433a] cursor-pointer">
              {stepIdx === 0 ? "Exit" : "Back"}
            </TapButton>
            <TapButton
              onTap={isLastStep ? finishLesson : goNext}
              disabled={!canAdvance}
              className={clsx(
                "flex-1 rounded-xl px-4 py-2.5 text-sm font-extrabold text-white cursor-pointer transition-colors disabled:opacity-40 disabled:cursor-default",
                isLastStep && canAdvance ? "bg-[#2B8A4E] hover:bg-[#247a43]" : "bg-[#2E6FE0] hover:bg-[#2961c9]"
              )}
            >
              {step.kind === "scenario" && !resolved ? "Answer to continue…"
                : step.kind === "live-scenario" && !objectiveMet ? "Complete the objective…"
                : isLastStep ? "Complete Lesson ✓" : "Next"}
            </TapButton>
          </div>
        )}
      </div>
    </main>
  );
}

// Star rating + optional comment, emailed to the coach. Shared by the finish
// summary and the final "play" step (so a lesson is ratable before/without
// playing the game). Once sent, it collapses to a thank-you.
function FeedbackBlock({
  rating,
  setRating,
  comment,
  setComment,
  fbState,
  onSubmit,
}: {
  rating: number;
  setRating: (n: number) => void;
  comment: string;
  setComment: (s: string) => void;
  fbState: "idle" | "sending" | "sent" | "error";
  onSubmit: () => void;
}) {
  if (fbState === "sent") {
    return (
      <div className="rounded-xl bg-[#eaf6ee] border border-[#bfe3cb] p-4 text-sm font-bold text-[#2B8A4E] text-center">
        Thanks for the feedback! 🙌
      </div>
    );
  }
  return (
    <div className="text-left">
      <p className="text-sm font-extrabold text-[#16241c] mb-2 text-center">How was this lesson?</p>
      <div className="flex items-center justify-center gap-1.5 mb-3">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => setRating(n)}
            aria-label={`${n} star${n > 1 ? "s" : ""}`}
            className={clsx(
              "text-3xl leading-none transition-transform active:scale-90 cursor-pointer",
              n <= rating ? "text-[#E0A500]" : "text-[#d6ded8] hover:text-[#f0cf66]"
            )}
          >
            ★
          </button>
        ))}
      </div>
      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder="Anything you'd tell your coach? (optional)"
        rows={3}
        maxLength={1000}
        className="w-full rounded-xl border border-[rgba(20,60,35,.15)] p-3 text-sm font-semibold text-[#33433a] placeholder:text-[#9aa79f] focus:outline-none focus:border-[#2E6FE0] resize-none"
      />
      {fbState === "error" && (
        <p className="text-xs font-bold text-[#E0463B] mt-1.5">Couldn’t send — please try again.</p>
      )}
      <TapButton
        onTap={onSubmit}
        disabled={rating < 1 || fbState === "sending"}
        className="w-full mt-2 rounded-xl bg-[#2B8A4E] text-white font-extrabold text-sm py-2.5 cursor-pointer transition-colors hover:bg-[#247a43] disabled:opacity-40 disabled:cursor-default"
      >
        {fbState === "sending" ? "Sending…" : "Send feedback"}
      </TapButton>
    </div>
  );
}
