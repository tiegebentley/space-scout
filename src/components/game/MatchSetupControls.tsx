"use client";
// Reusable match-setup controls (Format / Your Position / Opponent Tactic /
// Match Length / AI Difficulty) — the same settings as the free-play setup,
// shared by /play and the lesson author's Scenario/Game steps. Driven by a
// MatchConfig value + an onChange(patch) callback (no store coupling).
import { clsx } from "clsx";
import { FORMATIONS, DEFAULT_USER_ROLE, JERSEY_NUMBERS } from "@/engine/constants";
import { ALL_TACTICS } from "@/engine/tactics/presets";
import type { MatchConfig } from "@/types/game";

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
  hold: "Holding Mid (6)", lw: "Left Wing (7)", rw: "Right Wing (11)",
  fwd: "Forward (9)", lcm: "Left CM (8)", rcm: "Right CM (10)",
};

interface Props {
  value: Partial<MatchConfig>;
  onChange: (patch: Partial<MatchConfig>) => void;
}

export function MatchSetupControls({ value, onChange }: Props) {
  const format = value.format || "5v5";
  const roleKeys = Object.keys(FORMATIONS[format] || FORMATIONS["5v5"]);
  const selectedRole = value.userRole || DEFAULT_USER_ROLE[format];

  return (
    <div className="space-y-5">
      {/* Format */}
      <div>
        <p className="text-xs font-extrabold tracking-wide text-[#5d6f63] mb-2.5">FORMAT</p>
        <div className="flex gap-2.5">
          {FORMATS.map((f) => (
            <button key={f.id} onClick={() => onChange({ format: f.id, userRole: DEFAULT_USER_ROLE[f.id] })}
              className={clsx("flex-1 rounded-xl p-3.5 border-2 text-center cursor-pointer transition-all",
                format === f.id ? "border-[#2B8A4E] bg-[#eafaef] shadow-md" : "border-[rgba(20,60,35,.1)] bg-white hover:border-[#2B8A4E]/40")}>
              <p className="font-[Fredoka] font-semibold text-xl">{f.label}</p>
              <p className="text-[10px] font-bold text-[#5d6f63] mt-0.5">{f.desc}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Position */}
      <div>
        <p className="text-xs font-extrabold tracking-wide text-[#5d6f63] mb-2.5">YOUR POSITION</p>
        <div className="flex flex-wrap gap-2">
          {roleKeys.map((k) => (
            <button key={k} onClick={() => onChange({ userRole: k })}
              className={clsx("rounded-xl py-2.5 px-4 border-2 font-[Fredoka] font-semibold text-sm cursor-pointer transition-all",
                selectedRole === k ? "border-[#2E6FE0] bg-[#e8f0ff] shadow-md text-[#2E6FE0]" : "border-[rgba(20,60,35,.1)] bg-white hover:border-[#2E6FE0]/40 text-[#33433a]")}>
              <span className="font-extrabold text-xs mr-1.5 opacity-60">#{JERSEY_NUMBERS[k]}</span>
              {ROLE_LABELS[k] || k}
            </button>
          ))}
        </div>
      </div>

      {/* Opponent tactic */}
      <div>
        <p className="text-xs font-extrabold tracking-wide text-[#E0463B] mb-2.5">🔴 OPPONENT TACTIC</p>
        <div className="flex flex-col gap-2">
          {ALL_TACTICS.map((t) => (
            <button key={t.id} onClick={() => onChange({ oppTacticId: t.id })}
              className={clsx("rounded-xl p-3 border-2 text-left cursor-pointer transition-all",
                (value.oppTacticId || "possession") === t.id ? "border-[#E0463B] bg-[#fef0ef] shadow-md" : "border-[rgba(20,60,35,.1)] bg-white hover:border-[#E0463B]/40")}>
              <div className="flex items-center gap-2">
                <span className="text-lg">{t.icon}</span>
                <span className="font-[Fredoka] font-semibold text-sm">{t.name}</span>
              </div>
              <p className="text-[10px] font-semibold text-[#5d6f63] mt-0.5 leading-snug">{t.description}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Match length */}
      <div>
        <p className="text-xs font-extrabold tracking-wide text-[#5d6f63] mb-2.5">MATCH LENGTH</p>
        <div className="flex gap-2.5">
          {DURATIONS.map((d) => (
            <button key={d.ms} onClick={() => onChange({ duration: d.ms })}
              className={clsx("flex-1 rounded-xl py-3 border-2 font-[Fredoka] font-semibold text-lg cursor-pointer transition-all",
                (value.duration ?? 180000) === d.ms ? "border-[#2B8A4E] bg-[#eafaef] shadow-md" : "border-[rgba(20,60,35,.1)] bg-white hover:border-[#2B8A4E]/40")}>
              {d.label}
            </button>
          ))}
        </div>
      </div>

      {/* AI difficulty */}
      <div>
        <p className="text-xs font-extrabold tracking-wide text-[#5d6f63] mb-2.5">AI DIFFICULTY</p>
        <div className="flex gap-2.5">
          {(["easy", "medium", "hard"] as const).map((d) => (
            <button key={d} onClick={() => onChange({ aiDifficulty: d })}
              className={clsx("flex-1 rounded-xl py-3 border-2 font-[Fredoka] font-semibold text-base capitalize cursor-pointer transition-all",
                (value.aiDifficulty || "medium") === d ? "border-[#2B8A4E] bg-[#eafaef] shadow-md" : "border-[rgba(20,60,35,.1)] bg-white hover:border-[#2B8A4E]/40")}>
              {d}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
