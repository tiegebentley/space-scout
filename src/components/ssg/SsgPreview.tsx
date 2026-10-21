"use client";
// Static diagram of a small-sided game setup (box, players, bumpers) — used on
// the games list and live in the builder. Positions come from the real engine
// setup, so the preview matches what you'll play.
import { useMemo } from "react";
import { SmallSidedEngine } from "@/engine/ssg/SmallSidedEngine";
import { SSG_COLORS } from "@/engine/ssg/render";
import type { SsgConfig } from "@/engine/ssg/types";

export function SsgPreview({ config, className }: { config: SsgConfig; className?: string }) {
  const e = useMemo(() => new SmallSidedEngine(config), [config]);
  const m = 2.4;
  const vw = config.boxW + m * 2, vh = config.boxH + m * 2;
  const r = Math.max(0.55, Math.min(0.95, Math.max(vw, vh) * 0.03));
  return (
    <svg viewBox={`${-m} ${-m} ${vw} ${vh}`} className={className} aria-hidden>
      <rect x={-m} y={-m} width={vw} height={vh} fill="#226f3f" rx={1} />
      <rect x={0} y={0} width={config.boxW} height={config.boxH} fill="#2B8A4E" stroke="#fff" strokeWidth={Math.max(0.12, vw * 0.008)} />
      {e.players.map((p) => {
        const fill = p.bumper ? SSG_COLORS.bumper : p.side === "A" ? SSG_COLORS.A : p.side === "B" ? SSG_COLORS.B : SSG_COLORS.N;
        return (
          <g key={p.id}>
            {p.isUser && <circle cx={p.x} cy={p.y} r={r * 1.45} fill="none" stroke={SSG_COLORS.you} strokeWidth={r * 0.35} />}
            <circle cx={p.x} cy={p.y} r={r} fill={fill} stroke="rgba(0,0,0,.35)" strokeWidth={r * 0.15} />
          </g>
        );
      })}
      <circle cx={e.ball.x} cy={e.ball.y} r={r * 0.42} fill="#fff" stroke="#16241c" strokeWidth={r * 0.08} />
    </svg>
  );
}
