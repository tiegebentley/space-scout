"use client";
// Play screen for a small-sided game (rondo / possession game).
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { clsx } from "clsx";
import { SmallSidedEngine } from "@/engine/ssg/SmallSidedEngine";
import { renderSsg, ssgCanvasSize, ssgToWorld } from "@/engine/ssg/render";
import { ssgSummary } from "@/engine/ssg/presets";
import type { SsgConfig, SsgDifficulty } from "@/engine/ssg/types";
import { FrameDriver } from "@/engine/frameDriver";
import { Joystick } from "@/components/game/Joystick";
import { TapButton } from "@/components/ui/TapButton";
import { loadBest, recordBest, type SsgBest } from "@/lib/ssgLocal";
import type { SsgGoal } from "@/types/lessons";

/** Goal text + current progress for a lesson step. */
export function goalLabel(g: SsgGoal, rondo: boolean): string {
  if (g.type === "finish") return "Play the game to the end";
  if (g.type === "points") return `Score ${g.target} point${g.target === 1 ? "" : "s"}`;
  if (g.type === "streak") return `Make ${g.target} passes in a row`;
  return `Win the ball back ${g.target} time${g.target === 1 ? "" : "s"}${rondo ? " in the middle" : ""}`;
}
function goalProgress(g: SsgGoal, e: SmallSidedEngine): number {
  if (g.type === "points") return e.stats.points[e.cfg.userTeam];
  if (g.type === "streak") return e.stats.best;
  if (g.type === "winBack") return e.stats.userWon;
  return 0;
}

type Hud = { streak: number; best: number; ptsA: number; ptsB: number; wins: number; clock: string; poss: "A" | "B"; youSide: "A" | "B" | "N" };
type Pill = { id: number; text: string; tone: "good" | "bad" | "info" };

