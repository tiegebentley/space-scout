"use client";

interface CoachPanelProps {
  message: string;
}

export function CoachPanel({ message }: CoachPanelProps) {
  return (
    <div className="bg-gradient-to-b from-white to-[#fafdfb] border border-[rgba(20,60,35,.1)] border-l-[5px] border-l-[#1F6E3D] rounded-xl p-3">
      <div className="flex items-center gap-2 font-[Fredoka] font-semibold text-[13.5px] text-[#1F6E3D] mb-1">
        <span className="w-[23px] h-[23px] rounded-full bg-[#1F6E3D] text-white grid place-items-center text-xs">
          C
        </span>
        Coach
      </div>
      <p className="text-[13px] leading-relaxed font-semibold text-[#33433a]">
        {message}
      </p>
    </div>
  );
}
