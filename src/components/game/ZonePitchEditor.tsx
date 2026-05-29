"use client";
import { useRef, useEffect, useCallback } from "react";
import { W, H, L, R, TOP, BOT, ZONE_COLORS, JERSEY_NUMBERS } from "@/engine/constants";
import {
  renderStaticPitch, screenXToFrac, screenYToDepth,
  ruleScreenRect, hitTestRuleBox, handleCursor,
  type DraftRect, type Handle,
} from "@/engine/staticPitch";
import type { ZoneRule, ZoneCondition } from "@/types/game";

export interface DrawTemplate {
  team: "us" | "them";
  role: string;
  when: ZoneCondition;
  carrierTeam: "us" | "them";
  carrierRole: string;
}

interface Props {
  format: string;
  rules: ZoneRule[];
  selectedId: string | null;
  template: DrawTemplate;
  onAddRule: (rule: ZoneRule) => void;
  onUpdateRule: (id: string, patch: Partial<ZoneRule>) => void;
  onSelectRule: (id: string | null) => void;
  onEndEdit?: () => void;
}

const MIN_PX = 18;

export function ZonePitchEditor({ format, rules, selectedId, template, onAddRule, onUpdateRule, onSelectRule, onEndEdit }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const draftRef = useRef<DraftRect | null>(null);
  const drawingRef = useRef(false);
  // Active resize/move gesture on an existing rule.
  const editRef = useRef<{ id: string; handle: Handle; startX: number; startY: number; orig: ZoneRule } | null>(null);

  // Live mirrors so bound listeners always see current props.
  const rulesRef = useRef(rules);
  const templateRef = useRef(template);
  const formatRef = useRef(format);
  const selectedRef = useRef(selectedId);
  rulesRef.current = rules;
  templateRef.current = template;
  formatRef.current = format;
  selectedRef.current = selectedId;

  const label = `${template.team === "us" ? "Blue" : "Red"} #${JERSEY_NUMBERS[template.role] ?? "?"}`;

  const paint = useCallback(() => {
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    const t = templateRef.current;
    renderStaticPitch(ctx, {
      format: formatRef.current,
      rules: rulesRef.current,
      selectedId: selectedRef.current,
      draft: draftRef.current,
      draftTeam: t.team,
      draftLabel: `${t.team === "us" ? "Blue" : "Red"} #${JERSEY_NUMBERS[t.role] ?? "?"}`,
      highlightRole: t.role,
      highlightTeam: t.team,
    });
  }, []);

  useEffect(() => { paint(); }, [paint, format, rules, selectedId, template]);

  const toField = useCallback((e: MouseEvent | TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const r = canvas.getBoundingClientRect();
    const cx = "touches" in e ? e.touches[0]?.clientX ?? 0 : e.clientX;
    const cy = "touches" in e ? e.touches[0]?.clientY ?? 0 : e.clientY;
    return { x: ((cx - r.left) / r.width) * W, y: ((cy - r.top) / r.height) * H };
  }, []);

  // Convert a (possibly mutated) screen rect back into a rule's fractional bounds.
  const rectToBounds = useCallback((team: "us" | "them", x0: number, x1: number, yLo: number, yHi: number) => {
    const xMin = screenXToFrac(Math.min(x0, x1));
    const xMax = screenXToFrac(Math.max(x0, x1));
    const dA = screenYToDepth(team, yLo);
    const dB = screenYToDepth(team, yHi);
    return { xMin, xMax, yMin: Math.min(dA, dB), yMax: Math.max(dA, dB) };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const onDown = (e: MouseEvent | TouchEvent) => {
      const p = toField(e);
      if (!p) return;

      // 1) If the selected rule's box is grabbed by an edge/corner/body, edit it.
      const sel = rulesRef.current.find((r) => r.id === selectedRef.current);
      if (sel) {
        const h = hitTestRuleBox(sel, p.x, p.y);
        if (h) {
          editRef.current = { id: sel.id, handle: h, startX: p.x, startY: p.y, orig: { ...sel } };
          canvas.classList.add("grabbing");
          e.preventDefault();
          return;
        }
      }

      // 2) Clicking any other box selects it (and starts a move).
      // Search topmost-first so later (visually on top) boxes win.
      for (let i = rulesRef.current.length - 1; i >= 0; i--) {
        const r = rulesRef.current[i];
        const h = hitTestRuleBox(r, p.x, p.y);
        if (h) {
          onSelectRule(r.id);
          editRef.current = { id: r.id, handle: h, startX: p.x, startY: p.y, orig: { ...r } };
          canvas.classList.add("grabbing");
          e.preventDefault();
          return;
        }
      }

      // 3) Empty space → start drawing a new box.
      drawingRef.current = true;
      draftRef.current = { x0: p.x, y0: p.y, x1: p.x, y1: p.y };
      canvas.classList.add("grabbing");
      e.preventDefault();
      paint();
    };

    const onMove = (e: MouseEvent | TouchEvent) => {
      const p = toField(e);
      if (!p) return;

      // Resize / move an existing rule.
      const ed = editRef.current;
      if (ed) {
        const { x0, x1, yLo, yHi } = ruleScreenRect(ed.orig);
        let nx0 = x0, nx1 = x1, nyLo = yLo, nyHi = yHi;
        const dx = p.x - ed.startX;
        const dy = p.y - ed.startY;
        const hnd = ed.handle;
        if (hnd === "move") {
          nx0 = x0 + dx; nx1 = x1 + dx; nyLo = yLo + dy; nyHi = yHi + dy;
          // keep inside pitch
          const wBox = nx1 - nx0, hBox = nyHi - nyLo;
          nx0 = Math.max(L, Math.min(R - wBox, nx0)); nx1 = nx0 + wBox;
          nyLo = Math.max(TOP, Math.min(BOT - hBox, nyLo)); nyHi = nyLo + hBox;
        } else {
          if (hnd.includes("w")) nx0 = Math.min(x1 - MIN_PX, x0 + dx);
          if (hnd.includes("e")) nx1 = Math.max(x0 + MIN_PX, x1 + dx);
          if (hnd.includes("n")) nyLo = Math.min(yHi - MIN_PX, yLo + dy);
          if (hnd.includes("s")) nyHi = Math.max(yLo + MIN_PX, yHi + dy);
          nx0 = Math.max(L, nx0); nx1 = Math.min(R, nx1);
          nyLo = Math.max(TOP, nyLo); nyHi = Math.min(BOT, nyHi);
        }
        onUpdateRule(ed.id, rectToBounds(ed.orig.team, nx0, nx1, nyLo, nyHi));
        e.preventDefault();
        return;
      }

      // Sketching a new box.
      if (drawingRef.current) {
        draftRef.current = { ...draftRef.current!, x1: p.x, y1: p.y };
        e.preventDefault();
        paint();
        return;
      }

      // Hover cursor feedback over the selected box.
      const sel = rulesRef.current.find((r) => r.id === selectedRef.current);
      const h = sel ? hitTestRuleBox(sel, p.x, p.y) : null;
      canvas.style.cursor = handleCursor(h);
    };

    const onUp = () => {
      canvas.classList.remove("grabbing");
      if (editRef.current) { editRef.current = null; onEndEdit?.(); return; }
      if (!drawingRef.current) return;
      drawingRef.current = false;
      const d = draftRef.current;
      draftRef.current = null;
      if (!d) { paint(); return; }

      const sxMin = Math.min(d.x0, d.x1), sxMax = Math.max(d.x0, d.x1);
      const syMin = Math.min(d.y0, d.y1), syMax = Math.max(d.y0, d.y1);
      if (sxMax - sxMin < MIN_PX || syMax - syMin < MIN_PX) { paint(); return; }

      const t = templateRef.current;
      const b = rectToBounds(t.team, sxMin, sxMax, syMin, syMax);
      const rule: ZoneRule = {
        id: crypto.randomUUID(),
        team: t.team,
        role: t.role,
        ...b,
        label: `${t.team === "us" ? "Blue" : "Red"} #${JERSEY_NUMBERS[t.role] ?? "?"}`,
        color: ZONE_COLORS[t.team],
        when: t.when === "always" ? undefined : t.when,
        carrierTeam: t.when === "carrier_is" ? t.carrierTeam : undefined,
        carrierRole: t.when === "carrier_is" ? t.carrierRole : undefined,
      };
      onAddRule(rule);
    };

    canvas.addEventListener("mousedown", onDown);
    canvas.addEventListener("touchstart", onDown, { passive: false });
    window.addEventListener("mousemove", onMove);
    window.addEventListener("touchmove", onMove, { passive: false });
    window.addEventListener("mouseup", onUp);
    window.addEventListener("touchend", onUp);
    return () => {
      canvas.removeEventListener("mousedown", onDown);
      canvas.removeEventListener("touchstart", onDown);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("touchmove", onMove);
      window.removeEventListener("mouseup", onUp);
      window.removeEventListener("touchend", onUp);
    };
  }, [toField, paint, rectToBounds, onAddRule, onUpdateRule, onSelectRule, onEndEdit]);

  return (
    <div className="rounded-xl overflow-hidden border-2 border-[rgba(20,60,35,.12)]">
      <canvas
        ref={canvasRef}
        width={W}
        height={H}
        className="block w-full h-auto touch-none cursor-crosshair"
      />
      <p className="text-[10px] font-bold text-[#5d6f63] bg-[#f3f7f2] px-2 py-1.5 text-center">
        Drag empty space to draw <span className="font-extrabold">{label}</span>&apos;s zone
        {template.when !== "always" ? " (conditional)" : ""} · click a box to select, drag its edges to resize
      </p>
    </div>
  );
}
