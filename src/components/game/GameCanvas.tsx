"use client";
import { useRef, useEffect, useCallback, type RefObject } from "react";
import type { GameEngine } from "@/engine/GameEngine";
import { W, H } from "@/engine/constants";
import { hitTestZoneEdge, fieldXToBoundFx } from "@/engine/renderer";

interface GameCanvasProps {
  engineRef: RefObject<GameEngine | null>;
  canvasRef: RefObject<HTMLCanvasElement | null>;
  onWingerBoundsChange?: (bounds: { lw: { min: number; max: number }; rw: { min: number; max: number } }) => void;
  className?: string;
}

export function GameCanvas({ engineRef, canvasRef, onWingerBoundsChange, className }: GameCanvasProps) {
  const draggingRef = useRef(false);
  const zoneDragRef = useRef<"lw-max" | "rw-min" | null>(null);

  const toField = useCallback(
    (e: MouseEvent | TouchEvent): { x: number; y: number } | null => {
      const canvas = canvasRef.current;
      if (!canvas) return null;
      const r = canvas.getBoundingClientRect();
      const clientX = "touches" in e ? e.touches[0]?.clientX ?? 0 : e.clientX;
      const clientY = "touches" in e ? e.touches[0]?.clientY ?? 0 : e.clientY;
      return {
        x: ((clientX - r.left) / r.width) * W,
        y: ((clientY - r.top) / r.height) * H,
      };
    },
    [canvasRef]
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const onDown = (e: MouseEvent | TouchEvent) => {
      // Read the engine live each time: it's created in a later effect and may
      // be re-created (React Strict Mode), so a captured reference goes stale.
      const engine = engineRef.current;
      if (!engine || !engine.running) return;
      const p = toField(e);
      if (!p) return;

      // Check zone editor handles first
      if (engine.showZoneEditor) {
        const edge = hitTestZoneEdge(p.x, p.y, engine.wingerBounds);
        if (edge) {
          zoneDragRef.current = edge;
          canvas.classList.add("grabbing");
          e.preventDefault();
          return;
        }
      }

      // Player drag-to-move is intentionally disabled: the player is controlled
      // only via arrow keys and the on-screen joystick. (Zone-editor handles
      // above still drag.) Leaving draggingRef false means onMove ignores
      // pointer movement for the player.
    };

    const onMove = (e: MouseEvent | TouchEvent) => {
      const engine = engineRef.current;
      if (!engine) return;
      const p = toField(e);
      if (!p || !engine.running) return;

      // Zone edge dragging
      if (zoneDragRef.current) {
        const fx = fieldXToBoundFx(p.x);
        const bounds = { ...engine.wingerBounds, lw: { ...engine.wingerBounds.lw }, rw: { ...engine.wingerBounds.rw } };
        if (zoneDragRef.current === "lw-max") {
          bounds.lw.max = Math.max(bounds.lw.min + 0.05, Math.min(0.48, fx));
        } else {
          bounds.rw.min = Math.max(0.52, Math.min(bounds.rw.max - 0.05, fx));
        }
        engine.wingerBounds = bounds;
        onWingerBoundsChange?.(bounds);
        e.preventDefault();
        return;
      }

      if (!draggingRef.current) return;
      engine.handleDrag(p.x, p.y);
      e.preventDefault();
    };

    const onUp = () => {
      draggingRef.current = false;
      zoneDragRef.current = null;
      canvas.classList.remove("grabbing");
    };

    canvas.addEventListener("mousedown", onDown);
    canvas.addEventListener("touchstart", onDown, { passive: false });
    window.addEventListener("mousemove", onMove);
    window.addEventListener("touchmove", onMove, { passive: false });
    window.addEventListener("mouseup", onUp);
    window.addEventListener("touchend", onUp);

    return () => {
      canvas.removeEventListener("mousedown", onDown);
      canvas.removeEventListener("touchstart", onDown);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("touchmove", onMove);
      window.removeEventListener("mouseup", onUp);
      window.removeEventListener("touchend", onUp);
    };
  }, [engineRef, canvasRef, toField, onWingerBoundsChange]);

  return (
    <canvas
      ref={canvasRef}
      width={W}
      height={H}
      className={`block w-full h-auto rounded-xl touch-none cursor-grab shadow-[inset_0_0_0_2px_rgba(255,255,255,.12)] ${className ?? ""}`}
    />
  );
}
