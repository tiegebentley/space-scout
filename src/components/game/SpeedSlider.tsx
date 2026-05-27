"use client";
import { SPEED_MAP } from "@/engine/constants";

interface SpeedSliderProps {
  value: number;
  onChange: (v: number) => void;
}

export function SpeedSlider({ value, onChange }: SpeedSliderProps) {
  return (
    <div className="bg-[#f3f7f2] rounded-xl p-2.5 px-3">
      <div className="text-[10.5px] font-extrabold text-[#5d6f63] tracking-wide flex justify-between mb-1.5">
        <span>GAME SPEED</span>
        <span>{SPEED_MAP.toLabel(value)}</span>
      </div>
      <input
        type="range"
        min={SPEED_MAP.min}
        max={SPEED_MAP.max}
        value={value}
        onChange={(e) => onChange(+e.target.value)}
        className="w-full"
      />
    </div>
  );
}
