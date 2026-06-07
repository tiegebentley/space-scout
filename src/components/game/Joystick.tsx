"use client";
import { useRef, useCallback, type RefObject } from "react";
import type { GameEngine } from "@/engine/GameEngine";

interface JoystickProps {
  engineRef: RefObject<GameEngine | null>;
  size?: number;
  className?: string;
}

// Pointer-events implementation: one code path for touch + mouse, and we capture
// the pointer so move/end always track THIS finger even if it leaves the base.
// This fixes the "knob sticks in the top-left corner after the first move" bug,
// which came from mixing touch/mouse listeners on window with a stale rect.
export function Joystick({ engineRef, size = 104, className }: JoystickProps) {
  const baseRef = useRef<HTMLDivElement>(null);
  const knobRef = useRef<HTMLDivElement>(null);
  const activeId = useRef<number | null>(null);

  const apply = useCallback((clientX: number, clientY: number) => {
    const engine = engineRef.current;
    const base = baseRef.current;
    const knob = knobRef.current;
    if (!engine || !base || !knob) return;
    const r = base.getBoundingClientRect();
    const joyR = r.width / 2;
    let dx = clientX - (r.left + joyR);
    let dy = clientY - (r.top + joyR);
    let mag = Math.hypot(dx, dy);
    const max = joyR - 6;
    if (mag > max) { dx = (dx / mag) * max; dy = (dy / mag) * max; mag = max; }
    knob.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
    if (mag < 8) { engine.joyVec.x = 0; engine.joyVec.y = 0; }
    else { engine.joyVec.x = dx; engine.joyVec.y = dy; }
  }, [engineRef]);

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    if (activeId.current !== null) return;       // ignore extra fingers
    activeId.current = e.pointerId;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    const engine = engineRef.current;
    if (engine) engine.joyVec.active = true;
    apply(e.clientX, e.clientY);
    e.preventDefault();
  }, [apply, engineRef]);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (e.pointerId !== activeId.current) return;
    apply(e.clientX, e.clientY);
    e.preventDefault();
  }, [apply]);

  const onPointerUp = useCallback((e: React.PointerEvent) => {
    if (e.pointerId !== activeId.current) return;
    activeId.current = null;
    const engine = engineRef.current;
    if (engine) { engine.joyVec.active = false; engine.joyVec.x = 0; engine.joyVec.y = 0; }
    if (knobRef.current) knobRef.current.style.transform = "translate(-50%, -50%)";
    try { (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId); } catch {}
  }, [engineRef]);

  const knobSize = Math.round(size * 0.44);

  return (
    <div className={className}>
      <div
        ref={baseRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        className="relative rounded-full bg-white/[.14] border-2 border-white/[.5] shadow-[inset_0_2px_8px_rgba(0,0,0,.18)] cursor-pointer select-none"
        style={{ width: size, height: size, touchAction: "none" }}
      >
        <div
          ref={knobRef}
          className="absolute left-1/2 top-1/2 rounded-full bg-gradient-to-b from-[#ffd84d] to-[#FFC531] border-2 border-[#B07E00] shadow-[0_3px_8px_rgba(0,0,0,.28)] pointer-events-none"
          style={{ width: knobSize, height: knobSize, transform: "translate(-50%, -50%)" }}
        />
      </div>
    </div>
  );
}
