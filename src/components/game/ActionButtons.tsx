"use client";
import { clsx } from "clsx";

interface ActionButtonsProps {
  canPass: boolean;
  canShoot: boolean;
  onPass: () => void;
  onShoot: () => void;
  layout?: "sidebar" | "floating";
}

export function ActionButtons({ canPass, canShoot, onPass, onShoot, layout = "sidebar" }: ActionButtonsProps) {
  if (layout === "floating") {
    return (
      <div className="flex flex-col gap-3 items-center">
        <button
          className={clsx(
            "w-[78px] h-[78px] rounded-full font-[Fredoka] font-medium text-[15px] text-white grid place-items-center",
            "bg-gradient-to-b from-[#ff6b5e] to-[#E0463B] shadow-[0_4px_0_rgba(0,0,0,.18)]",
            "active:translate-y-[2px] active:shadow-[0_2px_0_rgba(0,0,0,.18)] transition-transform",
            !canShoot && "opacity-30 cursor-default"
          )}
          disabled={!canShoot}
          onTouchEnd={(e) => { e.preventDefault(); e.stopPropagation(); onShoot(); }}
          onClick={onShoot}
        >
          Shoot
        </button>
        <button
          className={clsx(
            "w-[78px] h-[78px] rounded-full font-[Fredoka] font-medium text-[15px] text-white grid place-items-center",
            "bg-gradient-to-b from-[#3f87ef] to-[#2E6FE0] shadow-[0_4px_0_rgba(0,0,0,.18)]",
            "active:translate-y-[2px] active:shadow-[0_2px_0_rgba(0,0,0,.18)] transition-transform",
            !canPass && "opacity-30 cursor-default"
          )}
          disabled={!canPass}
          onTouchEnd={(e) => { e.preventDefault(); e.stopPropagation(); onPass(); }}
          onClick={onPass}
        >
          Pass
        </button>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-2">
      <button
        className={clsx(
          "font-[Fredoka] font-medium rounded-xl py-3 px-2 text-[15px] text-white cursor-pointer",
          "bg-gradient-to-b from-[#3f87ef] to-[#2E6FE0] shadow-[0_4px_0_rgba(0,0,0,.18)]",
          "active:translate-y-[2px] active:shadow-[0_2px_0_rgba(0,0,0,.18)] transition-transform",
          !canPass && "opacity-30 cursor-default"
        )}
        disabled={!canPass}
        onClick={onPass}
      >
        Pass (A)
      </button>
      <button
        className={clsx(
          "font-[Fredoka] font-medium rounded-xl py-3 px-2 text-[15px] text-white cursor-pointer",
          "bg-gradient-to-b from-[#ff6b5e] to-[#E0463B] shadow-[0_4px_0_rgba(0,0,0,.18)]",
          "active:translate-y-[2px] active:shadow-[0_2px_0_rgba(0,0,0,.18)] transition-transform",
          !canShoot && "opacity-30 cursor-default"
        )}
        disabled={!canShoot}
        onClick={onShoot}
      >
        Shoot (S)
      </button>
    </div>
  );
}
