"use client";
// A static portrait preview of a match formation for the author's Scenario/Game
// steps — shows both teams' starting spots for the chosen format, highlights the
// player you control, and draws any zone-rule boundaries. Read-only (a picture of
// the setup), so the field appears on the left like the Instructional board.
import { FORMATIONS, JERSEY_NUMBERS, L, R, TOP, BOT } from "@/engine/constants";
import type { ZoneRule } from "@/types/game";
import { labToScreen, VIEW_W, VIEW_H } from "./boardTransform";

const HOME = "#2E6FE0";
const AWAY = "#E0463B";

// Engine→lab coord helper: the engine pitch is W×H landscape-ish but the board
// transform expects lab coords (1000×620). We map engine fractional positions
// straight onto the lab space then rotate to portrait via labToScreen.
function spotToScreen(fx: number, fy: number, side: "us" | "them") {
  // us attacks up; mirror them vertically. fx=width fraction, fy=depth fraction.
  const labX = (side === "us" ? fy : 1 - fy) * 1000; // depth → lab x (attacking axis)
  const labY = fx * 620;                              // width → lab y
  return labToScreen(labX, labY);
}

export function FormationPreview({ format, userRole, zoneRules }: { format: "3v3" | "5v5" | "7v7"; userRole?: string; zoneRules?: ZoneRule[] }) {
  const formation = FORMATIONS[format] || FORMATIONS["5v5"];
  const roles = Object.keys(formation);
  // Build both teams' tokens + GKs.
  const tokens: { x: number; y: number; side: "us" | "them"; label: string; you: boolean }[] = [];
  for (const side of ["us", "them"] as const) {
    tokens.push({ ...gkScreen(side), side, label: "1", you: false });
    for (const r of roles) {
      const cfg = formation[r];
      const s = spotToScreen(cfg.fx, cfg.fy, side);
      tokens.push({ x: s.sx, y: s.sy, side, label: String(JERSEY_NUMBERS[r] ?? "?"), you: side === "us" && r === userRole });
    }
  }

  return (
    <svg viewBox={`0 0 ${VIEW_W} ${VIEW_H}`} className="w-full max-w-[420px] mx-auto block rounded-2xl border-2 border-[rgba(20,60,35,.15)] shadow-sm">
      {Array.from({ length: 10 }).map((_, i) => (
        <rect key={i} x={0} y={(VIEW_H / 10) * i} width={VIEW_W} height={VIEW_H / 10} fill={i % 2 ? "#2F9354" : "#2B8A4E"} />
      ))}
      <rect x={6} y={6} width={VIEW_W - 12} height={VIEW_H - 12} fill="none" stroke="rgba(255,255,255,.7)" strokeWidth={3} rx={10} />
      <line x1={6} y1={VIEW_H / 2} x2={VIEW_W - 6} y2={VIEW_H / 2} stroke="rgba(255,255,255,.7)" strokeWidth={3} />
      <circle cx={VIEW_W / 2} cy={VIEW_H / 2} r={70} fill="none" stroke="rgba(255,255,255,.7)" strokeWidth={3} />

      {/* Boundaries / rules (us team) */}
      {(zoneRules || []).filter((z) => z.team === "us").map((z) => {
        const c1 = labToScreen(L + (R - L) * z.xMin, TOP + (BOT - TOP) * z.yMin);
        const c2 = labToScreen(L + (R - L) * z.xMax, TOP + (BOT - TOP) * z.yMax);
        return <rect key={z.id} x={Math.min(c1.sx, c2.sx)} y={Math.min(c1.sy, c2.sy)} width={Math.abs(c2.sx - c1.sx)} height={Math.abs(c2.sy - c1.sy)} fill="rgba(46,111,224,.12)" stroke="rgba(46,111,224,.7)" strokeWidth={2} strokeDasharray="8 6" rx={8} />;
      })}

      {tokens.map((t, i) => (
        <g key={i}>
          <circle cx={t.x} cy={t.y} r={20} fill={t.side === "us" ? HOME : AWAY} stroke={t.you ? "#FFD166" : "rgba(255,255,255,.85)"} strokeWidth={t.you ? 5 : 2} />
          <text x={t.x} y={t.y + 6} textAnchor="middle" fontSize={18} fontWeight={800} fill="#fff" style={{ fontFamily: "Fredoka, sans-serif" }}>{t.label}</text>
        </g>
      ))}
    </svg>
  );
}

// GKs sit on each team's goal line (engine: us defends bottom, attacks up).
function gkScreen(side: "us" | "them") {
  const s = side === "us" ? labToScreen(40, 310) : labToScreen(960, 310);
  return { x: s.sx, y: s.sy };
}
