"use client";
import { useRef, useCallback, useEffect, type RefObject } from "react";
import type { GameEngine } from "@/engine/GameEngine";

interface JoystickProps {
  engineRef: RefObject<GameEngine | null>;
  size?: number;
  className?: string;
}

export function Joystick({ engineRef, size = 104, className }: JoystickProps) {
  const baseRef = useRef<HTMLDivElement>(null);
  const knobRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef(false);

  const handleStart = useCallback((e: React.TouchEvent | React.MouseEvent) => {
    activeRef.current = true;
    const engine = engineRef.current;
    if (engine) engine.joyVec.active = true;
    handleMove(e);
    e.preventDefault();
  }, [engineRef]);

  const handleMove = useCallback((e: React.TouchEvent | React.MouseEvent | TouchEvent | MouseEvent) => {
    if (!activeRef.current || !baseRef.current || !knobRef.current) return;
    const engine = engineRef.current;
    if (!engine) return;

    const r = baseRef.current.getBoundingClientRect();
    const joyR = r.width / 2;
    const clientX = "touches" in e ? (e as TouchEvent).touches[0]?.clientX ?? 0 : (e as MouseEvent).clientX;
    const clientY = "touches" in e ? (e as TouchEvent).touches[0]?.clientY ?? 0 : (e as MouseEvent).clientY;
    let dx = clientX - (r.left + joyR);
    let dy = clientY - (r.top + joyR);
    let mag = Math.hypot(dx, dy);
    const max = joyR - 6;
    if (mag > max) { dx = (dx / mag) * max; dy = (dy / mag) * max; mag = max; }

    knobRef.current.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;

    if (mag < 8) { engine.joyVec.x = 0; engine.joyVec.y = 0; }
    else { engine.joyVec.x = dx; engine.joyVec.y = dy; }

    if ("preventDefault" in e && (e as Event).cancelable) (e as Event).preventDefault();
  }, [engineRef]);

  const handleEnd = useCallback(() => {
    activeRef.current = false;
    const engine = engineRef.current;
    if (engine) { engine.joyVec.active = false; engine.joyVec.x = 0; engine.joyVec.y = 0; }
    if (knobRef.current) knobRef.current.style.transform = "translate(-50%, -50%)";
  }, [engineRef]);

  useEffect(() => {
    const onMove = (e: MouseEvent | TouchEvent) => handleMove(e);
    const onEnd = (e: MouseEvent | TouchEvent) => { handleEnd(); if ((e as Event).cancelable) (e as Event).preventDefault(); };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("touchmove", onMove, { passive: false });
    window.addEventListener("mouseup", onEnd);
    window.addEventListener("touchend", onEnd);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("touchmove", onMove);
      window.removeEventListener("mouseup", onEnd);
      window.removeEventListener("touchend", onEnd);
    };
  }, [handleMove, handleEnd]);

  const knobSize = Math.round(size * 0.44);

  return (
    <div className={className}>
      <div
        ref={baseRef}
        onMouseDown={handleStart}
        onTouchStart={handleStart}
        className="relative rounded-full bg-white/[.14] border-2 border-white/[.5] shadow-[inset_0_2px_8px_rgba(0,0,0,.18)] cursor-pointer"
        style={{ width: size, height: size, touchAction: "none" }}
      >
        <div
          ref={knobRef}
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-gradient-to-b from-[#ffd84d] to-[#FFC531] border-2 border-[#B07E00] shadow-[0_3px_8px_rgba(0,0,0,.28)] pointer-events-none"
          style={{ width: knobSize, height: knobSize }}
        />
      </div>
    </div>
  );
}
