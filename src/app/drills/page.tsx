"use client";
import { useState } from "react";
import Link from "next/link";
import { clsx } from "clsx";
import { DrillView } from "@/components/game/DrillView";
import { getDrill, DRILLS } from "@/engine/drills";
import { useGameStore } from "@/stores/gameStore";
import type { DrillConfig } from "@/types/game";

const DRILL_CATEGORIES = [
  {
    id: "passing",
    name: "Passing & Receiving",
    icon: "&#127942;",
    color: "from-[#3f87ef] to-[#2E6FE0]",
    drills: [
      { id: "find-the-pass", name: "Find the Pass", difficulty: 1, desc: "Play accurate passes to open teammates" },
      { id: "one-touch", name: "One Touch Play", difficulty: 2, desc: "Receive and release quickly" },
      { id: "switch-the-play", name: "Switch the Play", difficulty: 3, desc: "Move the ball side to side to find space" },
    ],
  },
  {
    id: "movement",
    name: "Movement Off the Ball",
    icon: "&#127939;",
    color: "from-[#43c46e] to-[#2B8A4E]",
    drills: [
      { id: "find-space", name: "Find Space", difficulty: 1, desc: "Move into open areas away from defenders" },
      { id: "through-ball-run", name: "Through Ball Run", difficulty: 2, desc: "Time your run to receive behind the defense" },
      { id: "overlap-run", name: "Overlap Run", difficulty: 3, desc: "Make overlapping runs on the wing" },
    ],
  },
  {
    id: "defending",
    name: "Defending",
    icon: "&#128737;",
    color: "from-[#ff6b5e] to-[#E0463B]",
    drills: [
      { id: "press-the-ball", name: "Press the Ball", difficulty: 1, desc: "Close down the ball carrier" },
      { id: "cut-passing-lanes", name: "Cut Passing Lanes", difficulty: 2, desc: "Position yourself to block passes" },
      { id: "recovery-run", name: "Recovery Run", difficulty: 3, desc: "Sprint back and get goal-side" },
    ],
  },
  {
    id: "shooting",
    name: "Shooting",
    icon: "&#9918;",
    color: "from-[#ffd84d] to-[#B07E00]",
    drills: [
      { id: "find-the-shot", name: "Find the Shot", difficulty: 1, desc: "Get into a shooting position and fire" },
      { id: "one-two-finish", name: "One-Two Finish", difficulty: 2, desc: "Combine with a teammate before shooting" },
    ],
  },
  {
    id: "positioning",
    name: "Team Shape",
    icon: "&#128200;",
    color: "from-[#a855f7] to-[#7c3aed]",
    drills: [
      { id: "hold-the-line", name: "Hold the Line", difficulty: 2, desc: "Keep your defensive line compact" },
      { id: "spread-and-stretch", name: "Spread & Stretch", difficulty: 2, desc: "Maximize pitch coverage when attacking" },
    ],
  },
];

function difficultyStars(d: number) {
  return Array.from({ length: 5 }, (_, i) => (
    <span key={i} className={clsx("text-xs", i < d ? "text-[#FFC531]" : "text-[#e8f0e6]")}>
      &#9733;
    </span>
  ));
}

export default function DrillsPage() {
  const [activeDrill, setActiveDrill] = useState<DrillConfig | null>(null);
  const completedDrills = useGameStore((s) => s.progress.drillsCompleted);

  const bestStars = (drillId: string): number => {
    const runs = completedDrills.filter(d => d.drillId === drillId);
    if (runs.length === 0) return 0;
    return Math.max(...runs.map(r => r.stars));
  };

  const handleDrillClick = (drillId: string) => {
    const config = getDrill(drillId);
    if (config) {
      setActiveDrill(config);
    }
  };

  if (activeDrill) {
    return (
      <main className="flex-1 flex items-center justify-center p-2 lg:p-4">
        <DrillView drill={activeDrill} onExit={() => setActiveDrill(null)} />
      </main>
    );
  }

  return (
    <main className="flex-1 p-4 max-w-2xl mx-auto w-full">
      <Link href="/" className="inline-flex items-center gap-1.5 text-sm font-bold text-[#5d6f63] mb-4 hover:text-[#1F6E3D]">
        &larr; Home
      </Link>

      <h1 className="font-[Fredoka] font-bold text-2xl text-[#16241c] mb-1">Tactical Drills</h1>
      <p className="text-sm font-semibold text-[#5d6f63] mb-6">Master one skill at a time. Earn stars and XP.</p>

      <div className="flex flex-col gap-6">
        {DRILL_CATEGORIES.map((cat) => (
          <div key={cat.id}>
            <div className="flex items-center gap-2 mb-2.5">
              <span
                className={clsx("w-8 h-8 rounded-lg bg-gradient-to-b text-white grid place-items-center text-sm", cat.color)}
                dangerouslySetInnerHTML={{ __html: cat.icon }}
              />
              <h2 className="font-[Fredoka] font-semibold text-base">{cat.name}</h2>
            </div>
            <div className="flex flex-col gap-2">
              {cat.drills.map((drill) => {
                const isPlayable = !!getDrill(drill.id);
                const stars = bestStars(drill.id);
                return (
                  <div
                    key={drill.id}
                    onClick={() => isPlayable && handleDrillClick(drill.id)}
                    className={clsx(
                      "bg-white rounded-xl border border-[rgba(20,60,35,.08)] p-3.5 flex items-center justify-between transition-shadow active:translate-y-[1px]",
                      isPlayable ? "cursor-pointer hover:shadow-md" : "opacity-50 cursor-not-allowed"
                    )}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-[Fredoka] font-semibold text-sm">{drill.name}</p>
                        <div className="flex">{difficultyStars(drill.difficulty)}</div>
                        {!isPlayable && (
                          <span className="text-[9px] font-extrabold tracking-wide text-[#5d6f63] bg-[#f3f7f2] rounded px-1.5 py-0.5">
                            SOON
                          </span>
                        )}
                      </div>
                      <p className="text-xs font-semibold text-[#5d6f63] mt-0.5 truncate">{drill.desc}</p>
                    </div>
                    <div className="flex items-center gap-1 ml-3">
                      {[1, 2, 3].map((s) => (
                        <span key={s} className={clsx("text-lg", stars >= s ? "text-[#FFC531]" : "text-[#e8f0e6]")}>
                          &#9733;
                        </span>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-8 p-5 bg-white rounded-2xl border border-[rgba(20,60,35,.1)] text-center">
        <p className="font-[Fredoka] font-semibold text-base text-[#5d6f63]">More drills coming soon</p>
        <p className="text-xs font-semibold text-[#5d6f63]/70 mt-1">Set pieces, transitions, game reading &amp; more</p>
      </div>
    </main>
  );
}
