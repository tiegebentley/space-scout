"use client";
// One run of a live Scenario (remounted on retry by ScenarioView). Owns the game
// loop, objective tracker, HUD, controls, and success/fail UI.
import { useCallback, useEffect, useRef, useState } from "react";
import { clsx } from "clsx";
import { GameCanvas } from "@/components/game/GameCanvas";
import { Joystick } from "@/components/game/Joystick";
import { ActionButtons } from "@/components/game/ActionButtons";
import { useGameLoop } from "@/hooks/useGameLoop";
import { createObjectiveTracker, type ObjectiveState } from "@/engine/scenarioObjective";
import type { EngineEvent } from "@/engine/GameEngine";
import type { MatchConfig, ScenarioObjective } from "@/types/game";

interface Props {
  matchConfig: Partial<MatchConfig>;
  objective: ScenarioObjective;
  onComplete: () => void;
  onRetry: () => void;
}

export function ScenarioRun({ matchConfig, objective, onComplete, onRetry }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const tracker = useRef(createObjectiveTracker(objective));
  const [obj, setObj] = useState<ObjectiveState>(tracker.current.state);
  const [canPass, setCanPass] = useState(false);
  const [canShoot, setCanShoot] = useState(false);
  const [started, setStarted] = useState(false);
  const completedRef = useRef(false);

  // ── Rep-based drilling ────────────────────────────────────────────────────
  // When the scenario configures repSeconds, each rep plays that long then
  // auto-resets to a fresh configured restart, repeating until the objective's
  // target is reached. A successful rep (progress went up) resets early.
  const repSeconds = matchConfig.scenarioSetup?.repSeconds ?? 0;
  const repActive = repSeconds > 0;
  const repMsLeftRef = useRef(repSeconds * 1000);
  const progressRef = useRef(0);
  // Rep scoring. The authoritative progress for a rep-based scenario is the
  // number of reps that SCORED (received in the zone) — counted here, not from
  // the pure tracker's raw event count. repScoredRef guards one credit per rep:
  // the first receive credits the rep, then the rep keeps PLAYING for the rest of
  // repSeconds (you get your full designated play time after receiving) and any
  // further receives that rep are ignored.
  const repScoredRef = useRef(false);
  const repScoredCountRef = useRef(0);
  // Stable target for the run (e.g. 4 receives). Read from the tracker's initial
  // state so onEvent can stay a stable callback (no obj.target in its deps).
  const targetRef = useRef(tracker.current.state.target);
  const [repLeft, setRepLeft] = useState(repSeconds);
  // Engine live/dead state. The rep clock only runs while LIVE, so the dead-ball
  // "get set" pause (restartDelaySec) doesn't eat into the rep's play time.
  const liveRef = useRef(false);
  const [isLive, setIsLive] = useState(false);

  const resetRep = useCallback(() => {
    repMsLeftRef.current = repSeconds * 1000;
    setRepLeft(repSeconds);
    repScoredRef.current = false;
    engine.current?.resetRep();
  }, [repSeconds, /* engine ref is stable */]); // eslint-disable-line

  const onEvent = useCallback((ev: EngineEvent) => {
    if (ev.type === "actionUpdate") { setCanPass(ev.canPass); setCanShoot(ev.canShoot); }
    if (ev.type === "stateChange") { liveRef.current = ev.state === "live"; setIsLive(ev.state === "live"); }
    const next = tracker.current.onEvent(ev);

    // Non-rep scenarios: the pure tracker is authoritative.
    if (!repActive) {
      progressRef.current = next.progress;
      setObj(next);
      if (next.done && !completedRef.current) { completedRef.current = true; onComplete(); }
      return;
    }

    // Rep-based: progress = number of reps that SCORED. We detect the receive
    // DIRECTLY off the possession event here rather than from the pure tracker —
    // the tracker counts raw receives and freezes once it hits its own target
    // (target=4), which would stop crediting reps after a few raw receptions. The
    // first receive in a rep credits it (repScoredRef); the rep then plays on for
    // its full time and further receives are ignored. The per-rep timer (below)
    // governs the reset, so you get your designated play time after the receive.
    if (
      ev.type === "possession" && !repScoredRef.current &&
      objective.type === "receiveInZone" && ev.toRole === objective.role
    ) {
      const z = objective.zone;
      const inZone = ev.x >= z.x && ev.x <= z.x + z.w && ev.y >= z.y && ev.y <= z.y + z.h;
      if (inZone) {
        repScoredRef.current = true;
        repScoredCountRef.current += 1;
      }
    }
    const reps = repScoredCountRef.current;
    const done = reps >= targetRef.current;
    setObj((prev) => ({ ...prev, progress: reps, done }));
    if (done && !completedRef.current) { completedRef.current = true; onComplete(); }
  }, [onComplete, repActive, objective]);

  // Objective + setup must be on the config the engine reads.
  const cfgRef = useRef<Partial<MatchConfig>>({ ...matchConfig, objective });
  const { engine, startMatch, doPass, doShoot } = useGameLoop({ canvasRef, config: cfgRef.current, onEvent });

  // Time-based objective ticks + per-rep timer.
  useEffect(() => {
    const id = setInterval(() => {
      const next = tracker.current.onTick(100);
      // For rep-based scenarios the rep count (in onEvent) owns the displayed
      // progress, so don't clobber it with the tracker's raw count here. The
      // tracker tick only matters for time-based objectives (keepPossession/
      // winBack), which aren't rep-based.
      if (!repActive) {
        setObj(next);
        if (next.done && !completedRef.current) { completedRef.current = true; onComplete(); return; }
        return;
      }
      // Per-rep countdown: ticks only while the ball is LIVE (so neither the
      // dead-ball "get set" pause NOR the enter-zone wait burns the rep clock).
      // When a rep's time is up, reset to the next rep — whether or not it scored
      // (a scored rep still plays out its full repSeconds before resetting).
      if (started && liveRef.current && !completedRef.current) {
        repMsLeftRef.current -= 100;
        if (repMsLeftRef.current <= 0) resetRep();
        setRepLeft(Math.max(0, Math.ceil(repMsLeftRef.current / 1000)));
      }
    }, 100);
    return () => clearInterval(id);
  }, [onComplete, repActive, started, resetRep]);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (k === "a") { e.preventDefault(); doPass(); return; }
      if (k === "s") { e.preventDefault(); doShoot(); return; }
      if (engine.current) engine.current.keys[k] = true;
      if (["arrowup", "arrowdown", "arrowleft", "arrowright"].includes(k)) e.preventDefault();
    };
    const up = (e: KeyboardEvent) => { if (engine.current) engine.current.keys[e.key.toLowerCase()] = false; };
    window.addEventListener("keydown", down); window.addEventListener("keyup", up);
    return () => { window.removeEventListener("keydown", down); window.removeEventListener("keyup", up); };
  }, [engine, doPass, doShoot]);

  const start = useCallback(() => { startMatch(); setStarted(true); }, [startMatch]);
  const pct = obj.target > 0 ? Math.min(100, Math.round((obj.progress / obj.target) * 100)) : 0;

  return (
    <div className="w-full">
      <div className={clsx("rounded-xl border px-3 py-2 mb-3",
        obj.done ? "bg-[#2B8A4E14] border-[#2B8A4E55]" : obj.failed ? "bg-[#fff3e0] border-[#f0b657]" : "bg-white border-[rgba(20,60,35,.12)]")}>
        <div className="flex items-center justify-between">
          <p className="text-sm font-extrabold text-[#16241c]">🎯 {obj.label}</p>
          <div className="flex items-center gap-2">
            {repActive && started && !obj.done && (
              isLive
                ? <span className="text-[11px] font-extrabold text-[#5d6f63] tabular-nums">⏱ {repLeft}s</span>
                : <span className="text-[11px] font-extrabold text-[#B07E00]">
                    {matchConfig.scenarioSetup?.startTrigger === "enter-zone" ? "Move into the box…" : "Get set…"}
                  </span>
            )}
            <p className="text-sm font-extrabold text-[#2B8A4E]">{obj.progress}/{obj.target}</p>
          </div>
        </div>
        <div className="w-full bg-[#e8f0e6] rounded-full h-2 overflow-hidden mt-1">
          <div className="h-full bg-[#2B8A4E] rounded-full transition-all" style={{ width: `${pct}%` }} />
        </div>
      </div>

      {/* Field at full game size. On large screens the controls sit beside the
          pitch (like the live game); on small screens they stack underneath. */}
      <div className="lg:grid lg:grid-cols-[1fr_222px] lg:gap-3 lg:items-start">
        <div className="relative w-full">
          <GameCanvas engineRef={engine} canvasRef={canvasRef} className="w-full rounded-2xl shadow-sm" />
          {!started && !obj.done && (
            <button onClick={start} className="absolute inset-0 m-auto h-fit w-fit rounded-xl bg-[#2B8A4E] text-white font-[Fredoka] font-bold text-lg px-6 py-3 shadow-lg cursor-pointer">▶ Start</button>
          )}
        </div>

        {started && !obj.done && (
          <div className="flex items-center justify-between mt-3 lg:mt-0 lg:flex-col lg:items-stretch lg:gap-4">
            <Joystick engineRef={engine} />
            <ActionButtons canPass={canPass} canShoot={canShoot} onPass={doPass} onShoot={doShoot} layout="sidebar" />
          </div>
        )}
      </div>

      {obj.done && (
        <div className="mt-3 rounded-xl bg-[#2B8A4E14] border border-[#2B8A4E55] px-4 py-3 text-center">
          <p className="font-[Fredoka] font-bold text-lg text-[#1e5e36]">✓ Objective complete!</p>
          <p className="text-sm font-semibold text-[#33433a]">Nice work — you can continue.</p>
        </div>
      )}
      {obj.failed && !obj.done && (
        <div className="mt-3 flex items-center justify-between rounded-xl bg-[#fff3e0] border border-[#f0b657] px-4 py-3">
          <p className="text-sm font-bold text-[#8a5a00]">Not this time — try again.</p>
          <button onClick={onRetry} className="rounded-lg bg-[#2E6FE0] text-white text-xs font-extrabold px-3 py-1.5 cursor-pointer">Retry</button>
        </div>
      )}
      {started && !obj.done && (
        <button onClick={onRetry} className="mt-2 text-xs font-bold text-[#5d6f63] hover:underline cursor-pointer">↺ Restart scenario</button>
      )}
    </div>
  );
}