function fmt(ms: number) {
  const s = Math.ceil(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

export function SsgView({ initial, editHref, goal, onGoalMet, embedded }: {
  initial: SsgConfig;
  editHref?: string;
  /** Lesson mode: a goal to reach (the Next button unlocks via onGoalMet). */
  goal?: SsgGoal;
  onGoalMet?: () => void;
  /** Inside a lesson: no "← Games" link, settings fixed by the author. */
  embedded?: boolean;
}) {
  const [cfg, setCfg] = useState<SsgConfig>(initial);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<SmallSidedEngine | null>(null);
  const driver = useRef(new FrameDriver());
  const [phase, setPhase] = useState<"setup" | "play" | "end">("setup");
  const [paused, setPaused] = useState(false);
  const [canPass, setCanPass] = useState(false);
  const [hud, setHud] = useState<Hud>({ streak: 0, best: 0, ptsA: 0, ptsB: 0, wins: 0, clock: fmt(initial.duration * 1000), poss: "A", youSide: initial.userTeam });
  const [pills, setPills] = useState<Pill[]>([]);
  const [result, setResult] = useState<{ stats: SmallSidedEngine["stats"]; newBest: boolean; prev: SsgBest | null } | null>(null);
  const pillId = useRef(0);
  const goalDone = useRef(false);
  const [goalNow, setGoalNow] = useState(0);
  const [goalMet, setGoalMet] = useState(false);
  const rondo = cfg.mode === "rondo";

  // (Re)build the engine whenever the setup changes before kick-off.
  const build = useCallback((c: SsgConfig) => {
    engineRef.current = new SmallSidedEngine(c);
    driver.current.reset();
    setHud({ streak: 0, best: 0, ptsA: 0, ptsB: 0, wins: 0, clock: fmt(c.duration * 1000), poss: "A", youSide: c.userTeam });
  }, []);
  useEffect(() => { build(cfg); }, [cfg, build]);

  const pushPill = useCallback((text: string, tone: Pill["tone"]) => {
    const id = ++pillId.current;
    setPills((p) => [...p.slice(-1), { id, text, tone }]);
    setTimeout(() => setPills((p) => p.filter((x) => x.id !== id)), 1700);
  }, []);

  const finish = useCallback(() => {
    const e = engineRef.current;
    if (!e) return;
    const yourPts = e.stats.points[cfg.userTeam];
    const prev = loadBest(cfg);
    const newBest = recordBest(cfg, { streak: e.stats.best, points: yourPts });
    setResult({ stats: { ...e.stats }, newBest, prev });
    setPhase("end");
    if (goal?.type === "finish" && !goalDone.current) { goalDone.current = true; setGoalMet(true); onGoalMet?.(); }
  }, [cfg, goal, onGoalMet]);

  // Game loop (fixed 60Hz sim + interpolated render).
  useEffect(() => {
    let raf = 0;
    let n = 0;
    const loop = (t: number) => {
      const e = engineRef.current, cv = canvasRef.current;
      const ctx = cv?.getContext("2d");
      if (e && ctx) {
        driver.current.frame(t, e, () => {
          for (const ev of e.flushEvents()) {
            if (ev.type === "pill") pushPill(ev.text, ev.tone);
            if (ev.type === "end") finish();
          }
          if (++n % 6 === 0) {
            const s = e.stats;
            const next: Hud = { streak: s.streak, best: s.best, ptsA: s.points.A, ptsB: s.points.B, wins: s.wins, clock: fmt(e.timeLeft), poss: e.poss, youSide: e.user.side };
            setHud((h) => (JSON.stringify(h) === JSON.stringify(next) ? h : next));
            setCanPass((c) => (c === e.canPass ? c : e.canPass));
            if (goal && goal.type !== "finish") {
              const g = goalProgress(goal, e);
              setGoalNow((v) => (v === g ? v : g));
              if (!goalDone.current && g >= goal.target) {
                goalDone.current = true; setGoalMet(true);
                pushPill("Goal complete! ✓", "good");
                onGoalMet?.();
              }
            }
          }
        }, () => renderSsg(ctx, e));
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [pushPill, finish]);

  // Keyboard: arrows move, A / Space pass, P pause.
  useEffect(() => {
    const down = (ev: KeyboardEvent) => {
      const e = engineRef.current;
      if (!e) return;
      const k = ev.key.toLowerCase();
      if (k.startsWith("arrow")) { e.keys[k] = true; ev.preventDefault(); }
      if ((k === "a" || k === " ") && phase === "play") { e.userPass(); ev.preventDefault(); }
      if (k === "p" && phase === "play") { e.togglePause(); setPaused(e.paused); }
    };
    const up = (ev: KeyboardEvent) => { const e = engineRef.current; if (e) e.keys[ev.key.toLowerCase()] = false; };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => { window.removeEventListener("keydown", down); window.removeEventListener("keyup", up); };
  }, [phase]);

  const start = () => {
    build(cfg);
    setResult(null);
    setPaused(false);
    setPhase("play");
    engineRef.current?.start();
  };
  const togglePause = () => { const e = engineRef.current; if (!e) return; e.togglePause(); setPaused(e.paused); };
  const set = <K extends keyof SsgConfig>(k: K, v: SsgConfig[K]) => setCfg((c) => ({ ...c, [k]: v }));

  const onCanvasDown = (ev: React.PointerEvent<HTMLCanvasElement>) => {
    const e = engineRef.current, cv = canvasRef.current;
    if (!e || !cv || phase !== "play") return;
    const r = cv.getBoundingClientRect();
    const px = ((ev.clientX - r.left) / r.width) * cv.width, py = ((ev.clientY - r.top) / r.height) * cv.height;
    const w = ssgToWorld(e, px, py);
    e.tapAt(w.x, w.y);
  };

  const size = ssgCanvasSize(cfg.boxW, cfg.boxH);
  const youTeamName = hud.youSide === "A" ? "Blues" : hud.youSide === "B" ? "Reds" : "";
  const inMiddle = rondo && hud.youSide === "B";

  return (
    <div className="relative w-full max-w-[560px] mx-auto flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between gap-2 px-3 py-2 rounded-t-3xl bg-gradient-to-r from-[#1F6E3D] to-[#2B8A4E] text-white">
        {embedded ? (
          <span className="shrink-0 rounded-[10px] bg-white/[.18] border border-white/[.3] font-[Fredoka] font-bold text-[11px] px-2.5 h-[34px] flex items-center">{rondo ? "RONDO" : "POSSESSION"}</span>
        ) : (
          <Link href="/games" className="shrink-0 rounded-[10px] bg-white/[.18] border border-white/[.3] font-[Fredoka] font-bold text-sm px-3 h-[34px] flex items-center">← Games</Link>
        )}
        <div className="min-w-0 text-center">
          <p className="font-[Fredoka] font-semibold text-[15px] leading-tight truncate">{cfg.name}</p>
          <p className="text-[10px] font-bold opacity-85 tracking-wide truncate">{ssgSummary(cfg).toUpperCase()}</p>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="font-[Fredoka] font-semibold text-lg tabular-nums">{hud.clock}</span>
          {phase === "play" && (
            <TapButton onTap={togglePause} className="w-[34px] h-[34px] rounded-[10px] bg-white/[.18] border border-white/[.3] font-bold" aria-label="Pause">
              {paused ? "▶" : "❚❚"}
            </TapButton>
          )}
        </div>
      </header>

      {/* HUD */}
      <div className="grid grid-cols-3 gap-1.5 bg-white px-2 py-2 border-x border-[rgba(20,60,35,.08)] text-center">
        <Stat label="PASSES IN A ROW" value={hud.streak} hint={`best ${hud.best}`} accent="#2E6FE0" />
        {rondo ? (
          <>
            <Stat label="POINTS" value={hud.ptsA} hint={`every ${cfg.passesForPoint} passes`} accent="#2B8A4E" />
            <Stat label="MIDDLE WON IT" value={hud.wins} hint={inMiddle ? "you're in the middle" : "times"} accent="#E0463B" />
          </>
        ) : (
          <>
            <Stat label="BLUES" value={hud.ptsA} hint={hud.poss === "A" ? "● have it" : "points"} accent="#2E6FE0" />
            <Stat label="REDS" value={hud.ptsB} hint={hud.poss === "B" ? "● have it" : "points"} accent="#E0463B" />
          </>
        )}
      </div>

      {goal && (
        <div className={clsx("flex items-center justify-between gap-2 px-3 py-1.5 text-[12px] font-extrabold border-x border-[rgba(20,60,35,.08)]",
          goalMet ? "bg-[#eafaef] text-[#1F6E3D]" : "bg-[#fff8e1] text-[#7a5a00]")}>
          <span>🎯 {goalLabel(goal, rondo)}</span>
          <span className="tabular-nums">{goalMet ? "✓ Done" : goal.type === "finish" ? "" : `${Math.min(goalNow, goal.target)}/${goal.target}`}</span>
        </div>
      )}

      {/* Field */}
      <div className="relative bg-[#226f3f] p-2">
        <canvas
          ref={canvasRef}
          width={size.w}
          height={size.h}
          onPointerDown={onCanvasDown}
          // Width-limited so the WHOLE box fits in ~62% of the screen height
          // (no letterboxing, so taps map 1:1 to the pitch).
          className="block h-auto rounded-xl touch-none mx-auto"
          style={{ aspectRatio: `${size.w} / ${size.h}`, width: `min(100%, calc(62vh * ${(size.w / size.h).toFixed(4)}))` }}
        />
        {/* Pills */}
        <div className="pointer-events-none absolute inset-x-0 top-4 flex flex-col items-center gap-1.5">
          {pills.map((p) => (
            <span key={p.id} className={clsx(
              "px-3 py-1.5 rounded-full text-[13px] font-extrabold shadow-lg animate-[fadeIn_.15s_ease-out]",
              p.tone === "good" ? "bg-[#FFC531] text-[#16241c]" : p.tone === "bad" ? "bg-[#E0463B] text-white" : "bg-white text-[#16241c]"
            )}>{p.text}</span>
          ))}
        </div>
        {phase === "play" && (
          <p className="text-center text-[11px] font-bold text-white/85 mt-1.5">
            {inMiddle ? "You're defending — press the ball and cut the passing lanes." : `You're #${engineRef.current?.user.number ?? ""} (${youTeamName}) · tap a teammate to pass · tap anywhere to call for it`}
          </p>
        )}
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between gap-4 px-3 py-3 rounded-b-3xl bg-[#226f3f]">
        <Joystick engineRef={engineRef} size={112} />
        <TapButton
          onTap={() => engineRef.current?.userPass()}
          disabled={!canPass}
          className={clsx(
            "w-[96px] h-[96px] rounded-full font-[Fredoka] font-semibold text-lg text-white select-none",
            "bg-gradient-to-b from-[#3f87ef] to-[#2E6FE0] shadow-[0_5px_0_rgba(0,0,0,.25)] active:translate-y-[2px] transition-transform",
            !canPass && "opacity-35"
          )}
        >
          Pass
        </TapButton>
      </div>
      <p className="hidden lg:block text-center text-[11px] font-bold text-[#5d6f63] mt-2">Arrow keys move · A or Space pass · P pause</p>

      {/* Setup overlay */}
      {phase === "setup" && (
        <Overlay inline={embedded}>
          <h2 className="font-[Fredoka] font-semibold text-[24px] leading-tight">{cfg.name}</h2>
          <p className="text-[12px] font-bold opacity-80 mt-0.5">{ssgSummary(cfg)}</p>
          <ul className="text-left text-[13px] font-semibold leading-snug mt-4 flex flex-col gap-1.5 opacity-95">
            {rondo ? (
              <>
                <li>• <b>Blues</b> keep the ball on the outside, <b>Reds</b> try to win it in the middle.</li>
                <li>• {cfg.passesForPoint} passes in a row = a point. A pass <b>between two defenders</b> counts double.</li>
                {cfg.swapOnTurnover && <li>• Lose it and <b>you go in the middle</b> — win it back to get out.</li>}
              </>
            ) : (
              <>
                <li>• Keep the ball as a team — {cfg.passesForPoint} passes in a row = a point.</li>
                {cfg.neutrals > 0 && <li>• <b className="text-[#C4B5FD]">Purple neutrals</b> play for whoever has the ball.</li>}
                {cfg.bumpers > 0 && <li>• <b className="text-[#FDBA74]">Orange bumpers</b> on the lines play for whoever has it — use them to escape.</li>}
                <li>• Lose it, and win it straight back!</li>
              </>
            )}
            <li>• Move with the joystick. <b>Pass</b> hits who you&apos;re facing (dashed line), or <b>tap a teammate</b>.</li>
          </ul>

          {goal && <p className="mt-4 rounded-xl bg-[#FFC531] text-[#16241c] px-3 py-2 text-[13px] font-extrabold">🎯 Goal: {goalLabel(goal, rondo)}</p>}
          {!embedded && <>
          <Choice label={rondo ? "YOU START" : "YOU PLAY FOR"} value={cfg.userTeam} onChange={(v) => set("userTeam", v as "A" | "B")}
            options={rondo ? [["A", "On the outside"], ["B", "In the middle"]] : [["A", "Blues"], ["B", "Reds"]]} />
          <Choice label={rondo && cfg.userTeam === "A" ? "DEFENDER DIFFICULTY" : "OPPONENT DIFFICULTY"} value={cfg.difficulty} onChange={(v) => set("difficulty", v as SsgDifficulty)}
            options={[["easy", "Easy"], ["medium", "Medium"], ["hard", "Hard"], ["elite", "Elite"]]} />
          <Choice label="TOUCH LIMIT" value={String(cfg.touchLimit)} onChange={(v) => set("touchLimit", Number(v) as 0 | 1 | 2)}
            options={[["0", "Free"], ["2", "2-touch"], ["1", "1-touch"]]} />
          <Choice label="GAME SPEED" value={String(cfg.speed)} onChange={(v) => set("speed", Number(v))}
            options={[["0.8", "Slow"], ["1", "Normal"], ["1.2", "Fast"]]} />
          </>}
          {embedded && (
            <Choice label="GAME SPEED" value={String(cfg.speed)} onChange={(v) => set("speed", Number(v))}
              options={[["0.8", "Slow"], ["1", "Normal"], ["1.2", "Fast"]]} />
          )}

          <TapButton onTap={start} className="btn-primary mt-6 w-full">Start</TapButton>
          {editHref && <Link href={editHref} className="block mt-3 text-[12px] font-extrabold underline opacity-85">Edit this game</Link>}
        </Overlay>
      )}

      {paused && phase === "play" && (
        <Overlay inline={embedded}>
          <h2 className="font-[Fredoka] font-semibold text-[24px]">Paused</h2>
          <p className="text-[13px] font-semibold opacity-90 mt-2">Look up before the ball arrives — where&apos;s your next pass?</p>
          <TapButton onTap={togglePause} className="btn-primary mt-5 w-full">Resume</TapButton>
          <TapButton onTap={() => { setPaused(false); setPhase("setup"); build(cfg); }} className="mt-3 w-full rounded-xl bg-white/15 font-bold text-sm py-2.5">Restart / settings</TapButton>
        </Overlay>
      )}

      {phase === "end" && result && (
        <Overlay inline={embedded}>
          <h2 className="font-[Fredoka] font-semibold text-[26px]">Time!</h2>
          {result.newBest && <p className="inline-block mt-1 px-3 py-1 rounded-full bg-[#FFC531] text-[#16241c] text-[12px] font-extrabold">New personal best!</p>}
          <p className="text-[13px] font-semibold opacity-90 mt-2">
            {rondo
              ? `${result.stats.points.A} point${result.stats.points.A === 1 ? "" : "s"} · best run ${result.stats.best} passes`
              : result.stats.points[cfg.userTeam] > result.stats.points[cfg.userTeam === "A" ? "B" : "A"]
                ? "Your team kept it better — nice work!"
                : result.stats.points.A === result.stats.points.B ? "Level on points." : "They kept it better this time."}
          </p>
          <div className="grid grid-cols-2 gap-2 mt-4 text-left">
            {!rondo && <ResultStat label="Score (points)" value={`Blues ${result.stats.points.A} – ${result.stats.points.B} Reds`} wide />}
            <ResultStat label="Best run" value={`${result.stats.best} passes`} />
            <ResultStat label="Pass completion" value={`${Math.round((100 * (result.stats.passes.A + result.stats.passes.B)) / Math.max(1, result.stats.attempts.A + result.stats.attempts.B))}%`} />
            <ResultStat label="Your passes" value={`${result.stats.userPasses}/${result.stats.userAttempts}`} />
            <ResultStat label="Split passes" value={String(result.stats.splits)} />
            <ResultStat label="You lost it" value={String(result.stats.userLost)} />
            <ResultStat label="You won it" value={String(result.stats.userWon)} />
          </div>
          {result.prev && <p className="text-[11px] font-bold opacity-75 mt-3">Previous best run: {result.prev.streak} passes</p>}
          {goal && (
            <p className={clsx("mt-3 rounded-xl px-3 py-2 text-[13px] font-extrabold", goalMet ? "bg-[#7CF29A] text-[#0b3d1d]" : "bg-white/15")}>
              {goalMet ? `🎯 Goal complete — tap Next below the game to continue.` : `🎯 Goal not reached yet: ${goalLabel(goal, rondo)}. Try again!`}
            </p>
          )}
          <TapButton onTap={start} className="btn-primary mt-5 w-full">Play again</TapButton>
          <TapButton onTap={() => { setPhase("setup"); build(cfg); }} className="mt-3 w-full rounded-xl bg-white/15 font-bold text-sm py-2.5">Change settings</TapButton>
          {embedded
            ? <TapButton onTap={() => setPhase("setup")} className="mt-3 w-full rounded-xl bg-white/15 font-bold text-sm py-2.5">Close</TapButton>
            : <Link href="/games" className="block mt-3 text-[12px] font-extrabold underline opacity-85">Back to games</Link>}
        </Overlay>
      )}
    </div>
  );
}

function Stat({ label, value, hint, accent }: { label: string; value: number; hint: string; accent: string }) {
  return (
    <div className="rounded-xl bg-[#f3f7f2] py-1.5">
      <p className="text-[9px] font-extrabold tracking-wide text-[#5d6f63]">{label}</p>
      <p className="font-[Fredoka] font-semibold text-[22px] leading-tight tabular-nums" style={{ color: accent }}>{value}</p>
      <p className="text-[9.5px] font-bold text-[#5d6f63] -mt-0.5">{hint}</p>
    </div>
  );
}

function ResultStat({ label, value, wide }: { label: string; value: string; wide?: boolean }) {
  return (
    <div className={clsx("rounded-xl bg-white/[.1] border border-white/[.15] px-3 py-2", wide && "col-span-2")}>
      <p className="text-[10px] font-extrabold tracking-wide opacity-75">{label.toUpperCase()}</p>
      <p className="font-[Fredoka] font-semibold text-[17px]">{value}</p>
    </div>
  );
}

function Choice({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: Array<[string, string]> }) {
  return (
    <div className="mt-4">
      <p className="text-[11px] font-extrabold tracking-wide opacity-80 mb-1.5 text-left">{label}</p>
      <div className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}>
        {options.map(([v, l]) => (
          <TapButton key={v} onTap={() => onChange(v)} className={clsx(
            "rounded-lg py-2 text-[12px] font-extrabold border transition-colors",
            value === v ? "bg-[#FFC531] text-[#16241c] border-[#FFC531]" : "bg-white/10 border-white/25 text-white"
          )}>{l}</TapButton>
        ))}
      </div>
    </div>
  );
}

function Overlay({ children, inline }: { children: React.ReactNode; inline?: boolean }) {
  return (
    <div className={clsx(
      "flex items-start justify-center overflow-y-auto overscroll-contain bg-[#123d24]/95 backdrop-blur-sm text-white text-center px-4",
      inline ? "absolute inset-0 z-30 rounded-3xl py-4" : "fixed inset-0 z-50 pt-[max(env(safe-area-inset-top),20px)] pb-[max(env(safe-area-inset-bottom),20px)]"
    )}>
      <div className="bg-white/[.08] border border-white/[.2] rounded-2xl p-5 sm:p-6 max-w-[420px] w-full my-auto">{children}</div>
    </div>
  );
}
