"use client";
import { useState } from "react";
import { MatchView } from "@/components/game/MatchView";
import { useGameStore } from "@/stores/gameStore";
import Link from "next/link";
import { clsx } from "clsx";
import { FORMATIONS, DEFAULT_USER_ROLE, JERSEY_NUMBERS } from "@/engine/constants";
import { ALL_TACTICS } from "@/engine/tactics/presets";

const FORMATS = [
  { id: "3v3" as const, label: "3v3", desc: "Fast & tight, great for learning" },
  { id: "5v5" as const, label: "5v5", desc: "The sweet spot for tactical training" },
  { id: "7v7" as const, label: "7v7", desc: "More players, bigger decisions" },
];

const DURATIONS = [
  { ms: 120000, label: "2:00" },
  { ms: 180000, label: "3:00" },
  { ms: 300000, label: "5:00" },
];

const ROLE_LABELS: Record<string, string> = {
  hold: "Holding Mid (6)",
  lw: "Left Wing (7)",
  rw: "Right Wing (11)",
  fwd: "Forward (9)",
  lcm: "Left CM (8)",
  rcm: "Right CM (10)",
};

export default function PlayPage() {
  const [selecting, setSelecting] = useState(true);
  const setMatchConfig = useGameStore((s) => s.setMatchConfig);
  const matchConfig = useGameStore((s) => s.matchConfig);

  const currentFormat = matchConfig.format;
  const formation = FORMATIONS[currentFormat] || FORMATIONS["5v5"];
  const roleKeys = Object.keys(formation);
  const selectedRole = matchConfig.userRole || DEFAULT_USER_ROLE[currentFormat] || roleKeys[0];

  if (!selecting) {
    return (
      <main className="flex-1 flex items-center justify-center p-2 lg:p-4">
        <MatchView />
      </main>
    );
  }

  return (
    <main className="flex-1 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Link href="/" className="inline-flex items-center gap-1.5 text-sm font-bold text-[#5d6f63] mb-6 hover:text-[#1F6E3D]">
          &larr; Home
        </Link>

        <h1 className="font-[Fredoka] font-bold text-2xl text-[#16241c] mb-6">Choose your match</h1>

        {/* Format */}
        <div className="mb-5">
          <p className="text-xs font-extrabold tracking-wide text-[#5d6f63] mb-2.5">FORMAT</p>
          <div className="flex gap-2.5">
            {FORMATS.map((f) => (
              <button
                key={f.id}
                onClick={() => {
                  setMatchConfig({ format: f.id, userRole: DEFAULT_USER_ROLE[f.id] });
                }}
                className={clsx(
                  "flex-1 rounded-xl p-3.5 border-2 text-center cursor-pointer transition-all",
                  matchConfig.format === f.id
                    ? "border-[#2B8A4E] bg-[#eafaef] shadow-md"
                    : "border-[rgba(20,60,35,.1)] bg-white hover:border-[#2B8A4E]/40"
                )}
              >
                <p className="font-[Fredoka] font-semibold text-xl">{f.label}</p>
                <p className="text-[10px] font-bold text-[#5d6f63] mt-0.5">{f.desc}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Position */}
        <div className="mb-5">
          <p className="text-xs font-extrabold tracking-wide text-[#5d6f63] mb-2.5">YOUR POSITION</p>
          <div className="flex flex-wrap gap-2">
            {roleKeys.map((k) => (
              <button
                key={k}
                onClick={() => setMatchConfig({ userRole: k })}
                className={clsx(
                  "rounded-xl py-2.5 px-4 border-2 font-[Fredoka] font-semibold text-sm cursor-pointer transition-all",
                  selectedRole === k
                    ? "border-[#2E6FE0] bg-[#e8f0ff] shadow-md text-[#2E6FE0]"
                    : "border-[rgba(20,60,35,.1)] bg-white hover:border-[#2E6FE0]/40 text-[#33433a]"
                )}
              >
                <span className="font-extrabold text-xs mr-1.5 opacity-60">#{JERSEY_NUMBERS[k]}</span>
                {ROLE_LABELS[k] || k}
              </button>
            ))}
          </div>
        </div>

        {/* Opponent Tactic */}
        <div className="mb-5">
          <p className="text-xs font-extrabold tracking-wide text-[#E0463B] mb-2.5">🔴 OPPONENT TACTIC</p>
          <div className="flex flex-col gap-2">
            {ALL_TACTICS.map((t) => (
              <button
                key={t.id}
                onClick={() => setMatchConfig({ oppTacticId: t.id })}
                className={clsx(
                  "rounded-xl p-3 border-2 text-left cursor-pointer transition-all",
                  (matchConfig.oppTacticId || "possession") === t.id
                    ? "border-[#E0463B] bg-[#fef0ef] shadow-md"
                    : "border-[rgba(20,60,35,.1)] bg-white hover:border-[#E0463B]/40"
                )}
              >
                <div className="flex items-center gap-2">
                  <span className="text-lg">{t.icon}</span>
                  <span className="font-[Fredoka] font-semibold text-sm">{t.name}</span>
                </div>
                <p className="text-[10px] font-semibold text-[#5d6f63] mt-0.5 leading-snug">{t.description}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Duration */}
        <div className="mb-5">
          <p className="text-xs font-extrabold tracking-wide text-[#5d6f63] mb-2.5">MATCH LENGTH</p>
          <div className="flex gap-2.5">
            {DURATIONS.map((d) => (
              <button
                key={d.ms}
                onClick={() => setMatchConfig({ duration: d.ms })}
                className={clsx(
                  "flex-1 rounded-xl py-3 border-2 font-[Fredoka] font-semibold text-lg cursor-pointer transition-all",
                  matchConfig.duration === d.ms
                    ? "border-[#2B8A4E] bg-[#eafaef] shadow-md"
                    : "border-[rgba(20,60,35,.1)] bg-white hover:border-[#2B8A4E]/40"
                )}
              >
                {d.label}
              </button>
            ))}
          </div>
        </div>

        {/* Difficulty */}
        <div className="mb-6">
          <p className="text-xs font-extrabold tracking-wide text-[#5d6f63] mb-2.5">AI DIFFICULTY</p>
          <div className="flex gap-2.5">
            {(["easy", "medium", "hard"] as const).map((d) => (
              <button
                key={d}
                onClick={() => setMatchConfig({ aiDifficulty: d })}
                className={clsx(
                  "flex-1 rounded-xl py-3 border-2 font-[Fredoka] font-semibold text-base capitalize cursor-pointer transition-all",
                  matchConfig.aiDifficulty === d
                    ? "border-[#2B8A4E] bg-[#eafaef] shadow-md"
                    : "border-[rgba(20,60,35,.1)] bg-white hover:border-[#2B8A4E]/40"
                )}
              >
                {d}
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={() => setSelecting(false)}
          className="btn-primary w-full text-center"
        >
          Start Match
        </button>
      </div>
    </main>
  );
}
