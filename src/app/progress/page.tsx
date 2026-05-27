"use client";
import Link from "next/link";
import { useGameStore, LEVEL_NAMES } from "@/stores/gameStore";

export default function ProgressPage() {
  const progress = useGameStore((s) => s.progress);
  const levelName = LEVEL_NAMES[progress.level] || "Grassroots";
  const nextLevel = LEVEL_NAMES[progress.level + 1] || "Max Level";
  const pct = progress.xpToNext > 0 ? Math.round((progress.xp / progress.xpToNext) * 100) : 100;

  const skillEntries = Object.entries(progress.skills) as [string, number][];

  return (
    <main className="flex-1 p-4 max-w-lg mx-auto w-full">
      <Link href="/" className="inline-flex items-center gap-1.5 text-sm font-bold text-[#5d6f63] mb-4 hover:text-[#1F6E3D]">
        &larr; Home
      </Link>

      <h1 className="font-[Fredoka] font-bold text-2xl text-[#16241c] mb-6">My Progress</h1>

      {/* Level card */}
      <div className="bg-gradient-to-br from-[#1F6E3D] to-[#2B8A4E] text-white rounded-2xl p-5 mb-5 shadow-lg">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-xs font-extrabold tracking-wide opacity-80">LEVEL {progress.level + 1}</p>
            <p className="font-[Fredoka] font-bold text-2xl">{levelName}</p>
          </div>
          <div className="text-right">
            <p className="text-xs font-extrabold tracking-wide opacity-80">TOTAL XP</p>
            <p className="font-[Fredoka] font-semibold text-xl">{progress.totalXp.toLocaleString()}</p>
          </div>
        </div>
        <div className="w-full bg-white/20 rounded-full h-4 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-[#FFC531] to-[#ffd84d] rounded-full transition-all duration-500"
            style={{ width: `${pct}%` }}
          />
        </div>
        <div className="flex justify-between mt-1.5 text-[10px] font-bold opacity-80">
          <span>{progress.xp} / {progress.xpToNext} XP</span>
          <span>Next: {nextLevel}</span>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        <div className="bg-white rounded-xl border border-[rgba(20,60,35,.08)] p-3 text-center">
          <p className="font-[Fredoka] font-semibold text-2xl text-[#2E6FE0]">{progress.matchesPlayed}</p>
          <p className="text-[10px] font-extrabold tracking-wide text-[#5d6f63]">MATCHES</p>
        </div>
        <div className="bg-white rounded-xl border border-[rgba(20,60,35,.08)] p-3 text-center">
          <p className="font-[Fredoka] font-semibold text-2xl text-[#2B8A4E]">{progress.drillsCompleted.length}</p>
          <p className="text-[10px] font-extrabold tracking-wide text-[#5d6f63]">DRILLS</p>
        </div>
        <div className="bg-white rounded-xl border border-[rgba(20,60,35,.08)] p-3 text-center">
          <p className="font-[Fredoka] font-semibold text-2xl text-[#B07E00]">{progress.achievements.length}</p>
          <p className="text-[10px] font-extrabold tracking-wide text-[#5d6f63]">BADGES</p>
        </div>
      </div>

      {/* Skills */}
      <div className="bg-white rounded-2xl border border-[rgba(20,60,35,.08)] p-5 mb-5">
        <h2 className="font-[Fredoka] font-semibold text-base mb-3">Skill Ratings</h2>
        <div className="flex flex-col gap-3">
          {skillEntries.map(([skill, val]) => (
            <div key={skill}>
              <div className="flex justify-between mb-1">
                <p className="text-xs font-extrabold tracking-wide text-[#5d6f63] uppercase">
                  {skill.replace(/([A-Z])/g, " $1").trim()}
                </p>
                <p className="text-xs font-extrabold text-[#16241c]">{val}</p>
              </div>
              <div className="w-full bg-[#e8f0e6] rounded-full h-2.5 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${val}%`,
                    background: val >= 70 ? "linear-gradient(90deg, #43c46e, #2B8A4E)"
                      : val >= 40 ? "linear-gradient(90deg, #3f87ef, #2E6FE0)"
                        : "linear-gradient(90deg, #FFC531, #B07E00)",
                  }}
                />
              </div>
            </div>
          ))}
        </div>
        <p className="text-[10px] font-bold text-[#5d6f63]/60 mt-3 text-center">
          Skills improve as you complete drills and play matches
        </p>
      </div>

      {/* Achievements */}
      <div className="bg-white rounded-2xl border border-[rgba(20,60,35,.08)] p-5">
        <h2 className="font-[Fredoka] font-semibold text-base mb-3">Achievements</h2>
        {progress.achievements.length === 0 ? (
          <div className="text-center py-6">
            <p className="text-3xl mb-2">&#127942;</p>
            <p className="text-sm font-semibold text-[#5d6f63]">No achievements yet</p>
            <p className="text-xs font-semibold text-[#5d6f63]/70 mt-0.5">Play matches and complete drills to earn badges</p>
          </div>
        ) : (
          <div className="grid grid-cols-4 gap-3">
            {progress.achievements.map((a) => (
              <div key={a.id} className="text-center">
                <p className="text-2xl mb-1">{a.icon}</p>
                <p className="text-[9px] font-extrabold text-[#5d6f63] leading-tight">{a.name}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
