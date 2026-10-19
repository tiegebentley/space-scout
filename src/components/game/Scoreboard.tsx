"use client";
import type { Score } from "@/types/game";
import { TapButton } from "@/components/ui/TapButton";

interface ScoreboardProps {
  score: Score;
  clock: string;
  onPause: () => void;
  onFlipControls?: () => void;
  showFlip?: boolean;
}

export function Scoreboard({ score, clock, onPause, onFlipControls, showFlip }: ScoreboardProps) {
  return (
    <div className="flex items-center gap-1.5 sm:gap-3 bg-white/[.13] border border-white/[.24] rounded-xl px-2 sm:px-4 py-1 sm:py-1.5 shrink-0">
      <div className="text-center">
        <div className="font-extrabold text-[11px] tracking-wide">BLUES</div>
        <div className="font-[Fredoka] font-semibold text-2xl leading-none text-[#bfe0ff]">{score.us}</div>
      </div>
      <div className="font-[Fredoka] font-medium text-[16px] sm:text-[19px] bg-black/[.16] rounded-lg px-1.5 sm:px-2.5 py-0.5 min-w-[48px] sm:min-w-[58px] text-center">
        {clock}
      </div>
      <div className="text-center">
        <div className="font-extrabold text-[11px] tracking-wide">REDS</div>
        <div className="font-[Fredoka] font-semibold text-2xl leading-none text-[#ffc9c4]">{score.them}</div>
      </div>
      <TapButton
        onTap={onPause}
        title="Pause (spacebar)"
        className="font-[Fredoka] font-medium border-none cursor-pointer bg-white/[.18] border border-white/[.3] text-white rounded-[10px] w-8 h-8 sm:w-[38px] sm:h-[38px] text-[14px] sm:text-[16px] grid place-items-center"
      >
        &#10074;&#10074;
      </TapButton>
      {showFlip && onFlipControls && (
        <TapButton
          onTap={onFlipControls}
          title="Swap control sides"
          className="font-[Fredoka] font-medium border-none cursor-pointer bg-white/[.18] border border-white/[.3] text-white rounded-[10px] w-8 h-8 sm:w-[38px] sm:h-[38px] text-[15px] sm:text-[17px] grid place-items-center"
        >
          &#8646;
        </TapButton>
      )}
    </div>
  );
}
