"use client";
import { useRef, useState, useCallback, useEffect } from "react";
import Link from "next/link";
import { GameCanvas } from "./GameCanvas";
import { Joystick } from "./Joystick";
import { ActionButtons } from "./ActionButtons";
import { TapButton } from "@/components/ui/TapButton";
import { CoachPanel } from "./CoachPanel";
import { Scoreboard } from "./Scoreboard";
import { StatePill } from "./StatePill";
import { SpeedSlider } from "./SpeedSlider";
import { useGameLoop } from "@/hooks/useGameLoop";
import { useGameStore } from "@/stores/gameStore";
import type { EngineEvent } from "@/engine/GameEngine";
import type { Score, PillState } from "@/types/game";
import { SPEED_MAP } from "@/engine/constants";
import { ALL_TACTICS } from "@/engine/tactics/presets";
import { clsx } from "clsx";

export function MatchView() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const matchConfig = useGameStore((s) => s.matchConfig);
  const addXp = useGameStore((s) => s.addXp);
  const recordMatch = useGameStore((s) => s.recordMatch);

  const [score, setScore] = useState<Score>({ us: 0, them: 0 });
  const [clock, setClock] = useState("3:00");
  const [coachMsg, setCoachMsg] = useState("Find space to get the ball. Attack the top goal!");
  const [pill, setPill] = useState<PillState>({ text: "Kick off", type: "dead" });
  const [canPass, setCanPass] = useState(false);
  const [canShoot, setCanShoot] = useState(false);
  const [started, setStarted] = useState(false);
  const [paused, setPaused] = useState(false);
  const [matchOver, setMatchOver] = useState(false);
  const [finalScore, setFinalScore] = useState<Score | null>(null);
  const [speed, setSpeedVal] = useState(matchConfig.speed);
  const [controlsRight, setControlsRight] = useState(false);
  const [buildoutLines, setBuildoutLines] = useState(matchConfig.buildoutLines ?? false);
  const [activeTactic, setActiveTactic] = useState(matchConfig.tacticId || "possession");
  const [activeOppTactic, setActiveOppTactic] = useState(matchConfig.oppTacticId || "possession");
  const [zoneEditor, setZoneEditor] = useState(false);
  const wingerBounds = useGameStore((s) => s.wingerBounds);
  const setWingerBounds = useGameStore((s) => s.setWingerBounds);

  const onEvent = useCallback((ev: EngineEvent) => {
    switch (ev.type) {
      case "goal":
        setScore(ev.score);
        break;
      case "pill":
        setPill({ text: ev.text, type: ev.pillType });
        break;
      case "coach":
        setCoachMsg(ev.message);
        break;
      case "actionUpdate":
        setCanPass(ev.canPass);
        setCanShoot(ev.canShoot);
        break;
      case "matchEnd":
        setFinalScore(ev.score);
        setMatchOver(true);
        recordMatch();
        const xp = 30 + ev.score.us * 20 + (ev.score.us > ev.score.them ? 50 : 0);
        addXp(xp);
        break;
    }
  }, [addXp, recordMatch]);

  const { engine, startMatch, togglePause, setSpeed, doPass, doShoot, toggleBuildoutLines, setTactic } = useGameLoop({
    canvasRef,
    config: matchConfig,
    onEvent,
  });

  // clock sync
  useEffect(() => {
    const id = setInterval(() => {
      if (engine.current) {
        setClock(engine.current.clockDisplay);
        setScore({ us: engine.current.score.us, them: engine.current.score.them });
      }
    }, 100);
    return () => clearInterval(id);
  }, [engine]);

  // keyboard
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (k === " " || e.code === "Space") { e.preventDefault(); handlePause(); return; }
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
    startMatch();
    setStarted(true);
    setMatchOver(false);
    setFinalScore(null);
    setScore({ us: 0, them: 0 });
  }, [startMatch]);

  const handlePause = useCallback(() => {
    togglePause();
    setPaused((p) => !p);
  }, [togglePause]);

  const handleSpeedChange = useCallback((v: number) => {
    setSpeedVal(v);
    setSpeed(v);
  }, [setSpeed]);

  const handleToggleBuildout = useCallback(() => {
    toggleBuildoutLines();
    setBuildoutLines(b => !b);
  }, [toggleBuildoutLines]);

  const handleToggleZoneEditor = useCallback(() => {
    if (engine.current) {
      engine.current.showZoneEditor = !engine.current.showZoneEditor;
      setZoneEditor(z => !z);
    }
  }, [engine]);

  const handleWingerBoundsChange = useCallback((bounds: { lw: { min: number; max: number }; rw: { min: number; max: number } }) => {
    setWingerBounds(bounds);
  }, [setWingerBounds]);

  // Sync store wingerBounds into engine on start
  useEffect(() => {
    if (engine.current) {
      engine.current.wingerBounds = wingerBounds;
    }
  }, [engine, wingerBounds]);

  return (
    <div className={clsx("w-full max-w-[1200px] bg-white rounded-3xl shadow-[0_18px_50px_rgba(20,60,35,.18)] overflow-hidden border border-[rgba(20,60,35,.06)]",
      "flex flex-col lg:block",
      controlsRight && "controls-right"
    )}>
      {/* Header (top inset handled globally by `main` padding). */}
      <header className="flex items-center justify-between gap-3 px-4 py-2.5 bg-gradient-to-r from-[#1F6E3D] to-[#2B8A4E] text-white">
        <div className="flex items-center gap-2.5">
          <Link
            href="/"
            title="Return to homepage"
            className="shrink-0 flex items-center gap-1.5 rounded-[10px] bg-white/[.18] border border-white/[.3] text-white font-[Fredoka] font-bold text-sm px-3 h-[34px] hover:bg-white/[.3] transition-colors cursor-pointer"
          >
            <span className="text-base leading-none">&#8962;</span>
            Home
          </Link>
          <div>
            <h1 className="font-[Fredoka] font-semibold text-lg leading-tight">Soccer IQ Lab</h1>
            <p className="text-[10.5px] opacity-85 font-bold -mt-0.5 tracking-wide">
              {matchConfig.format.toUpperCase()} MATCH
            </p>
          </div>
        </div>
        <Scoreboard
          score={score}
          clock={clock}
          onPause={handlePause}
          onFlipControls={() => setControlsRight((p) => !p)}
          showFlip={true}
        />
      </header>

      {/* Stage */}
      <div className="lg:grid lg:grid-cols-[1fr_222px]">
        {/* Field */}
        <div className="relative bg-[#2B8A4E] p-2 lg:p-3 flex-1 flex flex-col min-h-0">
          <GameCanvas engineRef={engine} canvasRef={canvasRef} onWingerBoundsChange={handleWingerBoundsChange} />

          <StatePill pill={pill} />

          {/* Desktop joystick */}
          <div className="hidden lg:flex items-center gap-3.5 mt-2">
            <Joystick engineRef={engine} size={84} />
            <p className="text-[11px] font-bold text-[#5d6f63] flex-1">
              Use the joystick, drag your player, or arrow keys &middot; A = pass, S = shoot
            </p>
          </div>

          {/* Mobile controls — BELOW the field (joystick + pass/shoot), matching
              the Scenario screen layout. Flip sides with the handedness toggle. */}
          {started && !matchOver && (
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

          {/* Pause overlay */}
          {paused && (
            <div className="absolute inset-2 lg:inset-3 rounded-xl flex items-center justify-center bg-[rgba(11,40,22,.62)] backdrop-blur-sm text-center text-white p-5 z-20">
              <div className="bg-white/[.08] border border-white/[.2] rounded-2xl p-5 max-w-[370px]">
                <h2 className="font-[Fredoka] font-semibold text-[23px] mb-2">Paused</h2>
                <p className="text-[13.5px] leading-relaxed opacity-95 font-semibold">
                  Take a breath. Look at the shape of both teams — where is the space?
                </p>
                <TapButton onTap={handlePause} className="btn-primary mt-3.5">
                  Resume
                </TapButton>
              </div>
            </div>
          )}

          {/* Start overlay */}
          {!started && !matchOver && (
            <div className="absolute inset-2 lg:inset-3 rounded-xl flex items-center justify-center bg-[rgba(11,40,22,.62)] backdrop-blur-sm text-center text-white p-5 z-20">
              <div className="bg-white/[.08] border border-white/[.2] rounded-2xl p-6 lg:p-7 max-w-[400px] w-full max-h-full overflow-y-auto">
                <h2 className="font-[Fredoka] font-semibold text-[24px] mb-3">
                  {matchConfig.format.toUpperCase()} Match
                </h2>
                <p className="text-[13.5px] leading-relaxed opacity-95 font-semibold">
                  You always control the <b>blue player with the gold ring</b>. Attack the <b>top</b> goal.
                  When your team has the ball, find space to receive. When you <b>lose</b> it, chase and defend!
                </p>
                <div className="flex flex-col gap-2.5 text-left mt-5 text-[12.5px] font-bold">
                  <div className="flex items-center gap-2.5">
                    <span className="w-[15px] h-[15px] rounded-full bg-[#2E6FE0] shadow-[0_0_0_3px_#FFC531] flex-none" />
                    You (attack &amp; defend)
                  </div>
                  <div className="flex items-center gap-2.5">
                    <span className="w-[15px] h-[15px] rounded-full bg-[#2E6FE0] flex-none" />
                    Blues (your team)
                  </div>
                  <div className="flex items-center gap-2.5">
                    <span className="w-[15px] h-[15px] rounded-full bg-[#E0463B] flex-none" />
                    Reds (opponents)
                  </div>
                </div>
                <div className="flex items-center gap-2.5 mt-6 text-[12.5px] font-extrabold justify-center">
                  <span>Slow</span>
                  <input
                    type="range"
                    min={SPEED_MAP.min}
                    max={SPEED_MAP.max}
                    value={speed}
                    onChange={(e) => handleSpeedChange(+e.target.value)}
                    className="flex-1 max-w-[170px]"
                  />
                  <span>Fast</span>
                </div>
                <TapButton
                  onTap={handleToggleBuildout}
                  className="flex items-center justify-center gap-2 mt-5 text-[11px] font-extrabold tracking-wide cursor-pointer"
                >
                  <span className={clsx(
                    "w-7 h-4 rounded-full relative transition-colors inline-block",
                    buildoutLines ? "bg-[#FFC531]" : "bg-white/30"
                  )}>
                    <span className={clsx(
                      "absolute top-[2px] w-3 h-3 rounded-full bg-white shadow transition-transform",
                      buildoutLines ? "left-[14px]" : "left-[2px]"
                    )} />
                  </span>
                  Buildout Lines
                </TapButton>
                <TapButton onTap={handleStart} className="btn-primary mt-6 w-full">
                  Kick off
                </TapButton>
              </div>
            </div>
          )}

          {/* Match end overlay */}
          {matchOver && finalScore && (
            <div className="absolute inset-2 lg:inset-3 rounded-xl flex items-center justify-center bg-[rgba(11,40,22,.62)] backdrop-blur-sm text-center text-white p-5 z-20">
              <div className="bg-white/[.08] border border-white/[.2] rounded-2xl p-5 max-w-[370px]">
                <h2 className="font-[Fredoka] font-semibold text-[23px] mb-2">Full time</h2>
                <p className="text-[30px] my-1.5 font-[Fredoka]">
                  {finalScore.us} &ndash; {finalScore.them}
                </p>
                <p className="font-bold">
                  {finalScore.us > finalScore.them ? "You win!" : finalScore.us < finalScore.them ? "Reds win this one" : "It's a draw!"}
                </p>
                <p className="mt-2 text-sm">
                  Great match! Every time you find space and defend well, you read the game better.
                </p>
                <TapButton onTap={handleStart} className="btn-primary mt-3.5">
                  Play again
                </TapButton>
              </div>
            </div>
          )}
        </div>

        {/* Side panel (desktop) */}
        <div className="hidden lg:flex flex-col gap-2.5 bg-white border-l border-[rgba(20,60,35,.08)] p-3.5">
          <CoachPanel message={coachMsg} />
          <ActionButtons canPass={canPass} canShoot={canShoot} onPass={doPass} onShoot={doShoot} />
          <SpeedSlider value={speed} onChange={handleSpeedChange} />
          <TapButton
            onTap={handleToggleBuildout}
            className={clsx(
              "flex items-center justify-between rounded-xl px-3 py-2.5 text-[11px] font-extrabold tracking-wide cursor-pointer transition-all border",
              buildoutLines
                ? "bg-[#eafaef] border-[#2B8A4E] text-[#1F6E3D]"
                : "bg-[#f3f7f2] border-transparent text-[#5d6f63]"
            )}
          >
            <span>BUILDOUT LINES</span>
            <span className={clsx(
              "w-8 h-[18px] rounded-full relative transition-colors",
              buildoutLines ? "bg-[#2B8A4E]" : "bg-[#ccc]"
            )}>
              <span className={clsx(
                "absolute top-[2px] w-[14px] h-[14px] rounded-full bg-white shadow transition-transform",
                buildoutLines ? "left-[16px]" : "left-[2px]"
              )} />
            </span>
          </TapButton>
          <TapButton
            onTap={handleToggleZoneEditor}
            className={clsx(
              "flex items-center justify-between rounded-xl px-3 py-2.5 text-[11px] font-extrabold tracking-wide cursor-pointer transition-all border",
              zoneEditor
                ? "bg-[#e8f0ff] border-[#2E6FE0] text-[#2E6FE0]"
                : "bg-[#f3f7f2] border-transparent text-[#5d6f63]"
            )}
          >
            <span>EDIT WINGER ZONES</span>
            <span className={clsx(
              "w-8 h-[18px] rounded-full relative transition-colors",
              zoneEditor ? "bg-[#2E6FE0]" : "bg-[#ccc]"
            )}>
              <span className={clsx(
                "absolute top-[2px] w-[14px] h-[14px] rounded-full bg-white shadow transition-transform",
                zoneEditor ? "left-[16px]" : "left-[2px]"
              )} />
            </span>
          </TapButton>
          {/* Opponent tactic switcher — live during match */}
          <div className="bg-[#f3f7f2] rounded-xl p-2">
            <p className="text-[10px] font-extrabold text-[#E0463B] tracking-wide mb-1.5">🔴 OPP TACTIC</p>
            <div className="flex gap-1">
              {ALL_TACTICS.map((t) => (
                <TapButton
                  key={t.id}
                  onTap={() => { setTactic(t.id, "them"); setActiveOppTactic(t.id); }}
                  className={clsx(
                    "flex-1 rounded-lg py-1.5 text-[10px] font-extrabold cursor-pointer transition-all text-center",
                    activeOppTactic === t.id
                      ? "bg-[#E0463B] text-white shadow"
                      : "bg-white text-[#5d6f63] hover:bg-[#fef0ef]"
                  )}
                  title={t.name}
                >
                  {t.icon}
                </TapButton>
              ))}
            </div>
          </div>
          <div className="flex flex-col gap-1.5 text-[11.5px] font-bold text-[#5d6f63] mt-auto">
            <div className="flex items-center gap-2">
              <span className="w-3.5 h-3.5 rounded-full bg-[#2E6FE0] shadow-[0_0_0_3px_#FFC531] flex-none inline-block" />
              You
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3.5 h-3.5 rounded-full bg-[#2E6FE0] flex-none inline-block" />
              Blues &amp; ball
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3.5 h-3.5 rounded-full bg-[#E0463B] flex-none inline-block" />
              Reds
            </div>
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
