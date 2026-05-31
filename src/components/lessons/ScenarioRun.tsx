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
  const [repLeft, setRepLeft] = useState(repSeconds);
  // Engine live/dead state. The rep clock only runs while LIVE, so the dead-ball
  // "get set" pause (restartDelaySec) doesn't eat into the rep's play time.
  const liveRef = useRef(false);
  const [isLive, setIsLive] = useState(false);

  const resetRep = useCallback(() => {
    repMsLeftRef.current = repSeconds * 1000;
    setRepLeft(repSeconds);
    engine.current?.resetRep();
  }, [repSeconds, /* engine ref is stable */]); // eslint-disable-line

  const onEvent = useCallback((ev: EngineEvent) => {
    if (ev.type === "actionUpdate") { setCanPass(ev.canPass); setCanShoot(ev.canShoot); }
    if (ev.type === "stateChange") { liveRef.current = ev.state === "live"; setIsLive(ev.state === "live"); }
    const next = tracker.current.onEvent(ev);
    setObj(next);
    if (next.done && !completedRef.current) { completedRef.current = true; onComplete(); return; }
    // Successful rep → progress increased but not yet done → reset to next rep.
    if (repActive && next.progress > progressRef.current && !next.done) {
      progressRef.current = next.progress;
      resetRep();
    } else {
      progressRef.current = next.progress;
    }
  }, [onComplete, repActive, resetRep]);

  // Objective + setup must be on the config the engine reads.
  const cfgRef = useRef<Partial<MatchConfig>>({ ...matchConfig, objective });
  const { engine, startMatch, doPass, doShoot } = useGameLoop({ canvasRef, config: cfgRef.current, onEvent });

  // Time-based objective ticks + per-rep timer.
  useEffect(() => {
    const id = setInterval(() => {
      const next = tracker.current.onTick(100);
      setObj(next);
      if (next.done && !completedRef.current) { completedRef.current = true; onComplete(); return; }
      // Per-rep countdown: ticks only while the ball is LIVE (so the dead-ball
      // "get set" pause doesn't burn the rep clock). When a rep's time is up
      // with no success, reset to the next rep.
      if (repActive && started && liveRef.current && !next.done) {
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
                : <span className="text-[11px] font-extrabold text-[#B07E00]">Get set…</span>
            )}
            <p className="text-sm font-extrabold text-[#2B8A4E]">{obj.progress}/{obj.target}</p>
          </div>
        </div>
        <div className="w-full bg-[#e8f0e6] rounded-full h-2 overflow-hidden mt-1">
          <div className="h-full bg-[#2B8A4E] rounded-full transition-all" style={{ width: `${pct}%` }} />
        </div>
      </div>

      <div className="relative mx-auto max-w-[440px]">
        <GameCanvas engineRef={engine} canvasRef={canvasRef} className="w-full rounded-2xl shadow-sm" />
        {!started && !obj.done && (
          <button onClick={start} className="absolute inset-0 m-auto h-fit w-fit rounded-xl bg-[#2B8A4E] text-white font-[Fredoka] font-bold text-lg px-6 py-3 shadow-lg cursor-pointer">▶ Start</button>
        )}
      </div>

      {started && !obj.done && (
        <div className="flex items-center justify-between mt-3">
          <Joystick engineRef={engine} />
          <ActionButtons canPass={canPass} canShoot={canShoot} onPass={doPass} onShoot={doShoot} layout="sidebar" />
        </div>
      )}

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
