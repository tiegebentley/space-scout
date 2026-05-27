"use client";
import type { Score } from "@/types/game";

interface ScoreboardProps {
  score: Score;
  clock: string;
  onPause: () => void;
  onFlipControls?: () => void;
  showFlip?: boolean;
}

export function Scoreboard({ score, clock, onPause, onFlipControls, showFlip }: ScoreboardProps) {
  return (
    <div className="flex items-center gap-3 bg-white/[.13] border border-white/[.24] rounded-xl px-4 py-1.5">
      <div className="text-center">
        <div className="font-extrabold text-[11px] tracking-wide">BLUES</div>
        <div className="font-[Fredoka] font-semibold text-2xl leading-none text-[#bfe0ff]">{score.us}</div>
      </div>
      <div className="font-[Fredoka] font-medium text-[19px] bg-black/[.16] rounded-lg px-2.5 py-0.5 min-w-[58px] text-center">
        {clock}
      </div>
      <div className="text-center">
        <div className="font-extrabold text-[11px] tracking-wide">REDS</div>
        <div className="font-[Fredoka] font-semibold text-2xl leading-none text-[#ffc9c4]">{score.them}</div>
      </div>
      <button
        onClick={onPause}
        title="Pause (spacebar)"
        className="font-[Fredoka] font-medium border-none cursor-pointer bg-white/[.18] border border-white/[.3] text-white rounded-[10px] w-[38px] h-[38px] text-[16px] grid place-items-center"
      >
        &#10074;&#10074;
      </button>
      {showFlip && onFlipControls && (
        <button
          onClick={onFlipControls}
          title="Swap control sides"
          className="font-[Fredoka] font-medium border-none cursor-pointer bg-white/[.18] border border-white/[.3] text-white rounded-[10px] w-[38px] h-[38px] text-[17px] grid place-items-center"
        >
          &#8646;
        </button>
      )}
    </div>
  );
}
