// Canvas renderer for small-sided games. World = yards; the canvas shows the
// box plus a margin (room for bumpers). Pure drawing — no game state changes.
import type { SmallSidedEngine } from "./SmallSidedEngine";
import type { SsgPlayer } from "./types";

export const SSG_MARGIN = 2.8;     // yards of surround drawn around the box
export const SSG_CANVAS_W = 720;   // internal canvas width (px)

export const SSG_COLORS = {
  A: "#2E6FE0", Adark: "#0F3C8C",
  B: "#E0463B", Bdark: "#8E1F18",
  N: "#8B5CF6", Ndark: "#4C2A9E",
  bumper: "#F28C28", bumperDark: "#8A4A0C",
  you: "#FFC531",
};

export function ssgCanvasSize(boxW: number, boxH: number) {
  const vw = boxW + SSG_MARGIN * 2, vh = boxH + SSG_MARGIN * 2;
  const S = SSG_CANVAS_W / vw;
  return { w: SSG_CANVAS_W, h: Math.round(vh * S), S };
}

/** Canvas px → world yards (for taps). */
export function ssgToWorld(e: SmallSidedEngine, px: number, py: number) {
  const { S } = ssgCanvasSize(e.W, e.H);
  return { x: px / S - SSG_MARGIN, y: py / S - SSG_MARGIN };
}

