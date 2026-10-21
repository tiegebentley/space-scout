"use client";
import { useRef, useEffect, useCallback } from "react";
import { FrameDriver } from "@/engine/frameDriver";
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
  // Fixed 60Hz simulation + interpolated rendering (see engine/frameDriver).
  const driverRef = useRef(new FrameDriver());

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

    const driver = driverRef.current;
    function loop(t: number) {
      if (lastRef.current === 0) { driver.reset(); lastRef.current = 1; }
      driver.frame(
        t,
        engine!,
        () => {
          const events = engine!.flushDrillEvents();
          if (onEvent) for (const ev of events) onEvent(ev as never);
        },
        () => renderDrillFrame(ctx!, engine!),
      );
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
