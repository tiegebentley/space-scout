"use client";
import { useRef, useEffect, useCallback } from "react";
import { FrameDriver } from "@/engine/frameDriver";
import { GameEngine, type EngineEvent } from "@/engine/GameEngine";
import { renderFrame } from "@/engine/renderer";
import type { MatchConfig } from "@/types/game";

interface UseGameLoopOptions {
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  config?: Partial<MatchConfig>;
  onEvent?: (event: EngineEvent) => void;
}

export function useGameLoop({ canvasRef, config, onEvent }: UseGameLoopOptions) {
  const engineRef = useRef<GameEngine | null>(null);
  const rafRef = useRef<number>(0);
  const lastRef = useRef<number>(0);
  // Fixed 60Hz simulation + interpolated rendering (see engine/frameDriver).
  const driverRef = useRef(new FrameDriver());

  // Initialize engine
  useEffect(() => {
    engineRef.current = new GameEngine(config);
    if (process.env.NODE_ENV !== "production") {
      (window as unknown as { __ENGINE__?: GameEngine }).__ENGINE__ = engineRef.current;
    }
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  // Game loop
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
          const events = engine!.flushEvents();
          if (onEvent) for (const ev of events) onEvent(ev as never);
        },
        () => renderFrame(ctx!, engine!),
      );
      rafRef.current = requestAnimationFrame(loop);
    }

    rafRef.current = requestAnimationFrame(loop);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [canvasRef, onEvent]);

  const startMatch = useCallback(() => {
    const engine = engineRef.current;
    if (engine) {
      engine.start();
      lastRef.current = 0;
    }
  }, []);

  const togglePause = useCallback(() => {
    engineRef.current?.togglePause();
  }, []);

  const setSpeed = useCallback((v: number) => {
    engineRef.current?.applySpeed(v);
  }, []);

  const doPass = useCallback(() => {
    engineRef.current?.doPlayerPass();
  }, []);

  const doShoot = useCallback(() => {
    engineRef.current?.doPlayerShoot();
  }, []);

  const toggleBuildoutLines = useCallback(() => {
    engineRef.current?.toggleBuildoutLines();
  }, []);

  const setTactic = useCallback((tacticId: string, team: "us" | "them" = "us") => {
    engineRef.current?.setTactic(tacticId, team);
  }, []);

  return {
    engine: engineRef,
    startMatch,
    togglePause,
    setSpeed,
    doPass,
    doShoot,
    toggleBuildoutLines,
    setTactic,
  };
}
