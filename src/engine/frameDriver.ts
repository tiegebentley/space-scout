// Fixed-timestep driver + render interpolation for the canvas engines.
//
// The engine's movement is per-step (px per step), so it MUST advance at a fixed
// rate. Previously it stepped once per requestAnimationFrame: on 90/120Hz phones
// the whole game ran 1.5–2× fast, and any dropped frame made it stutter. Now the
// simulation always ticks at 60Hz (accumulator), and each rendered frame draws
// positions interpolated between the last two simulation states, so motion is
// smooth at any display refresh rate.
import type { GameEngine } from "./GameEngine";
import type { Player } from "@/types/game";

export const STEP_MS = 1000 / 60;
const MAX_STEPS = 5;          // spiral-of-death guard (tab was backgrounded, etc.)
const TELEPORT = 36;          // px — bigger jumps (restarts) are not interpolated

type Ent = { x: number; y: number };

export class FrameDriver {
  private last = 0;
  private acc = 0;
  private prev = new Map<Ent, { x: number; y: number }>();
  private faces = new WeakMap<Player, number>();

  reset() { this.last = 0; this.acc = 0; this.prev.clear(); }

  private entities(engine: GameEngine): Ent[] {
    if (!engine.you) return [];
    return [...engine.teamUs, ...engine.teamThem, engine.ball].filter(Boolean) as Ent[];
  }

  /** Advance the simulation for this animation frame, then render interpolated. */
  frame(t: number, engine: GameEngine, afterStep: () => void, render: () => void) {
    if (!this.last) this.last = t;
    const dt = Math.min(250, t - this.last);
    this.last = t;
    this.acc += dt;
    let steps = 0;
    while (this.acc >= STEP_MS && steps < MAX_STEPS) {
      this.prev.clear();
      for (const e of this.entities(engine)) this.prev.set(e, { x: e.x, y: e.y });
      engine.update(STEP_MS);
      afterStep();
      this.acc -= STEP_MS;
      steps++;
    }
    if (steps === MAX_STEPS) this.acc = 0;
    const alpha = Math.max(0, Math.min(1, this.acc / STEP_MS));

    // Swap in interpolated positions + smoothed facing just for drawing.
    const saved: Array<[Ent, number, number]> = [];
    for (const [e, p] of this.prev) {
      const dx = e.x - p.x, dy = e.y - p.y;
      if (Math.abs(dx) > TELEPORT || Math.abs(dy) > TELEPORT) continue;
      saved.push([e, e.x, e.y]);
      e.x = p.x + dx * alpha;
      e.y = p.y + dy * alpha;
    }
    const savedFace: Array<[Player, number]> = [];
    const turn = Math.min(1, dt / STEP_MS) * 0.3;
    for (const p of [...(engine.you ? engine.teamUs : []), ...(engine.you ? engine.teamThem : [])]) {
      if (p.face == null) continue;
      const shown = this.faces.get(p) ?? p.face;
      const d = Math.atan2(Math.sin(p.face - shown), Math.cos(p.face - shown));
      const next = shown + Math.max(-turn, Math.min(turn, d));
      this.faces.set(p, next);
      savedFace.push([p, p.face]);
      p.face = next;
    }
    try {
      render();
    } finally {
      for (const [e, x, y] of saved) { e.x = x; e.y = y; }
      for (const [p, f] of savedFace) p.face = f;
    }
  }
}
