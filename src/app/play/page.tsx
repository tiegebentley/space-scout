"use client";
import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import { MatchView } from "@/components/game/MatchView";
import { ZonePitchEditor } from "@/components/game/ZonePitchEditor";
import { useGameStore } from "@/stores/gameStore";
import Link from "next/link";
import { clsx } from "clsx";
import { FORMATIONS, DEFAULT_USER_ROLE, JERSEY_NUMBERS } from "@/engine/constants";
import { ALL_TACTICS } from "@/engine/tactics/presets";
import type { ZoneRule, RulePreset, ZoneCondition } from "@/types/game";

const FORMATS = [
  { id: "3v3" as const, label: "3v3", desc: "Fast & tight, great for learning" },
  { id: "5v5" as const, label: "5v5", desc: "The sweet spot for tactical training" },
  { id: "7v7" as const, label: "7v7", desc: "More players, bigger decisions" },
];

const DURATIONS = [
  { ms: 120000, label: "2:00" },
  { ms: 180000, label: "3:00" },
  { ms: 300000, label: "5:00" },
];

const ROLE_LABELS: Record<string, string> = {
  hold: "Holding Mid (6)",
  lw: "Left Wing (7)",
  rw: "Right Wing (11)",
  fwd: "Forward (9)",
  lcm: "Left CM (8)",
  rcm: "Right CM (10)",
};

const ZONE_COLORS: Record<string, string> = {
  us: "rgb(46,111,224)",
  them: "rgb(224,70,59)",
};

const BUILTIN_PRESETS: RulePreset[] = [
  {
    id: "stay-wide",
    name: "Stay Wide",
    description: "Wingers locked to their sidelines — teaches width in attack",
    builtin: true,
    rules: [
      { team: "us", role: "lw", xMin: 0.0, xMax: 0.30, yMin: 0.10, yMax: 0.90, label: "Blue LW", color: ZONE_COLORS.us },
      { team: "us", role: "rw", xMin: 0.70, xMax: 1.0, yMin: 0.10, yMax: 0.90, label: "Blue RW", color: ZONE_COLORS.us },
      { team: "them", role: "lw", xMin: 0.0, xMax: 0.30, yMin: 0.10, yMax: 0.90, label: "Red LW", color: ZONE_COLORS.them },
      { team: "them", role: "rw", xMin: 0.70, xMax: 1.0, yMin: 0.10, yMax: 0.90, label: "Red RW", color: ZONE_COLORS.them },
    ],
  },
  {
    id: "thirds-lock",
    name: "Thirds Lock",
    description: "Each line stays in their third — teaches shape and spacing",
    builtin: true,
    rules: [
      { team: "us", role: "hold", xMin: 0.10, xMax: 0.90, yMin: 0.0, yMax: 0.38, label: "Blue #6 zone", color: ZONE_COLORS.us },
      { team: "us", role: "fwd", xMin: 0.15, xMax: 0.85, yMin: 0.55, yMax: 1.0, label: "Blue #9 zone", color: ZONE_COLORS.us },
      { team: "them", role: "hold", xMin: 0.10, xMax: 0.90, yMin: 0.0, yMax: 0.38, label: "Red #6 zone", color: ZONE_COLORS.them },
      { team: "them", role: "fwd", xMin: 0.15, xMax: 0.85, yMin: 0.55, yMax: 1.0, label: "Red #9 zone", color: ZONE_COLORS.them },
    ],
  },
  {
    id: "half-field",
    name: "Half-Field Only",
    description: "Both teams locked to their own half — great for positional play drills",
    builtin: true,
    rules: [
      { team: "us", role: "hold", xMin: 0.0, xMax: 1.0, yMin: 0.0, yMax: 0.52, label: "Blue #6", color: ZONE_COLORS.us },
      { team: "us", role: "lw", xMin: 0.0, xMax: 1.0, yMin: 0.0, yMax: 0.52, label: "Blue LW", color: ZONE_COLORS.us },
      { team: "us", role: "rw", xMin: 0.0, xMax: 1.0, yMin: 0.0, yMax: 0.52, label: "Blue RW", color: ZONE_COLORS.us },
      { team: "them", role: "hold", xMin: 0.0, xMax: 1.0, yMin: 0.0, yMax: 0.52, label: "Red #6", color: ZONE_COLORS.them },
      { team: "them", role: "lw", xMin: 0.0, xMax: 1.0, yMin: 0.0, yMax: 0.52, label: "Red LW", color: ZONE_COLORS.them },
      { team: "them", role: "rw", xMin: 0.0, xMax: 1.0, yMin: 0.0, yMax: 0.52, label: "Red RW", color: ZONE_COLORS.them },
    ],
  },
  {
    id: "compact-shape",
    name: "Compact Shape",
    description: "Everyone stays narrow — teaches compact defending and central overloads",
    builtin: true,
    rules: [
      { team: "us", role: "lw", xMin: 0.15, xMax: 0.55, yMin: 0.10, yMax: 0.90, label: "Blue LW", color: ZONE_COLORS.us },
      { team: "us", role: "rw", xMin: 0.45, xMax: 0.85, yMin: 0.10, yMax: 0.90, label: "Blue RW", color: ZONE_COLORS.us },
      { team: "them", role: "lw", xMin: 0.15, xMax: 0.55, yMin: 0.10, yMax: 0.90, label: "Red LW", color: ZONE_COLORS.them },
      { team: "them", role: "rw", xMin: 0.45, xMax: 0.85, yMin: 0.10, yMax: 0.90, label: "Red RW", color: ZONE_COLORS.them },
    ],
  },
  {
    id: "push-and-recover",
    name: "Push & Recover (conditional)",
    description: "#6 pushes up when WE attack, drops deep when they have it — two zones, one player",
    builtin: true,
    rules: [
      // Same player (#6), two layers that swap based on possession.
      { team: "us", role: "hold", xMin: 0.20, xMax: 0.80, yMin: 0.40, yMax: 0.75, label: "Blue #6 high", color: ZONE_COLORS.us, when: "attacking" },
      { team: "us", role: "hold", xMin: 0.15, xMax: 0.85, yMin: 0.0, yMax: 0.35, label: "Blue #6 deep", color: ZONE_COLORS.us, when: "defending" },
      // #9 holds the line when attacking, recovers to midfield when defending.
      { team: "us", role: "fwd", xMin: 0.20, xMax: 0.80, yMin: 0.60, yMax: 1.0, label: "Blue #9 line", color: ZONE_COLORS.us, when: "attacking" },
      { team: "us", role: "fwd", xMin: 0.25, xMax: 0.75, yMin: 0.35, yMax: 0.70, label: "Blue #9 recover", color: ZONE_COLORS.us, when: "defending" },
    ],
  },
];

