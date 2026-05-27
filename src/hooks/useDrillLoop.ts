"use client";
import { useRef, useEffect, useCallback } from "react";
import { DrillEngine, type DrillEvent } from "@/engine/DrillEngine";
import { renderDrillFrame } from "@/engine/drillRenderer";
import type { DrillConfig } from "@/types/game";

interface UseDrillLoopOptions {
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  drill: DrillConfig;
  onEvent?: (event: DrillEvent) => void;
}

export function useDrillLoop({ canvasRef, drill, onEvent }: UseDrillLoopOptions) {
  const engineRef = useRef<DrillEngine | null>(null);
  const rafRef = useRef<number>(0);
  const lastRef = useRef<number>(0);

  useEffect(() => {
    engineRef.current = new DrillEngine(drill);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [drill]);

  useEffect(() => {
    const engine = engineRef.current;
    const canvas = canvasRef.current;
    if (!engine || !canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    function loop(t: number) {
      if (!lastRef.current) lastRef.current = t;
      const dt = Math.min(50, t - lastRef.current);
      lastRef.current = t;

      engine!.update(dt);

      const events = engine!.flushDrillEvents();
      if (onEvent) {
        for (const ev of events) onEvent(ev);
      }

      renderDrillFrame(ctx!, engine!);
      rafRef.current = requestAnimationFrame(loop);
    }

    rafRef.current = requestAnimationFrame(loop);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [canvasRef, onEvent]);

  const startDrill = useCallback(() => {
    const engine = engineRef.current;
    if (engine) {
      engine.startDrill();
      lastRef.current = 0;
    }
  }, []);

  const doPass = useCallback(() => {
    engineRef.current?.doPlayerPass();
  }, []);

  const doShoot = useCallback(() => {
    engineRef.current?.doPlayerShoot();
  }, []);

  return {
    engine: engineRef,
    startDrill,
    doPass,
    doShoot,
  };
}
