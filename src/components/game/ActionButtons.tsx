"use client";
import { clsx } from "clsx";

interface ActionButtonsProps {
  canPass: boolean;
  canShoot: boolean;
  onPass: () => void;
  onShoot: () => void;
  layout?: "sidebar" | "floating";
}

// Fire on pointerup so a single tap works reliably on touch AND mouse, without
// the double-fire you get from pairing onTouchEnd with onClick. We guard with
// the disabled flag so a tap on a faded (can't act) button does nothing.
function tap(enabled: boolean, fn: () => void) {
  return (e: React.PointerEvent) => {
    if (!enabled) return;
    e.preventDefault();
    e.stopPropagation();
    fn();
  };
}

export function ActionButtons({ canPass, canShoot, onPass, onShoot, layout = "sidebar" }: ActionButtonsProps) {
  if (layout === "floating") {
    return (
      <div className="flex flex-col gap-3 items-center">
        <button
          className={clsx(
            "w-[78px] h-[78px] rounded-full font-[Fredoka] font-medium text-[15px] text-white grid place-items-center select-none",
            "bg-gradient-to-b from-[#ff6b5e] to-[#E0463B] shadow-[0_4px_0_rgba(0,0,0,.18)]",
            "active:translate-y-[2px] active:shadow-[0_2px_0_rgba(0,0,0,.18)] transition-transform",
            !canShoot && "opacity-30"
          )}
          style={{ touchAction: "manipulation" }}
          onPointerUp={tap(canShoot, onShoot)}
        >
          Shoot
        </button>
        <button
          className={clsx(
            "w-[78px] h-[78px] rounded-full font-[Fredoka] font-medium text-[15px] text-white grid place-items-center select-none",
            "bg-gradient-to-b from-[#3f87ef] to-[#2E6FE0] shadow-[0_4px_0_rgba(0,0,0,.18)]",
            "active:translate-y-[2px] active:shadow-[0_2px_0_rgba(0,0,0,.18)] transition-transform",
            !canPass && "opacity-30"
          )}
          style={{ touchAction: "manipulation" }}
          onPointerUp={tap(canPass, onPass)}
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
          "font-[Fredoka] font-medium rounded-xl py-3 px-2 text-[15px] text-white cursor-pointer select-none",
          "bg-gradient-to-b from-[#3f87ef] to-[#2E6FE0] shadow-[0_4px_0_rgba(0,0,0,.18)]",
          "active:translate-y-[2px] active:shadow-[0_2px_0_rgba(0,0,0,.18)] transition-transform",
          !canPass && "opacity-30"
        )}
        style={{ touchAction: "manipulation" }}
        onPointerUp={tap(canPass, onPass)}
      >
        Pass (A)
      </button>
      <button
        className={clsx(
          "font-[Fredoka] font-medium rounded-xl py-3 px-2 text-[15px] text-white cursor-pointer select-none",
          "bg-gradient-to-b from-[#ff6b5e] to-[#E0463B] shadow-[0_4px_0_rgba(0,0,0,.18)]",
          "active:translate-y-[2px] active:shadow-[0_2px_0_rgba(0,0,0,.18)] transition-transform",
          !canShoot && "opacity-30"
        )}
        style={{ touchAction: "manipulation" }}
        onPointerUp={tap(canShoot, onShoot)}
      >
        Shoot (S)
      </button>
    </div>
  );
}
