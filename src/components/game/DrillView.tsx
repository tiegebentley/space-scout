"use client";
import { useRef, useState, useCallback, useEffect } from "react";
import { TapButton } from "@/components/ui/TapButton";
import { GameCanvas } from "./GameCanvas";
import { Joystick } from "./Joystick";
import { ActionButtons } from "./ActionButtons";
import { CoachPanel } from "./CoachPanel";
import { StatePill } from "./StatePill";
import { useDrillLoop } from "@/hooks/useDrillLoop";
import { useGameStore } from "@/stores/gameStore";
import type { DrillConfig, PillState } from "@/types/game";
import type { DrillEvent } from "@/engine/DrillEngine";
import { clsx } from "clsx";

interface DrillViewProps {
  drill: DrillConfig;
  onExit: () => void;
}

export function DrillView({ drill, onExit }: DrillViewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const addXp = useGameStore((s) => s.addXp);
  const recordDrill = useGameStore((s) => s.recordDrill);
  const updateSkill = useGameStore((s) => s.updateSkill);

  const [coachMsg, setCoachMsg] = useState(drill.coaching.find(c => c.trigger === "start")?.message || "Get ready!");
  const [pill, setPill] = useState<PillState>({ text: "Ready", type: "dead" });
  const [canPass, setCanPass] = useState(false);
  const [canShoot, setCanShoot] = useState(false);
  const [started, setStarted] = useState(false);
  const [clock, setClock] = useState(formatTime(drill.timeLimit));
  const [progress, setProgress] = useState<Record<string, { current: number; target: number }>>({});
  const [result, setResult] = useState<{ stars: 1 | 2 | 3; xpEarned: number; objectives: Record<string, number> } | null>(null);
  const [controlsRight, setControlsRight] = useState(false);

  const onEvent = useCallback((ev: DrillEvent) => {
    switch (ev.type) {
      case "coach":
        setCoachMsg(ev.message);
        break;
      case "pill":
        setPill({ text: ev.text, type: ev.pillType });
        break;
      case "actionUpdate":
        setCanPass(ev.canPass);
        setCanShoot(ev.canShoot);
        break;
      case "drill:objectiveProgress":
        setProgress(prev => ({
          ...prev,
          [ev.objectiveId]: { current: ev.current, target: ev.target },
        }));
        setPill({ text: `${ev.current}/${ev.target}`, type: "att" });
        break;
      case "drill:complete":
        setResult({ stars: ev.stars, xpEarned: ev.xpEarned, objectives: ev.objectives });
        addXp(ev.xpEarned);
        recordDrill({
          drillId: drill.id,
          completedAt: new Date().toISOString(),
          score: Object.values(ev.objectives).reduce((a, b) => a + b, 0),
          stars: ev.stars,
          xpEarned: ev.xpEarned,
        });
        // Update relevant skill
        const skillMap: Record<string, keyof typeof updateSkill extends (skill: infer S, delta: number) => void ? S : never> = {
          passing: "passing",
          movement: "movement",
          defending: "defending",
          shooting: "shooting",
          positioning: "positioning",
        };
        const skillKey = skillMap[drill.category];
        if (skillKey) updateSkill(skillKey as any, ev.stars * 2);
        break;
      case "drill:zoneEnter":
        setPill({ text: `In ${ev.zoneLabel}!`, type: "att" });
        break;
    }
  }, [addXp, recordDrill, updateSkill, drill]);

  const { engine, startDrill, doPass, doShoot } = useDrillLoop({
    canvasRef,
    drill,
    onEvent,
  });

  // Clock sync
  useEffect(() => {
    const id = setInterval(() => {
      if (engine.current) {
        setClock(formatTime(engine.current.timeLeft));
      }
    }, 100);
    return () => clearInterval(id);
  }, [engine]);

  // Keyboard
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (k === "a") { e.preventDefault(); doPass(); return; }
      if (k === "s") { e.preventDefault(); doShoot(); return; }
      if (engine.current) engine.current.keys[k] = true;
      if (["arrowup", "arrowdown", "arrowleft", "arrowright"].includes(k)) e.preventDefault();
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (engine.current) engine.current.keys[e.key.toLowerCase()] = false;
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, [engine, doPass, doShoot]);

  const handleStart = useCallback(() => {
    startDrill();
    setStarted(true);
    setResult(null);
    // Initialize progress
    const initial: Record<string, { current: number; target: number }> = {};
    for (const obj of drill.objectives) {
      initial[obj.id] = { current: 0, target: obj.target };
    }
    setProgress(initial);
  }, [startDrill, drill]);

  return (
    <div className={clsx("w-full max-w-[1200px] bg-white rounded-3xl shadow-[0_18px_50px_rgba(20,60,35,.18)] overflow-hidden border border-[rgba(20,60,35,.06)]",
      "flex flex-col lg:block"
    )}>
      {/* Header */}
      <header className="flex items-center justify-between gap-3 px-4 py-2.5 bg-gradient-to-r from-[#1F6E3D] to-[#2B8A4E] text-white">
        <div className="flex items-center gap-2.5">
          <TapButton onTap={onExit} className="text-white/80 hover:text-white font-bold text-sm">
            &larr;
          </TapButton>
          <div>
            <h1 className="font-[Fredoka] font-semibold text-lg leading-tight">{drill.name}</h1>
            <p className="text-[10.5px] opacity-85 font-bold -mt-0.5 tracking-wide uppercase">
              {drill.category} drill
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 bg-white/[.13] border border-white/[.24] rounded-xl px-4 py-1.5">
          <div className="font-[Fredoka] font-medium text-[19px] bg-black/[.16] rounded-lg px-2.5 py-0.5 min-w-[58px] text-center">
            {clock}
          </div>
          {/* Objective counters */}
          {Object.entries(progress).map(([id, { current, target }]) => (
            <div key={id} className="text-center">
              <div className="font-[Fredoka] font-semibold text-lg leading-none">
                <span className={current >= target ? "text-[#43c46e]" : "text-[#FFC531]"}>{current}</span>
                <span className="text-white/50">/{target}</span>
              </div>
            </div>
          ))}
        </div>
      </header>

      {/* Stage */}
      <div className="lg:grid lg:grid-cols-[1fr_222px]">
        <div className="relative bg-[#2B8A4E] p-2 lg:p-3 flex-1 flex flex-col min-h-0">
          <GameCanvas engineRef={engine} canvasRef={canvasRef} />

          <StatePill pill={pill} />

          {/* Desktop joystick */}
          <div className="hidden lg:flex items-center gap-3.5 mt-2">
            <Joystick engineRef={engine} size={84} />
            <p className="text-[11px] font-bold text-[#5d6f63] flex-1">
              Arrow keys to move &middot; A = pass, S = shoot
            </p>
          </div>

          {/* Mobile controls — BELOW the field (joystick + pass/shoot), matching
              the Scenario screen layout. Flip sides with the handedness toggle. */}
          {started && !result && (
            <div className={clsx(
              "flex lg:hidden items-center justify-between gap-4 mt-3 px-1",
              controlsRight && "flex-row-reverse"
            )}>
              <Joystick engineRef={engine} />
              <div className="flex-1 max-w-[200px]">
                <ActionButtons canPass={canPass} canShoot={canShoot} onPass={doPass} onShoot={doShoot} layout="sidebar" />
              </div>
            </div>
          )}

          {/* Start overlay */}
          {!started && !result && (
            <div className="absolute inset-2 lg:inset-3 rounded-xl flex items-center justify-center bg-[rgba(11,40,22,.62)] backdrop-blur-sm text-center text-white p-5 z-20">
              <div className="bg-white/[.08] border border-white/[.2] rounded-2xl p-5 max-w-[370px]">
                <h2 className="font-[Fredoka] font-semibold text-[23px] mb-2">{drill.name}</h2>
                <p className="text-[13.5px] leading-relaxed opacity-95 font-semibold">{drill.description}</p>
                <div className="flex flex-col gap-1.5 text-left mt-3 text-[12.5px] font-bold">
                  {drill.objectives.map(obj => (
                    <div key={obj.id} className="flex items-center gap-2">
                      <span className="w-[15px] h-[15px] rounded-full bg-[#FFC531] flex-none grid place-items-center text-[9px] text-[#5a4400] font-extrabold">
                        {obj.target}
                      </span>
                      {obj.label}
                    </div>
                  ))}
                </div>
                <p className="text-[11px] opacity-70 mt-2">Time limit: {Math.round(drill.timeLimit / 1000)}s</p>
                <TapButton onTap={handleStart} className="btn-primary mt-3.5">
                  Start Drill
                </TapButton>
              </div>
            </div>
          )}

          {/* Result overlay */}
          {result && (
            <div className="absolute inset-2 lg:inset-3 rounded-xl flex items-center justify-center bg-[rgba(11,40,22,.62)] backdrop-blur-sm text-center text-white p-5 z-20">
              <div className="bg-white/[.08] border border-white/[.2] rounded-2xl p-5 max-w-[370px]">
                <h2 className="font-[Fredoka] font-semibold text-[23px] mb-2">Drill Complete!</h2>
                <div className="text-3xl my-2">
                  {[1, 2, 3].map(s => (
                    <span key={s} className={s <= result.stars ? "text-[#FFC531]" : "text-white/20"}>
                      &#9733;
                    </span>
                  ))}
                </div>
                <div className="flex flex-col gap-1 text-[13px] font-semibold mt-2">
                  {drill.objectives.map(obj => (
                    <div key={obj.id} className="flex justify-between">
                      <span>{obj.label}</span>
                      <span className={
                        (result.objectives[obj.id] || 0) >= obj.target ? "text-[#43c46e]" : "text-[#ffc9c4]"
                      }>
                        {result.objectives[obj.id] || 0} / {obj.target}
                      </span>
                    </div>
                  ))}
                </div>
                <p className="text-[#FFC531] font-[Fredoka] font-semibold text-lg mt-3">
                  +{result.xpEarned} XP
                </p>
                <div className="flex gap-2 mt-3">
                  <TapButton onTap={onExit} className="flex-1 font-[Fredoka] font-medium rounded-xl py-3 text-sm bg-white/10 border border-white/20 text-white cursor-pointer">
                    Back
                  </TapButton>
                  <TapButton onTap={handleStart} className="flex-1 btn-primary !mt-0">
                    Retry
                  </TapButton>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Side panel */}
        <div className="hidden lg:flex flex-col gap-2.5 bg-white border-l border-[rgba(20,60,35,.08)] p-3.5">
          <CoachPanel message={coachMsg} />
          <ActionButtons canPass={canPass} canShoot={canShoot} onPass={doPass} onShoot={doShoot} />
          <div className="bg-[#f3f7f2] rounded-xl p-3">
            <p className="text-[10.5px] font-extrabold text-[#5d6f63] tracking-wide mb-2">OBJECTIVES</p>
            {drill.objectives.map(obj => {
              const p = progress[obj.id];
              const current = p?.current || 0;
              const target = p?.target || obj.target;
              const pct = Math.min(100, (current / target) * 100);
              return (
                <div key={obj.id} className="mb-2">
                  <div className="flex justify-between text-[11px] font-bold text-[#33433a] mb-1">
                    <span>{obj.label}</span>
                    <span className={current >= target ? "text-[#2B8A4E]" : ""}>{current}/{target}</span>
                  </div>
                  <div className="w-full bg-[#e8f0e6] rounded-full h-2 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-300"
                      style={{
                        width: `${pct}%`,
                        background: current >= target
                          ? "linear-gradient(90deg, #43c46e, #2B8A4E)"
                          : "linear-gradient(90deg, #FFC531, #B07E00)",
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Mobile coach strip */}
        <div className="flex lg:hidden items-center gap-2.5 p-2 px-3 border-t border-[rgba(20,60,35,.1)] bg-white">
          <CoachPanel message={coachMsg} />
        </div>
      </div>
    </div>
  );
}

function formatTime(ms: number): string {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}
