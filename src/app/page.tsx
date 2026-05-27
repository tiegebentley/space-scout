"use client";
import Link from "next/link";
import { useGameStore, LEVEL_NAMES } from "@/stores/gameStore";

export default function HomePage() {
  const progress = useGameStore((s) => s.progress);
  const levelName = LEVEL_NAMES[progress.level] || "Grassroots";
  const pct = progress.xpToNext > 0 ? Math.round((progress.xp / progress.xpToNext) * 100) : 0;

  return (
    <main className="flex-1 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-b from-[#43c46e] to-[#1F6E3D] text-4xl shadow-lg mb-4">
            &#9917;
          </div>
          <h1 className="font-[Fredoka] font-bold text-3xl text-[#16241c]">Space Scout</h1>
          <p className="text-sm font-bold text-[#5d6f63] mt-1">Train your soccer brain</p>
        </div>

        {/* Player card */}
        <div className="bg-white rounded-2xl shadow-lg border border-[rgba(20,60,35,.08)] p-5 mb-5">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-xs font-extrabold tracking-wide text-[#5d6f63]">LEVEL {progress.level + 1}</p>
              <p className="font-[Fredoka] font-semibold text-lg text-[#1F6E3D]">{levelName}</p>
            </div>
            <div className="text-right">
              <p className="text-xs font-extrabold tracking-wide text-[#5d6f63]">MATCHES</p>
              <p className="font-[Fredoka] font-semibold text-lg">{progress.matchesPlayed}</p>
            </div>
          </div>
          <div className="w-full bg-[#e8f0e6] rounded-full h-3 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-[#43c46e] to-[#2B8A4E] rounded-full transition-all duration-500"
              style={{ width: `${pct}%` }}
            />
          </div>
          <p className="text-[10px] font-bold text-[#5d6f63] mt-1 text-right">
            {progress.xp} / {progress.xpToNext} XP
          </p>

          {/* Skill bars */}
          <div className="grid grid-cols-3 gap-2 mt-4">
            {(Object.entries(progress.skills) as [string, number][]).map(([skill, val]) => (
              <div key={skill} className="text-center">
                <div className="w-full bg-[#e8f0e6] rounded-full h-1.5 overflow-hidden mb-1">
                  <div
                    className="h-full bg-[#2E6FE0] rounded-full"
                    style={{ width: `${val}%` }}
                  />
                </div>
                <p className="text-[9px] font-extrabold tracking-wide text-[#5d6f63] uppercase">
                  {skill.replace(/([A-Z])/g, " $1").trim()}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Game modes */}
        <div className="flex flex-col gap-3">
          <Link href="/play" className="block">
            <div className="bg-gradient-to-b from-[#43c46e] to-[#2B8A4E] text-white rounded-2xl p-5 shadow-[0_5px_0_#14502d,0_8px_16px_rgba(0,0,0,.2)] active:translate-y-[3px] active:shadow-[0_2px_0_#14502d] transition-transform cursor-pointer">
              <h2 className="font-[Fredoka] font-semibold text-xl">Play Match</h2>
              <p className="text-sm font-semibold opacity-90 mt-0.5">Jump into a 5v5, 3v3, or 7v7</p>
            </div>
          </Link>

          <Link href="/drills" className="block">
            <div className="bg-white text-[#16241c] rounded-2xl p-5 shadow-lg border border-[rgba(20,60,35,.1)] active:translate-y-[2px] transition-transform cursor-pointer">
              <h2 className="font-[Fredoka] font-semibold text-xl text-[#2E6FE0]">Tactical Drills</h2>
              <p className="text-sm font-semibold text-[#5d6f63] mt-0.5">Passing, movement, defending &amp; more</p>
            </div>
          </Link>

          <Link href="/progress" className="block">
            <div className="bg-white text-[#16241c] rounded-2xl p-5 shadow-lg border border-[rgba(20,60,35,.1)] active:translate-y-[2px] transition-transform cursor-pointer">
              <h2 className="font-[Fredoka] font-semibold text-xl text-[#B07E00]">My Progress</h2>
              <p className="text-sm font-semibold text-[#5d6f63] mt-0.5">Stats, achievements &amp; skill ratings</p>
            </div>
          </Link>
        </div>

        <p className="text-center text-[10px] font-bold text-[#5d6f63]/60 mt-6">
          Space Scout v0.1 &middot; Built for youth players
        </p>
      </div>
    </main>
  );
}