export function renderSsg(ctx: CanvasRenderingContext2D, e: SmallSidedEngine) {
  const { w, h, S } = ssgCanvasSize(e.W, e.H);
  const X = (x: number) => (x + SSG_MARGIN) * S;
  const Y = (y: number) => (y + SSG_MARGIN) * S;
  ctx.clearRect(0, 0, w, h);

  // Surround + striped grass inside the box.
  ctx.fillStyle = "#226f3f";
  ctx.fillRect(0, 0, w, h);
  const bx = X(0), by = Y(0), bw = e.W * S, bh = e.H * S;
  const stripes = Math.max(4, Math.round(e.H / 3));
  for (let i = 0; i < stripes; i++) {
    ctx.fillStyle = i % 2 ? "#2F9354" : "#2B8A4E";
    ctx.fillRect(bx, by + (bh / stripes) * i, bw, bh / stripes + 1);
  }

  // Bumper lanes (outside the lines).
  for (const p of e.players) {
    if (!p.bumper || p.edge === undefined) continue;
    const ln = e.edgeLine(p.edge);
    ctx.save();
    ctx.strokeStyle = "rgba(242,140,40,.45)";
    ctx.lineWidth = Math.max(10, 1.1 * S);
    ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(X(ln.ax), Y(ln.ay)); ctx.lineTo(X(ln.bx), Y(ln.by)); ctx.stroke();
    ctx.restore();
  }

  // Box lines + cones at the corners.
  ctx.strokeStyle = "rgba(255,255,255,.92)";
  ctx.lineWidth = Math.max(2.5, 0.12 * S);
  ctx.strokeRect(bx, by, bw, bh);
  for (const [cx, cy] of [[0, 0], [e.W, 0], [e.W, e.H], [0, e.H]]) cone(ctx, X(cx), Y(cy), Math.max(7, 0.35 * S));

  const pr = Math.min(24, Math.max(13, 0.78 * S));

  // Aim line: who the Pass button would hit.
  const aim = e.aimTarget();
  if (aim && e.canPass) {
    ctx.save();
    ctx.setLineDash([10, 8]);
    ctx.strokeStyle = "rgba(255,255,255,.75)";
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(X(e.user.x), Y(e.user.y)); ctx.lineTo(X(aim.x), Y(aim.y)); ctx.stroke();
    ctx.setLineDash([]);
    ctx.strokeStyle = "rgba(255,255,255,.9)";
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(X(aim.x), Y(aim.y), pr + 7, 0, Math.PI * 2); ctx.stroke();
    ctx.restore();
  }

  // Players (you last so you're always on top).
  const order = [...e.players].sort((a, b) => Number(a.isUser) - Number(b.isUser));
  for (const p of order) drawPlayer(ctx, e, p, X(p.x), Y(p.y), pr);

  // Ball.
  const br = Math.max(6, 0.32 * S);
  ctx.fillStyle = "rgba(0,0,0,.25)";
  ctx.beginPath(); ctx.ellipse(X(e.ball.x) + 2, Y(e.ball.y) + 3, br, br * 0.8, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#fff";
  ctx.strokeStyle = "#16241c";
  ctx.lineWidth = 1.6;
  ctx.beginPath(); ctx.arc(X(e.ball.x), Y(e.ball.y), br, 0, Math.PI * 2); ctx.fill(); ctx.stroke();

  // 3-2-1
  if (e.countdown > 0) {
    const n = Math.ceil(e.countdown / 60);
    ctx.save();
    ctx.fillStyle = "rgba(11,40,22,.35)";
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = "#fff";
    ctx.font = `700 ${Math.round(w * 0.2)}px Fredoka, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(String(n), w / 2, h / 2);
    ctx.restore();
  }
}

function cone(ctx: CanvasRenderingContext2D, x: number, y: number, r: number) {
  ctx.fillStyle = "#FF8A1F";
  ctx.strokeStyle = "#a34d00";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(x, y - r); ctx.lineTo(x + r * 0.85, y + r * 0.6); ctx.lineTo(x - r * 0.85, y + r * 0.6); ctx.closePath();
  ctx.fill(); ctx.stroke();
}

function drawPlayer(ctx: CanvasRenderingContext2D, e: SmallSidedEngine, p: SsgPlayer, x: number, y: number, r: number) {
  const c = SSG_COLORS;
  const [fill, dark] = p.bumper ? [c.bumper, c.bumperDark] : p.side === "A" ? [c.A, c.Adark] : p.side === "B" ? [c.B, c.Bdark] : [c.N, c.Ndark];
  // shadow
  ctx.fillStyle = "rgba(0,0,0,.22)";
  ctx.beginPath(); ctx.ellipse(x + 2, y + 4, r, r * 0.8, 0, 0, Math.PI * 2); ctx.fill();
  // you: gold ring (+ touch-limit timer arc)
  if (p.isUser) {
    ctx.strokeStyle = c.you;
    ctx.lineWidth = 4;
    ctx.beginPath(); ctx.arc(x, y, r + 6, 0, Math.PI * 2); ctx.stroke();
    const left = e.userTouchLeft;
    if (left !== null) {
      ctx.strokeStyle = left > 0.5 ? "#7CF29A" : left > 0.25 ? "#FFD84D" : "#FF5A4E";
      ctx.lineWidth = 5;
      ctx.beginPath(); ctx.arc(x, y, r + 11, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * left); ctx.stroke();
    }
  }
  // "call for it" pulse on you
  if (p.isUser && e.callFrames > 0) {
    ctx.strokeStyle = `rgba(255,255,255,${(e.callFrames % 30) / 30})`;
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(x, y, r + 14 + (30 - (e.callFrames % 30)) * 0.5, 0, Math.PI * 2); ctx.stroke();
  }
  // body
  ctx.fillStyle = fill;
  ctx.strokeStyle = dark;
  ctx.lineWidth = 2.5;
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  // facing tick
  const a = p.face;
  ctx.strokeStyle = p.isUser ? c.you : "rgba(255,255,255,.85)";
  ctx.lineWidth = 3;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(x + Math.cos(a) * (r + 2), y + Math.sin(a) * (r + 2));
  ctx.lineTo(x + Math.cos(a) * (r + 8), y + Math.sin(a) * (r + 8));
  ctx.stroke();
  // number
  ctx.fillStyle = "#fff";
  ctx.font = `700 ${Math.round(r * 0.95)}px Fredoka, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(p.bumper ? "B" : p.side === "N" ? "N" : String(p.number), x, y + 1);
}
