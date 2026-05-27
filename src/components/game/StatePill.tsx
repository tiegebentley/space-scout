"use client";
import { clsx } from "clsx";
import type { PillState } from "@/types/game";

interface StatePillProps {
  pill: PillState;
}

export function StatePill({ pill }: StatePillProps) {
  return (
    <div className="flex items-center justify-center gap-2 mt-2 font-extrabold text-xs tracking-wide text-white text-center min-h-[20px]">
      <span
        className={clsx(
          "px-3 py-0.5 rounded-full text-[11px]",
          pill.type === "att" && "bg-[rgba(46,111,224,.9)]",
          pill.type === "def" && "bg-[rgba(224,70,59,.9)]",
          pill.type === "dead" && "bg-[rgba(255,197,49,.92)] text-[#5a4400]",
        )}
      >
        {pill.text}
      </span>
    </div>
  );
}