function hydrateRules(rules: Omit<ZoneRule, "id">[]): ZoneRule[] {
  return rules.map((r) => ({ ...r, id: crypto.randomUUID() }));
}

export default function PlayPage() {
  const [selecting, setSelecting] = useState(true);
  const [zoneRules, setZoneRules] = useState<ZoneRule[]>([]);
  // Undo/redo history for zone edits. Each entry is a full snapshot of zoneRules.
  // Kept as one object so the stack + pointer move atomically. Continuous edits
  // (slider/pitch drags) are coalesced via `coalesceKey` so a whole drag
  // collapses into one undo step instead of one per pixel.
  const [hist, setHist] = useState<{ stack: ZoneRule[][]; index: number }>({ stack: [[]], index: 0 });
  const coalesceKey = useRef<string | null>(null);
  const [selectedPresetId, setSelectedPresetId] = useState<string>("none");
  const [zonesOpen, setZonesOpen] = useState(false);
  const [saveName, setSaveName] = useState("");
  const [justSaved, setJustSaved] = useState(false);
  const [namingNew, setNamingNew] = useState(false);
  // Which SAVED custom preset the current zones came from. Survives edits (unlike
  // selectedPresetId, which flips to "custom" on every change) so the top Save
  // button can offer "Update <that preset>". Null = these zones aren't tied to a
  // saved custom preset (free-draw or edited built-in → must save as new).
  const [sourcePresetId, setSourcePresetId] = useState<string | null>(null);
  const [selectedRuleId, setSelectedRuleId] = useState<string | null>(null);
  const savedFlashRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Draw tool: what the next box drawn on the pitch applies to.
  const [drawTeam, setDrawTeam] = useState<"us" | "them">("us");
  const [drawRole, setDrawRole] = useState<string>("");
  const [drawWhen, setDrawWhen] = useState<ZoneCondition>("always");
  const [drawCarrierTeam, setDrawCarrierTeam] = useState<"us" | "them">("them");
  const [drawCarrierRole, setDrawCarrierRole] = useState<string>("");
  const setMatchConfig = useGameStore((s) => s.setMatchConfig);
  const matchConfig = useGameStore((s) => s.matchConfig);
  const customPresets = useGameStore((s) => s.customPresets);
  const savePreset = useGameStore((s) => s.savePreset);
  const deletePreset = useGameStore((s) => s.deletePreset);

  const currentFormat = matchConfig.format;
  const formation = FORMATIONS[currentFormat] || FORMATIONS["5v5"];
  const roleKeys = Object.keys(formation);
  const selectedRole = matchConfig.userRole || DEFAULT_USER_ROLE[currentFormat] || roleKeys[0];

  const allPresets = useMemo(
    () => [...BUILTIN_PRESETS, ...customPresets],
    [customPresets]
  );

  // Apply a new zoneRules state and record it in history.
  //  - `key === null` (default): a discrete edit → always its own undo step.
  //  - `key === <string>`: a continuous edit → consecutive commits sharing the
  //    same key replace the top history entry (coalesce) so a drag = one step.
  const commit = useCallback((updater: ZoneRule[] | ((prev: ZoneRule[]) => ZoneRule[]), key: string | null = null) => {
    setZoneRules((prev) => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      const coalesce = key !== null && coalesceKey.current === key;
      setHist((h) => {
        if (coalesce) {
          // Replace the current top entry — stays the same undo step.
          const stack = h.stack.slice(0, h.index + 1);
          stack[h.index] = next;
          return { stack, index: h.index };
        }
        // New discrete step: drop any redo tail, push, advance pointer.
        const stack = h.stack.slice(0, h.index + 1);
        stack.push(next);
        return { stack, index: stack.length - 1 };
      });
      coalesceKey.current = key;
      return next;
    });
  }, []);

  const canUndo = hist.index > 0;
  const canRedo = hist.index < hist.stack.length - 1;

  const undo = useCallback(() => {
    setHist((h) => {
      if (h.index <= 0) return h;
      const ni = h.index - 1;
      setZoneRules(h.stack[ni]);
      coalesceKey.current = null;
      setSelectedPresetId("custom");
      return { ...h, index: ni };
    });
  }, []);

  const redo = useCallback(() => {
    setHist((h) => {
      if (h.index >= h.stack.length - 1) return h;
      const ni = h.index + 1;
      setZoneRules(h.stack[ni]);
      coalesceKey.current = null;
      setSelectedPresetId("custom");
      return { ...h, index: ni };
    });
  }, []);

  const selectPreset = useCallback((presetId: string) => {
    setSelectedPresetId(presetId);
    setSelectedRuleId(null);
    setNamingNew(false);
    setSaveName("");
    // Only custom presets can be updated in place; built-ins/"none" can't.
    setSourcePresetId(customPresets.some((p) => p.id === presetId) ? presetId : null);
    if (presetId === "none") {
      commit([]);
      return;
    }
    const preset = [...BUILTIN_PRESETS, ...customPresets].find((p) => p.id === presetId);
    if (preset) {
      commit(hydrateRules(preset.rules));
      setZonesOpen(true);
    }
  }, [customPresets, commit]);

  const flashSaved = useCallback(() => {
    setJustSaved(true);
    if (savedFlashRef.current) clearTimeout(savedFlashRef.current);
    savedFlashRef.current = setTimeout(() => setJustSaved(false), 1800);
  }, []);

  // The saved custom preset the current zones came from, if any — tracked via
  // sourcePresetId so it survives edits (selectedPresetId flips to "custom" on
  // every change). Built-ins / free-draw → undefined → save as a NEW preset.
  const editingCustomPreset = useMemo(
    () => customPresets.find((p) => p.id === sourcePresetId),
    [customPresets, sourcePresetId]
  );

  // Save a brand-new named preset from the current zones.
  const handleSavePreset = useCallback(() => {
    const name = saveName.trim();
    if (!name || zoneRules.length === 0) return;
    const preset: RulePreset = {
      id: crypto.randomUUID(),
      name,
      description: `${zoneRules.length} rule${zoneRules.length > 1 ? "s" : ""} — custom`,
      rules: zoneRules.map(({ id, ...rest }) => rest),
    };
    savePreset(preset);
    setSelectedPresetId(preset.id);
    setSourcePresetId(preset.id); // now editing this saved preset → future saves Update it
    setSaveName("");
    setNamingNew(false);
    flashSaved();
  }, [saveName, zoneRules, savePreset, flashSaved]);

  // Top-bar Save button. Updates the current custom preset in place if we're
  // editing one; otherwise opens the name field to save a new preset.
  const handleSave = useCallback(() => {
    if (zoneRules.length === 0) return;
    if (editingCustomPreset) {
      savePreset({
        ...editingCustomPreset,
        description: `${zoneRules.length} rule${zoneRules.length > 1 ? "s" : ""} — custom`,
        rules: zoneRules.map(({ id, ...rest }) => rest),
      });
      setSelectedPresetId(editingCustomPreset.id); // stay on the saved preset
      setSourcePresetId(editingCustomPreset.id);
      flashSaved();
    } else {
      // New (or edited built-in / free-draw) → needs a name.
      setNamingNew(true);
      setZonesOpen(true);
    }
  }, [zoneRules, editingCustomPreset, savePreset, flashSaved]);

  const addZoneRule = useCallback((team: "us" | "them") => {
    const defaultRole = roleKeys[0];
    const rule: ZoneRule = {
      id: crypto.randomUUID(),
      team,
      role: defaultRole,
      xMin: 0.05,
      xMax: 0.95,
      yMin: 0.05,
      yMax: 0.95,
      label: `${team === "us" ? "Blue" : "Red"} ${ROLE_LABELS[defaultRole] || defaultRole}`,
      color: ZONE_COLORS[team],
    };
    commit((prev) => [...prev, rule]);
    setSelectedPresetId("custom");
    setSelectedRuleId(rule.id);
    setZonesOpen(true); // reveal the rule list so the new row is editable
  }, [roleKeys, commit]);

  // A box was drawn on the static pitch — same shape as a slider-built rule, so
  // it drops straight into the shared list and shows up in the editor below.
  const handleDrawnRule = useCallback((rule: ZoneRule) => {
    commit((prev) => [...prev, rule]);
    setSelectedPresetId("custom");
    setSelectedRuleId(rule.id);
    setZonesOpen(true);
  }, [commit]);

  // Keyboard undo/redo on the setup screen.
  useEffect(() => {
    if (!selecting) return;
    const onKey = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey) || e.key.toLowerCase() !== "z") return;
      // Don't hijack undo while typing in the preset-name field etc.
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA")) return;
      e.preventDefault();
      if (e.shiftKey) redo();
      else undo();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selecting, undo, redo]);

  // Keep the draw-tool role pickers valid for the current format.
  useEffect(() => {
    const outfield = roleKeys.filter((k) => k !== "gk");
    if (!outfield.includes(drawRole)) setDrawRole(selectedRole && outfield.includes(selectedRole) ? selectedRole : outfield[0]);
    if (!outfield.includes(drawCarrierRole)) setDrawCarrierRole(outfield[0]);
  }, [roleKeys, drawRole, drawCarrierRole, selectedRole]);

  const updateZoneRule = useCallback((id: string, patch: Partial<ZoneRule>) => {
    // Coalesce key = which rule + which fields. A slider drag or pitch resize
    // fires the same shape repeatedly → collapses into one undo step. Changing
    // slider/field starts a new step.
    const key = `${id}:${Object.keys(patch).sort().join(",")}`;
    commit(
      (prev) =>
        prev.map((r) => {
          if (r.id !== id) return r;
          const updated = { ...r, ...patch };
          if (patch.role || patch.team) {
            updated.label = `${updated.team === "us" ? "Blue" : "Red"} ${ROLE_LABELS[updated.role] || updated.role}`;
            updated.color = ZONE_COLORS[updated.team];
          }
          return updated;
        }),
      key
    );
    setSelectedPresetId("custom");
  }, [commit]);

  // Marks the end of a continuous gesture (drag/slide) so the next one starts a
  // fresh undo step rather than coalescing into the previous one.
  const endEdit = useCallback(() => {
    coalesceKey.current = null;
  }, []);

  // Select a rule from the list → highlight its box on the pitch editor above
  // (the selected box renders solid + bold and becomes the draggable/resizable one).
  // Clicking the already-selected row clears the selection.
  const onSelectRuleRow = useCallback((id: string) => {
    setSelectedRuleId((cur) => (cur === id ? null : id));
    // Bring the pitch editor into view so the highlighted box is visible.
    document.getElementById("zone-pitch-editor")?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, []);

  const removeZoneRule = useCallback((id: string) => {
    commit((prev) => {
      const next = prev.filter((r) => r.id !== id);
      if (next.length === 0) setSelectedPresetId("none");
      return next;
    });
    setSelectedRuleId((cur) => (cur === id ? null : cur));
  }, [commit]);

  if (!selecting) {
    return (
      <main className="flex-1 flex items-center justify-center p-2 lg:p-4">
        <MatchView />
      </main>
    );
  }

  return (
    <main className="flex-1 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Link href="/" className="inline-flex items-center gap-1.5 text-sm font-bold text-[#5d6f63] mb-6 hover:text-[#1F6E3D]">
          &larr; Home
        </Link>

        <h1 className="font-[Fredoka] font-bold text-2xl text-[#16241c] mb-6">Choose your match</h1>

        {/* Format */}
        <div className="mb-5">
          <p className="text-xs font-extrabold tracking-wide text-[#5d6f63] mb-2.5">FORMAT</p>
          <div className="flex gap-2.5">
            {FORMATS.map((f) => (
              <button
                key={f.id}
                onClick={() => {
                  setMatchConfig({ format: f.id, userRole: DEFAULT_USER_ROLE[f.id] });
                }}
                className={clsx(
                  "flex-1 rounded-xl p-3.5 border-2 text-center cursor-pointer transition-all",
                  matchConfig.format === f.id
                    ? "border-[#2B8A4E] bg-[#eafaef] shadow-md"
                    : "border-[rgba(20,60,35,.1)] bg-white hover:border-[#2B8A4E]/40"
                )}
              >
                <p className="font-[Fredoka] font-semibold text-xl">{f.label}</p>
                <p className="text-[10px] font-bold text-[#5d6f63] mt-0.5">{f.desc}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Position */}
        <div className="mb-5">
          <p className="text-xs font-extrabold tracking-wide text-[#5d6f63] mb-2.5">YOUR POSITION</p>
          <div className="flex flex-wrap gap-2">
            {roleKeys.map((k) => (
              <button
                key={k}
                onClick={() => setMatchConfig({ userRole: k })}
                className={clsx(
                  "rounded-xl py-2.5 px-4 border-2 font-[Fredoka] font-semibold text-sm cursor-pointer transition-all",
                  selectedRole === k
                    ? "border-[#2E6FE0] bg-[#e8f0ff] shadow-md text-[#2E6FE0]"
                    : "border-[rgba(20,60,35,.1)] bg-white hover:border-[#2E6FE0]/40 text-[#33433a]"
                )}
              >
                <span className="font-extrabold text-xs mr-1.5 opacity-60">#{JERSEY_NUMBERS[k]}</span>
                {ROLE_LABELS[k] || k}
              </button>
            ))}
          </div>
        </div>

        {/* Opponent Tactic */}
        <div className="mb-5">
          <p className="text-xs font-extrabold tracking-wide text-[#E0463B] mb-2.5">🔴 OPPONENT TACTIC</p>
          <div className="flex flex-col gap-2">
            {ALL_TACTICS.map((t) => (
              <button
                key={t.id}
                onClick={() => setMatchConfig({ oppTacticId: t.id })}
                className={clsx(
                  "rounded-xl p-3 border-2 text-left cursor-pointer transition-all",
                  (matchConfig.oppTacticId || "possession") === t.id
                    ? "border-[#E0463B] bg-[#fef0ef] shadow-md"
                    : "border-[rgba(20,60,35,.1)] bg-white hover:border-[#E0463B]/40"
                )}
              >
                <div className="flex items-center gap-2">
                  <span className="text-lg">{t.icon}</span>
                  <span className="font-[Fredoka] font-semibold text-sm">{t.name}</span>
                </div>
                <p className="text-[10px] font-semibold text-[#5d6f63] mt-0.5 leading-snug">{t.description}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Duration */}
        <div className="mb-5">
          <p className="text-xs font-extrabold tracking-wide text-[#5d6f63] mb-2.5">MATCH LENGTH</p>
          <div className="flex gap-2.5">
            {DURATIONS.map((d) => (
              <button
                key={d.ms}
                onClick={() => setMatchConfig({ duration: d.ms })}
                className={clsx(
                  "flex-1 rounded-xl py-3 border-2 font-[Fredoka] font-semibold text-lg cursor-pointer transition-all",
                  matchConfig.duration === d.ms
                    ? "border-[#2B8A4E] bg-[#eafaef] shadow-md"
                    : "border-[rgba(20,60,35,.1)] bg-white hover:border-[#2B8A4E]/40"
                )}
              >
                {d.label}
              </button>
            ))}
          </div>
        </div>

        {/* Difficulty */}
        <div className="mb-6">
          <p className="text-xs font-extrabold tracking-wide text-[#5d6f63] mb-2.5">AI DIFFICULTY</p>
          <div className="flex gap-2.5">
            {(["easy", "medium", "hard"] as const).map((d) => (
              <button
                key={d}
                onClick={() => setMatchConfig({ aiDifficulty: d })}
                className={clsx(
                  "flex-1 rounded-xl py-3 border-2 font-[Fredoka] font-semibold text-base capitalize cursor-pointer transition-all",
                  matchConfig.aiDifficulty === d
                    ? "border-[#2B8A4E] bg-[#eafaef] shadow-md"
                    : "border-[rgba(20,60,35,.1)] bg-white hover:border-[#2B8A4E]/40"
                )}
              >
                {d}
              </button>
            ))}
          </div>
        </div>

        {/* Zone Rules */}
        <div className="mb-6">
          <p className="text-xs font-extrabold tracking-wide text-[#5d6f63] mb-2.5">ZONE RULES</p>

          {/* Draw-template controls — what the next box drawn on the pitch is for */}
          <div id="zone-pitch-editor" className="rounded-xl border-2 border-[rgba(20,60,35,.1)] bg-[#f8faf8] p-2.5 mb-2 space-y-2 scroll-mt-4">
            {/* Sticky so undo/redo/save stay reachable while scrolling the rule list below. */}
            <div className="flex items-center justify-between sticky top-0 z-10 -mx-2.5 -mt-2.5 px-2.5 pt-2.5 pb-2 bg-[#f8faf8] rounded-t-xl border-b border-[rgba(20,60,35,.08)]">
              <p className="text-[10px] font-extrabold tracking-wide text-[#5d6f63]">DRAW A ZONE</p>
              {/* Undo / redo / save for zone edits */}
              <div className="flex gap-1">
                <button
                  onClick={undo}
                  disabled={!canUndo}
                  title="Undo (Ctrl+Z)"
                  className="rounded-md px-2 py-1 text-[10px] font-extrabold bg-white border border-[rgba(20,60,35,.15)] text-[#33433a] cursor-pointer hover:bg-[#f3f7f2] disabled:opacity-35 disabled:cursor-default transition-colors"
                >
                  ↶ Undo
                </button>
                <button
                  onClick={redo}
                  disabled={!canRedo}
                  title="Redo (Ctrl+Shift+Z)"
                  className="rounded-md px-2 py-1 text-[10px] font-extrabold bg-white border border-[rgba(20,60,35,.15)] text-[#33433a] cursor-pointer hover:bg-[#f3f7f2] disabled:opacity-35 disabled:cursor-default transition-colors"
                >
                  ↷ Redo
                </button>
                <button
                  onClick={handleSave}
                  disabled={zoneRules.length === 0}
                  title={editingCustomPreset ? `Update "${editingCustomPreset.name}"` : "Save these zones as a preset"}
                  className={clsx(
                    "rounded-md px-2.5 py-1 text-[10px] font-extrabold border cursor-pointer transition-colors disabled:opacity-35 disabled:cursor-default",
                    justSaved
                      ? "bg-[#2B8A4E] border-[#2B8A4E] text-white"
                      : "bg-[#2B8A4E] border-[#2B8A4E] text-white hover:bg-[#247a44]"
                  )}
                >
                  {justSaved ? "Saved ✓" : editingCustomPreset ? "Update" : "💾 Save"}
                </button>
              </div>
            </div>
            <div className="flex gap-2">
              {/* Team */}
              <div className="flex rounded-lg overflow-hidden border border-[rgba(20,60,35,.15)]">
                <button
                  onClick={() => setDrawTeam("us")}
                  className={clsx("px-2.5 py-1 text-[10px] font-extrabold cursor-pointer transition-colors",
                    drawTeam === "us" ? "bg-[#2E6FE0] text-white" : "bg-white text-[#5d6f63]")}
                >BLUE</button>
                <button
                  onClick={() => setDrawTeam("them")}
                  className={clsx("px-2.5 py-1 text-[10px] font-extrabold cursor-pointer transition-colors",
                    drawTeam === "them" ? "bg-[#E0463B] text-white" : "bg-white text-[#5d6f63]")}
                >RED</button>
              </div>
              {/* Role */}
              <select
                value={drawRole}
                onChange={(e) => setDrawRole(e.target.value)}
                className="flex-1 rounded-lg border border-[rgba(20,60,35,.15)] px-2 py-1 text-xs font-bold bg-white cursor-pointer"
              >
                {roleKeys.filter((k) => k !== "gk").map((k) => (
                  <option key={k} value={k}>#{JERSEY_NUMBERS[k]} {ROLE_LABELS[k] || k}</option>
                ))}
              </select>
            </div>
            {/* Condition */}
            <select
              value={drawWhen}
              onChange={(e) => setDrawWhen(e.target.value as ZoneCondition)}
              className="w-full rounded-lg border border-[rgba(20,60,35,.15)] px-2 py-1 text-xs font-bold bg-white cursor-pointer"
            >
              <option value="always">Always applies</option>
              <option value="attacking">When we attack</option>
              <option value="defending">When we defend</option>
              <option value="ball_own_half">When ball is in our half</option>
              <option value="ball_opp_half">When ball is in their half</option>
              <option value="carrier_is">When a specific player has the ball…</option>
            </select>
            {drawWhen === "carrier_is" && (
              <div className="flex gap-2">
                <div className="flex rounded-lg overflow-hidden border border-[rgba(20,60,35,.15)]">
                  <button
                    onClick={() => setDrawCarrierTeam("us")}
                    className={clsx("px-2.5 py-1 text-[10px] font-extrabold cursor-pointer transition-colors",
                      drawCarrierTeam === "us" ? "bg-[#2E6FE0] text-white" : "bg-white text-[#5d6f63]")}
                  >OUR</button>
                  <button
                    onClick={() => setDrawCarrierTeam("them")}
                    className={clsx("px-2.5 py-1 text-[10px] font-extrabold cursor-pointer transition-colors",
                      drawCarrierTeam === "them" ? "bg-[#E0463B] text-white" : "bg-white text-[#5d6f63]")}
                  >THEIR</button>
                </div>
                <select
                  value={drawCarrierRole}
                  onChange={(e) => setDrawCarrierRole(e.target.value)}
                  className="flex-1 rounded-lg border border-[rgba(20,60,35,.15)] px-2 py-1 text-xs font-bold bg-white cursor-pointer"
                >
                  {roleKeys.filter((k) => k !== "gk").map((k) => (
                    <option key={k} value={k}>#{JERSEY_NUMBERS[k]} {ROLE_LABELS[k] || k}</option>
                  ))}
                </select>
              </div>
            )}

            {/* The static pitch — draw boxes here */}
            <ZonePitchEditor
              format={currentFormat}
              rules={zoneRules}
              selectedId={selectedRuleId}
              template={{ team: drawTeam, role: drawRole || roleKeys.filter((k) => k !== "gk")[0], when: drawWhen, carrierTeam: drawCarrierTeam, carrierRole: drawCarrierRole || roleKeys.filter((k) => k !== "gk")[0] }}
              onAddRule={handleDrawnRule}
              onUpdateRule={updateZoneRule}
              onSelectRule={setSelectedRuleId}
              onEndEdit={endEdit}
            />

            {/* Name field for saving a NEW preset. Shows for free-draw zones,
                or when the top-bar Save button needs a name (new / edited
                built-in). Editing a saved custom preset uses the top "Update"
                button instead and skips this. */}
            {zoneRules.length > 0 && (namingNew || (!editingCustomPreset && (selectedPresetId === "custom" || selectedPresetId === "none"))) && (
              <div className="flex gap-2 pt-1">
                <input
                  type="text"
                  value={saveName}
                  autoFocus={namingNew}
                  onChange={(e) => setSaveName(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") handleSavePreset(); if (e.key === "Escape") setNamingNew(false); }}
                  placeholder={`Save these ${zoneRules.length} zone${zoneRules.length !== 1 ? "s" : ""} as a preset…`}
                  className="flex-1 rounded-lg border border-[rgba(20,60,35,.15)] px-2.5 py-1.5 text-xs font-bold bg-white"
                />
                <button
                  onClick={handleSavePreset}
                  disabled={!saveName.trim()}
                  className="rounded-lg px-3 py-1.5 text-[10px] font-extrabold bg-[#2B8A4E] text-white cursor-pointer disabled:opacity-40 disabled:cursor-default whitespace-nowrap"
                >
                  Save preset
                </button>
              </div>
            )}
          </div>

          {/* Preset dropdown */}
          <select
            value={selectedPresetId}
            onChange={(e) => selectPreset(e.target.value)}
            className="w-full rounded-xl border-2 border-[rgba(20,60,35,.1)] px-3 py-2.5 text-sm font-[Fredoka] font-semibold bg-white cursor-pointer mb-2"
          >
            <option value="none">No rules (free play)</option>
            <optgroup label="Built-in Presets">
              {BUILTIN_PRESETS.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </optgroup>
            {customPresets.length > 0 && (
              <optgroup label="Your Presets">
                {customPresets.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </optgroup>
            )}
            {selectedPresetId === "custom" && (
              <option value="custom" disabled>Custom (modified)</option>
            )}
          </select>

          {/* Preset description */}
          {selectedPresetId !== "none" && selectedPresetId !== "custom" && (() => {
            const preset = allPresets.find((p) => p.id === selectedPresetId);
            return preset ? (
              <div className="flex items-center justify-between mb-2">
                <p className="text-[10px] font-semibold text-[#5d6f63] leading-snug">{preset.description}</p>
                {!preset.builtin && (
                  <button
                    onClick={() => { deletePreset(preset.id); selectPreset("none"); }}
                    className="text-[10px] font-bold text-[#E0463B] cursor-pointer hover:underline ml-2 shrink-0"
                  >Delete</button>
                )}
              </div>
            ) : null;
          })()}

          {/* Expand/collapse rules editor */}
          {zoneRules.length > 0 && (
            <button
              onClick={() => setZonesOpen((o) => !o)}
              className="flex items-center gap-1.5 text-[10px] font-extrabold text-[#2B8A4E] cursor-pointer mb-2"
            >
              {zonesOpen ? "▾ Hide" : "▸ Show"} {zoneRules.length} rule{zoneRules.length !== 1 ? "s" : ""}
            </button>
          )}

          {zonesOpen && zoneRules.length > 0 && (
            <div className="space-y-3">
              {zoneRules.map((rule) => {
                const isSelected = selectedRuleId === rule.id;
                return (
                <div
                  key={rule.id}
                  className={clsx("rounded-xl border-2 p-3 space-y-2 transition-shadow", isSelected && "ring-2 ring-offset-1")}
                  style={{
                    borderColor: rule.color + (isSelected ? "" : "55"),
                    backgroundColor: rule.color + (isSelected ? "14" : "08"),
                    // @ts-expect-error CSS custom prop for the Tailwind ring color
                    "--tw-ring-color": rule.color,
                  }}
                >
                  <div className="flex items-center gap-2">
                    {/* Select — highlights this rule's box on the pitch above and makes it the draggable one */}
                    <button
                      onClick={() => onSelectRuleRow(rule.id)}
                      title={isSelected ? "Editing this zone — drag its box on the pitch" : "Select to edit this zone's box on the pitch"}
                      className={clsx(
                        "shrink-0 rounded-md px-2 py-1 text-[10px] font-extrabold cursor-pointer transition-colors border",
                        isSelected
                          ? "text-white border-transparent"
                          : "bg-white text-[#5d6f63] border-[rgba(20,60,35,.15)] hover:bg-[#f3f7f2]"
                      )}
                      style={isSelected ? { backgroundColor: rule.color } : undefined}
                    >
                      {isSelected ? "✎ Editing" : "Select"}
                    </button>

                    {/* Team toggle + role select — locked unless this row is selected */}
                    <div className={clsx("flex items-center gap-2 flex-1 transition-opacity", !isSelected && "opacity-40 pointer-events-none")} aria-disabled={!isSelected}>
                      <div className="flex rounded-lg overflow-hidden border border-[rgba(20,60,35,.15)]">
                        <button
                          onClick={() => updateZoneRule(rule.id, { team: "us" })}
                          className={clsx(
                            "px-2.5 py-1 text-[10px] font-extrabold cursor-pointer transition-colors",
                            rule.team === "us" ? "bg-[#2E6FE0] text-white" : "bg-white text-[#5d6f63]"
                          )}
                        >BLUE</button>
                        <button
                          onClick={() => updateZoneRule(rule.id, { team: "them" })}
                          className={clsx(
                            "px-2.5 py-1 text-[10px] font-extrabold cursor-pointer transition-colors",
                            rule.team === "them" ? "bg-[#E0463B] text-white" : "bg-white text-[#5d6f63]"
                          )}
                        >RED</button>
                      </div>
                      <select
                        value={rule.role}
                        onChange={(e) => updateZoneRule(rule.id, { role: e.target.value })}
                        className="flex-1 rounded-lg border border-[rgba(20,60,35,.15)] px-2 py-1 text-xs font-bold bg-white cursor-pointer"
                      >
                        {roleKeys.map((k) => (
                          <option key={k} value={k}>
                            #{JERSEY_NUMBERS[k]} {ROLE_LABELS[k] || k}
                          </option>
                        ))}
                      </select>
                    </div>

                    <button
                      onClick={() => removeZoneRule(rule.id)}
                      title="Remove this zone"
                      className="shrink-0 w-6 h-6 rounded-md bg-white border border-[rgba(20,60,35,.15)] grid place-items-center text-xs font-bold text-[#E0463B] cursor-pointer hover:bg-[#fef0ef]"
                    >&times;</button>
                  </div>

                  {/* All bound/condition editors — locked unless this row is selected.
                      Click "Select" to edit; keeps the list readable but tamper-proof. */}
                  <div className={clsx("space-y-2 transition-opacity", !isSelected && "opacity-40 pointer-events-none select-none")} aria-disabled={!isSelected}>

                  {/* Horizontal bounds */}
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-extrabold text-[#5d6f63] w-8">X</span>
                    <label className="text-[9px] font-bold text-[#5d6f63]">L</label>
                    <input
                      type="range" min="0" max="100" step="1"
                      value={Math.round(rule.xMin * 100)}
                      onChange={(e) => updateZoneRule(rule.id, { xMin: +e.target.value / 100 })}
                      onMouseUp={endEdit} onTouchEnd={endEdit} onKeyUp={endEdit}
                      className="flex-1"
                    />
                    <input
                      type="range" min="0" max="100" step="1"
                      value={Math.round(rule.xMax * 100)}
                      onChange={(e) => updateZoneRule(rule.id, { xMax: +e.target.value / 100 })}
                      onMouseUp={endEdit} onTouchEnd={endEdit} onKeyUp={endEdit}
                      className="flex-1"
                    />
                    <label className="text-[9px] font-bold text-[#5d6f63]">R</label>
                    <span className="text-[9px] font-bold text-[#5d6f63] w-16 text-right">
                      {Math.round(rule.xMin * 100)}–{Math.round(rule.xMax * 100)}%
                    </span>
                  </div>

                  {/* Vertical bounds (depth) */}
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-extrabold text-[#5d6f63] w-8">Y</span>
                    <label className="text-[9px] font-bold text-[#5d6f63]">Own</label>
                    <input
                      type="range" min="0" max="100" step="1"
                      value={Math.round(rule.yMin * 100)}
                      onChange={(e) => updateZoneRule(rule.id, { yMin: +e.target.value / 100 })}
                      onMouseUp={endEdit} onTouchEnd={endEdit} onKeyUp={endEdit}
                      className="flex-1"
                    />
                    <input
                      type="range" min="0" max="100" step="1"
                      value={Math.round(rule.yMax * 100)}
                      onChange={(e) => updateZoneRule(rule.id, { yMax: +e.target.value / 100 })}
                      onMouseUp={endEdit} onTouchEnd={endEdit} onKeyUp={endEdit}
                      className="flex-1"
                    />
                    <label className="text-[9px] font-bold text-[#5d6f63]">Opp</label>
                    <span className="text-[9px] font-bold text-[#5d6f63] w-16 text-right">
                      {Math.round(rule.yMin * 100)}–{Math.round(rule.yMax * 100)}%
                    </span>
                  </div>

                  {/* When this zone applies — layer rules by possession / ball position */}
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-extrabold text-[#5d6f63] w-8">When</span>
                    <select
                      value={rule.when ?? "always"}
                      onChange={(e) => {
                        const when = e.target.value as ZoneCondition;
                        // Seed carrier fields the first time "specific player" is picked.
                        const patch: Partial<ZoneRule> = { when };
                        if (when === "carrier_is") {
                          patch.carrierTeam = rule.carrierTeam ?? "them";
                          patch.carrierRole = rule.carrierRole ?? roleKeys[0];
                        }
                        updateZoneRule(rule.id, patch);
                      }}
                      className="flex-1 rounded-lg border border-[rgba(20,60,35,.15)] px-2 py-1 text-xs font-bold bg-white cursor-pointer"
                    >
                      <option value="always">Always</option>
                      <option value="attacking">We have the ball (attacking)</option>
                      <option value="defending">They have the ball (defending)</option>
                      <option value="ball_own_half">Ball in our half</option>
                      <option value="ball_opp_half">Ball in their half</option>
                      <option value="carrier_is">A specific player has the ball…</option>
                    </select>
                  </div>

                  {/* Carrier picker — only when "specific player has the ball" */}
                  {rule.when === "carrier_is" && (
                    <div className="flex items-center gap-2 pl-9">
                      <div className="flex rounded-lg overflow-hidden border border-[rgba(20,60,35,.15)]">
                        <button
                          onClick={() => updateZoneRule(rule.id, { carrierTeam: "us" })}
                          className={clsx(
                            "px-2.5 py-1 text-[10px] font-extrabold cursor-pointer transition-colors",
                            (rule.carrierTeam ?? "them") === "us" ? "bg-[#2E6FE0] text-white" : "bg-white text-[#5d6f63]"
                          )}
                        >OUR</button>
                        <button
                          onClick={() => updateZoneRule(rule.id, { carrierTeam: "them" })}
                          className={clsx(
                            "px-2.5 py-1 text-[10px] font-extrabold cursor-pointer transition-colors",
                            (rule.carrierTeam ?? "them") === "them" ? "bg-[#E0463B] text-white" : "bg-white text-[#5d6f63]"
                          )}
                        >THEIR</button>
                      </div>
                      <select
                        value={rule.carrierRole ?? roleKeys[0]}
                        onChange={(e) => updateZoneRule(rule.id, { carrierRole: e.target.value })}
                        className="flex-1 rounded-lg border border-[rgba(20,60,35,.15)] px-2 py-1 text-xs font-bold bg-white cursor-pointer"
                      >
                        {roleKeys.map((k) => (
                          <option key={k} value={k}>
                            #{JERSEY_NUMBERS[k]} {ROLE_LABELS[k] || k}
                          </option>
                        ))}
                      </select>
                      <span className="text-[9px] font-bold text-[#5d6f63]">has the ball</span>
                    </div>
                  )}
                  </div>{/* /lockable editors */}
                </div>
                );
              })}

            </div>
          )}

          {/* Add rule / save preset buttons */}
          <div className="flex gap-2 mt-2">
            <button
              onClick={() => addZoneRule("us")}
              className="flex-1 rounded-xl py-2.5 border-2 border-dashed border-[#2E6FE0]/30 text-[11px] font-extrabold text-[#2E6FE0] cursor-pointer hover:bg-[#e8f0ff] transition-colors"
            >
              + Blue rule
            </button>
            <button
              onClick={() => addZoneRule("them")}
              className="flex-1 rounded-xl py-2.5 border-2 border-dashed border-[#E0463B]/30 text-[11px] font-extrabold text-[#E0463B] cursor-pointer hover:bg-[#fef0ef] transition-colors"
            >
              + Red rule
            </button>
          </div>

        </div>

        <button
          onClick={() => {
            setMatchConfig({ zoneRules: zoneRules.length > 0 ? zoneRules : undefined });
            setSelecting(false);
          }}
          className="btn-primary w-full text-center"
        >
          Start Match
        </button>
      </div>
    </main>
  );
}
