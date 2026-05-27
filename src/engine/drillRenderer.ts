import type { DrillEngine } from "./DrillEngine";
import type { Zone } from "@/types/game";
import { renderFrame } from "./renderer";

export function renderDrillFrame(ctx: CanvasRenderingContext2D, engine: DrillEngine) {
  renderFrame(ctx, engine);
  drawZones(ctx, engine);
  drawObjectiveHUD(ctx, engine);
}

function drawZones(ctx: CanvasRenderingContext2D, engine: DrillEngine) {
  const zones = engine.state.zones;
  for (const zone of zones) {
    ctx.save();

    // zone fill
    ctx.fillStyle = zone.type === "target"
      ? "rgba(255, 197, 49, 0.15)"
      : zone.type === "danger"
        ? "rgba(224, 70, 59, 0.15)"
        : "rgba(46, 111, 224, 0.15)";
    ctx.fillRect(zone.x, zone.y, zone.w, zone.h);

    // zone border (animated dash)
    ctx.strokeStyle = zone.type === "target"
      ? "rgba(255, 197, 49, 0.7)"
      : zone.type === "danger"
        ? "rgba(224, 70, 59, 0.7)"
        : "rgba(46, 111, 224, 0.7)";
    ctx.lineWidth = 2;
    ctx.setLineDash([8, 4]);
    ctx.strokeRect(zone.x, zone.y, zone.w, zone.h);

    // zone label
    if (zone.label) {
      ctx.fillStyle = zone.type === "target"
        ? "rgba(255, 197, 49, 0.9)"
        : "rgba(255, 255, 255, 0.8)";
      ctx.font = "700 10px Nunito, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(zone.label, zone.x + zone.w / 2, zone.y - 4);
    }

    ctx.restore();
  }
}

function drawObjectiveHUD(ctx: CanvasRenderingContext2D, engine: DrillEngine) {
  const state = engine.state;
  const entries = Object.entries(state.objectives);
  if (entries.length === 0) return;

  const y = 30;
  ctx.save();

  for (let i = 0; i < entries.length; i++) {
    const [id, current] = entries[i];
    const target = state.targets[id] || 1;
    const pct = Math.min(1, current / target);

    // background pill
    const pillW = 120;
    const pillH = 24;
    const pillX = engine.W / 2 - pillW / 2;
    const pillY = y + i * 30;

    ctx.fillStyle = "rgba(0, 0, 0, 0.45)";
    ctx.beginPath();
    ctx.roundRect(pillX, pillY, pillW, pillH, 12);
    ctx.fill();

    // progress bar
    ctx.fillStyle = pct >= 1 ? "rgba(67, 196, 110, 0.9)" : "rgba(255, 197, 49, 0.8)";
    ctx.beginPath();
    ctx.roundRect(pillX + 2, pillY + 2, Math.max(0, (pillW - 4) * pct), pillH - 4, 10);
    ctx.fill();

    // text
    ctx.fillStyle = "#fff";
    ctx.font = "800 11px Nunito, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(`${current} / ${target}`, pillX + pillW / 2, pillY + pillH / 2);
  }

  ctx.restore();
}
