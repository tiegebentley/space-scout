// Shared, clearly-distinguishable goals for the portrait boards (AuthorBoard,
// ScenarioBoard, FormationPreview). Drawn inside the portrait viewBox so they're
// always visible: each goal is a bold colored crossbar on the goal line plus a
// shallow net-hatch band just inside the pitch, with white posts.
import { VIEW_W, VIEW_H } from "./boardTransform";

const GOAL_HALF = 95;   // half-width of the goal mouth (screen units)
const NET_DEPTH = 22;   // depth of the net band drawn inside the pitch

export function BoardGoals() {
  const cx = VIEW_W / 2;
  const x0 = cx - GOAL_HALF;
  const w = GOAL_HALF * 2;
  return (
    <g pointerEvents="none">
      <defs>
        <pattern id="goalnet" width="9" height="9" patternUnits="userSpaceOnUse">
          <path d="M0 0 L9 9 M9 0 L0 9" stroke="rgba(255,255,255,.45)" strokeWidth="1" />
        </pattern>
      </defs>

      {/* TOP goal (opponent's — red crossbar) */}
      <rect x={x0} y={8} width={w} height={NET_DEPTH} fill="url(#goalnet)" stroke="#fff" strokeWidth={2} />
      <line x1={x0} y1={9} x2={x0 + w} y2={9} stroke="#E0463B" strokeWidth={7} strokeLinecap="round" />
      <line x1={x0} y1={9} x2={x0} y2={9 + NET_DEPTH} stroke="#fff" strokeWidth={3} />
      <line x1={x0 + w} y1={9} x2={x0 + w} y2={9 + NET_DEPTH} stroke="#fff" strokeWidth={3} />

      {/* BOTTOM goal (yours — blue crossbar) */}
      <rect x={x0} y={VIEW_H - 8 - NET_DEPTH} width={w} height={NET_DEPTH} fill="url(#goalnet)" stroke="#fff" strokeWidth={2} />
      <line x1={x0} y1={VIEW_H - 9} x2={x0 + w} y2={VIEW_H - 9} stroke="#2E6FE0" strokeWidth={7} strokeLinecap="round" />
      <line x1={x0} y1={VIEW_H - 9 - NET_DEPTH} x2={x0} y2={VIEW_H - 9} stroke="#fff" strokeWidth={3} />
      <line x1={x0 + w} y1={VIEW_H - 9 - NET_DEPTH} x2={x0 + w} y2={VIEW_H - 9} stroke="#fff" strokeWidth={3} />
    </g>
  );
}
