// Render Soccer IQ Lab store art (icon + feature graphic) from SVG via sharp.
import sharp from "sharp";
import { mkdirSync } from "fs";

const OUT = "/root/soccer-iq-lab-mobile/store-assets/";
mkdirSync(OUT, { recursive: true });

// --- soccer ball, reusable group (drawn around a given cx,cy,r) ---
const ball = (cx, cy, r) => {
  const k = r / 150;
  const p = (x, y) => `${cx + (x - 256) * k},${cy + (y - 256) * k}`;
  return `
    <circle cx="${cx}" cy="${cy}" r="${r}" fill="url(#ball)" stroke="#16241c" stroke-width="${6 * k}"/>
    <polygon points="${p(256,196)} ${p(298,227)} ${p(282,277)} ${p(230,277)} ${p(214,227)}" fill="#16241c"/>
    <g stroke="#16241c" stroke-width="${9 * k}" stroke-linecap="round">
      <line x1="${p(256,196).split(",")[0]}" y1="${p(256,196).split(",")[1]}" x2="${p(256,120).split(",")[0]}" y2="${p(256,120).split(",")[1]}"/>
      <line x1="${p(298,227).split(",")[0]}" y1="${p(298,227).split(",")[1]}" x2="${p(372,200).split(",")[0]}" y2="${p(372,200).split(",")[1]}"/>
      <line x1="${p(282,277).split(",")[0]}" y1="${p(282,277).split(",")[1]}" x2="${p(330,345).split(",")[0]}" y2="${p(330,345).split(",")[1]}"/>
      <line x1="${p(230,277).split(",")[0]}" y1="${p(230,277).split(",")[1]}" x2="${p(182,345).split(",")[0]}" y2="${p(182,345).split(",")[1]}"/>
      <line x1="${p(214,227).split(",")[0]}" y1="${p(214,227).split(",")[1]}" x2="${p(140,200).split(",")[0]}" y2="${p(140,200).split(",")[1]}"/>
    </g>`;
};

const defs = `
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#43c46e"/><stop offset="1" stop-color="#1F6E3D"/>
    </linearGradient>
    <radialGradient id="ball" cx="40%" cy="35%" r="75%">
      <stop offset="0" stop-color="#ffffff"/><stop offset="1" stop-color="#e8efe9"/>
    </radialGradient>
  </defs>`;

// --- ICON 512 ---
const iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512">
  ${defs}
  <rect width="512" height="512" rx="112" fill="url(#bg)"/>
  ${ball(256, 256, 150)}
</svg>`;
await sharp(Buffer.from(iconSvg)).png().toFile(OUT + "icon-512.png");
await sharp(Buffer.from(iconSvg)).resize(1024, 1024).png().toFile(OUT + "icon-1024.png");

// --- FEATURE GRAPHIC 1024x500 ---
const feat = `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="500">
  ${defs}
  <rect width="1024" height="500" fill="url(#bg)"/>
  <!-- subtle pitch lines -->
  <g stroke="#ffffff" stroke-opacity="0.08" stroke-width="3" fill="none">
    <circle cx="512" cy="250" r="120"/>
    <line x1="512" y1="0" x2="512" y2="500"/>
    <rect x="0" y="150" width="90" height="200"/>
    <rect x="934" y="150" width="90" height="200"/>
  </g>
  ${ball(180, 250, 120)}
  <text x="360" y="225" font-family="DejaVu Sans" font-weight="bold" font-size="78" fill="#ffffff">Soccer IQ Lab</text>
  <text x="362" y="290" font-family="DejaVu Sans" font-weight="bold" font-size="34" fill="#d8f0e0">Train your soccer brain</text>
</svg>`;
await sharp(Buffer.from(feat)).png().toFile(OUT + "feature-graphic-1024x500.png");

console.log("Built:", ["icon-512.png", "icon-1024.png", "feature-graphic-1024x500.png"].join(", "));
