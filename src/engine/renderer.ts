import type { Player, Ball } from "@/types/game";
import type { GameEngine } from "./GameEngine";
import { W, H, L, R, TOP, BOT, GX0, GX1, THIRD_1_Y, THIRD_2_Y } from "./constants";

export function renderFrame(ctx: CanvasRenderingContext2D, engine: GameEngine) {
  ctx.clearRect(0, 0, W, H);
  drawPitch(ctx, engine.showBuildoutLines);
  if (!engine.you) return;
  if (engine.showZoneEditor) drawWingerZones(ctx, engine);
  drawPassLane(ctx, engine);
  drawKeepers(ctx, engine);
  drawOutfield(ctx, engine);
  drawYou(ctx, engine);
  drawBall(ctx, engine);
}

function drawPitch(ctx: CanvasRenderingContext2D, buildoutLines = false) {
  const bands = 10, bh = H / bands;
  for (let i = 0; i < bands; i++) {
    ctx.fillStyle = i % 2 ? "#2F9354" : "#2B8A4E";
    ctx.fillRect(0, i * bh, W, bh);
  }
  ctx.strokeStyle = "rgba(255,255,255,.85)";
  ctx.lineWidth = 2.5;
  ctx.strokeRect(L, TOP, R - L, BOT - TOP);
  ctx.beginPath(); ctx.moveTo(L, H / 2); ctx.lineTo(R, H / 2); ctx.stroke();
  ctx.beginPath(); ctx.arc(W / 2, H / 2, 72, 0, Math.PI * 2); ctx.stroke();
  const boxW = 260, boxH = 70;
  ctx.strokeRect(W / 2 - boxW / 2, TOP, boxW, boxH);
  ctx.strokeRect(W / 2 - boxW / 2, BOT - boxH, boxW, boxH);

  // goals
  ctx.lineWidth = 6;
  ctx.strokeStyle = "#ffffff";
  ctx.beginPath(); ctx.moveTo(GX0, TOP); ctx.lineTo(GX1, TOP); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(GX0, BOT); ctx.lineTo(GX1, BOT); ctx.stroke();

  // net hint
  ctx.lineWidth = 1;
  ctx.strokeStyle = "rgba(255,255,255,.4)";
  for (let n = GX0; n <= GX1; n += 10) {
    ctx.beginPath(); ctx.moveTo(n, TOP); ctx.lineTo(n, TOP - 9); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(n, BOT); ctx.lineTo(n, BOT + 9); ctx.stroke();
  }

  // Buildout lines (thirds)
  if (buildoutLines) {
    ctx.save();
    ctx.strokeStyle = "rgba(255,255,255,.45)";
    ctx.lineWidth = 1.5;
    ctx.setLineDash([10, 8]);
    ctx.beginPath(); ctx.moveTo(L, THIRD_1_Y); ctx.lineTo(R, THIRD_1_Y); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(L, THIRD_2_Y); ctx.lineTo(R, THIRD_2_Y); ctx.stroke();
    ctx.restore();
  }
}

function dot(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, fill: string, stroke?: string, sw = 2) {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fillStyle = fill;
  ctx.fill();
  if (stroke) {
    ctx.lineWidth = sw;
    ctx.strokeStyle = stroke;
    ctx.stroke();
  }
}

function arrow(ctx: CanvasRenderingContext2D, p: Player, r: number, color: string) {
  if (p.face == null) return;
  const a = p.face;
  const x0 = p.x + Math.cos(a) * (r + 2);
  const y0 = p.y + Math.sin(a) * (r + 2);
  const x1 = p.x + Math.cos(a) * (r + 11);
  const y1 = p.y + Math.sin(a) * (r + 11);

  ctx.save();
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = 2.5;
  ctx.lineCap = "round";
  ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();

  const ah = 4;
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x1 - Math.cos(a - 0.5) * ah, y1 - Math.sin(a - 0.5) * ah);
  ctx.lineTo(x1 - Math.cos(a + 0.5) * ah, y1 - Math.sin(a + 0.5) * ah);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawPassLane(ctx: CanvasRenderingContext2D, engine: GameEngine) {
  const { ball, you, gstate } = engine;
  if (!ball.owner || ball.owner.side !== "us" || ball.owner === you || ball.flying || gstate !== "live") return;

  const av = (engine as any).availability
    ? (engine as any).availability(you, ball.owner)
    : 0.5;

  ctx.save();
  ctx.setLineDash([7, 7]);
  ctx.lineWidth = 3;
  ctx.lineCap = "round";
  ctx.strokeStyle = av > 0.55 ? "rgba(255,197,49,.9)" : "rgba(255,160,150,.5)";
  ctx.globalAlpha = av > 0.35 ? 1 : 0.5;
  ctx.beginPath();
  ctx.moveTo(ball.owner.x, ball.owner.y);
  ctx.lineTo(you.x, you.y);
  ctx.stroke();
  ctx.restore();
}

function playerNumber(ctx: CanvasRenderingContext2D, x: number, y: number, num: number) {
  ctx.fillStyle = "#fff";
  ctx.font = "800 9px Nunito, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(String(num), x, y);
  ctx.textBaseline = "alphabetic";
}

function drawKeepers(ctx: CanvasRenderingContext2D, engine: GameEngine) {
  const { gkThem, gkUs } = engine;
  dot(ctx, gkThem.x, gkThem.y, 12, "#E0463B", "#5a120d", 2.5);
  dot(ctx, gkUs.x, gkUs.y, 12, "#2E6FE0", "#08285e", 2.5);
  playerNumber(ctx, gkThem.x, gkThem.y, gkThem.number);
  playerNumber(ctx, gkUs.x, gkUs.y, gkUs.number);
}

function drawOutfield(ctx: CanvasRenderingContext2D, engine: GameEngine) {
  for (const p of engine.opps) {
    dot(ctx, p.x, p.y, 12, "#E0463B", "#8E1F18", 2);
    arrow(ctx, p, 12, "rgba(142,31,24,.9)");
    playerNumber(ctx, p.x, p.y, p.number);
  }
  for (const p of engine.mates) {
    dot(ctx, p.x, p.y, 12, "#2E6FE0", "#0F3C8C", 2);
    arrow(ctx, p, 12, "rgba(15,60,140,.9)");
    playerNumber(ctx, p.x, p.y, p.number);
  }
}

function drawYou(ctx: CanvasRenderingContext2D, engine: GameEngine) {
  const { you } = engine;
  ctx.save();
  ctx.beginPath();
  ctx.arc(you.x, you.y, 18, 0, Math.PI * 2);
  ctx.lineWidth = 4;
  ctx.strokeStyle = "#FFC531";
  ctx.stroke();
  ctx.restore();

  dot(ctx, you.x, you.y, 14, "#2E6FE0", "#0F3C8C", 2.5);
  arrow(ctx, you, 18, "#FFC531");
  playerNumber(ctx, you.x, you.y, you.number);
}

function drawBall(ctx: CanvasRenderingContext2D, engine: GameEngine) {
  const { ball } = engine;
  dot(ctx, ball.x, ball.y, 6, "#fff", "#0F3C8C", 1.4);
}

function drawWingerZones(ctx: CanvasRenderingContext2D, engine: GameEngine) {
  const { wingerBounds } = engine;
  const pitchW = R - L;

  // LW zone (blue, left side)
  const lwX0 = L + pitchW * wingerBounds.lw.min;
  const lwX1 = L + pitchW * wingerBounds.lw.max;
  ctx.save();
  ctx.fillStyle = "rgba(46,111,224,.12)";
  ctx.fillRect(lwX0, TOP, lwX1 - lwX0, BOT - TOP);
  ctx.strokeStyle = "rgba(46,111,224,.5)";
  ctx.lineWidth = 2;
  ctx.setLineDash([6, 4]);
  ctx.strokeRect(lwX0, TOP, lwX1 - lwX0, BOT - TOP);
  // Inner edge handle (the draggable side)
  ctx.setLineDash([]);
  ctx.strokeStyle = "rgba(46,111,224,.85)";
  ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(lwX1, TOP + 20); ctx.lineTo(lwX1, BOT - 20); ctx.stroke();
  // Label
  ctx.fillStyle = "rgba(46,111,224,.8)";
  ctx.font = "bold 11px Nunito, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("#7 LW", (lwX0 + lwX1) / 2, TOP + 16);
  ctx.restore();

  // RW zone (blue, right side)
  const rwX0 = L + pitchW * wingerBounds.rw.min;
  const rwX1 = L + pitchW * wingerBounds.rw.max;
  ctx.save();
  ctx.fillStyle = "rgba(46,111,224,.12)";
  ctx.fillRect(rwX0, TOP, rwX1 - rwX0, BOT - TOP);
  ctx.strokeStyle = "rgba(46,111,224,.5)";
  ctx.lineWidth = 2;
  ctx.setLineDash([6, 4]);
  ctx.strokeRect(rwX0, TOP, rwX1 - rwX0, BOT - TOP);
  ctx.setLineDash([]);
  ctx.strokeStyle = "rgba(46,111,224,.85)";
  ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(rwX0, TOP + 20); ctx.lineTo(rwX0, BOT - 20); ctx.stroke();
  ctx.fillStyle = "rgba(46,111,224,.8)";
  ctx.font = "bold 11px Nunito, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("#11 RW", (rwX0 + rwX1) / 2, TOP + 16);
  ctx.restore();
}

// Hit-test for zone editor drag handles — returns which edge is being grabbed
export function hitTestZoneEdge(
  fieldX: number, fieldY: number,
  wingerBounds: { lw: { min: number; max: number }; rw: { min: number; max: number } },
): "lw-max" | "rw-min" | null {
  const pitchW = R - L;
  const lwInnerX = L + pitchW * wingerBounds.lw.max;
  const rwInnerX = L + pitchW * wingerBounds.rw.min;
  const threshold = 14;

  if (Math.abs(fieldX - lwInnerX) < threshold && fieldY > TOP && fieldY < BOT) return "lw-max";
  if (Math.abs(fieldX - rwInnerX) < threshold && fieldY > TOP && fieldY < BOT) return "rw-min";
  return null;
}

// Convert a field X position to a winger bound fraction
export function fieldXToBoundFx(fieldX: number): number {
  return Math.max(0.02, Math.min(0.98, (fieldX - L) / (R - L)));
}
