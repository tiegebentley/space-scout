"use client";
import { useState, useCallback, useMemo } from "react";
import { MatchView } from "@/components/game/MatchView";
import { useGameStore } from "@/stores/gameStore";
import Link from "next/link";
import { clsx } from "clsx";
import { FORMATIONS, DEFAULT_USER_ROLE, JERSEY_NUMBERS } from "@/engine/constants";
import { ALL_TACTICS } from "@/engine/tactics/presets";
import type { ZoneRule, RulePreset } from "@/types/game";

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
];

function hydrateRules(rules: Omit<ZoneRule, "id">[]): ZoneRule[] {
  return rules.map((r) => ({ ...r, id: crypto.randomUUID() }));
}

export default function PlayPage() {
  const [selecting, setSelecting] = useState(true);
  const [zoneRules, setZoneRules] = useState<ZoneRule[]>([]);
  const [selectedPresetId, setSelectedPresetId] = useState<string>("none");
  const [zonesOpen, setZonesOpen] = useState(false);
  const [saveName, setSaveName] = useState("");
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

  const selectPreset = useCallback((presetId: string) => {
    setSelectedPresetId(presetId);
    if (presetId === "none") {
      setZoneRules([]);
      return;
    }
    const preset = [...BUILTIN_PRESETS, ...customPresets].find((p) => p.id === presetId);
    if (preset) {
      setZoneRules(hydrateRules(preset.rules));
      setZonesOpen(true);
    }
  }, [customPresets]);

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
    setSaveName("");
  }, [saveName, zoneRules, savePreset]);

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
    setZoneRules((prev) => [...prev, rule]);
    setSelectedPresetId("custom");
  }, [roleKeys]);

  const updateZoneRule = useCallback((id: string, patch: Partial<ZoneRule>) => {
    setZoneRules((prev) =>
      prev.map((r) => {
        if (r.id !== id) return r;
        const updated = { ...r, ...patch };
        if (patch.role || patch.team) {
          updated.label = `${updated.team === "us" ? "Blue" : "Red"} ${ROLE_LABELS[updated.role] || updated.role}`;
          updated.color = ZONE_COLORS[updated.team];
        }
        return updated;
      })
    );
    setSelectedPresetId("custom");
  }, []);

  const removeZoneRule = useCallback((id: string) => {
    setZoneRules((prev) => {
      const next = prev.filter((r) => r.id !== id);
      if (next.length === 0) setSelectedPresetId("none");
      return next;
    });
  }, []);

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
              {zoneRules.map((rule) => (
                <div
                  key={rule.id}
                  className="rounded-xl border-2 p-3 space-y-2"
                  style={{ borderColor: rule.color + "55", backgroundColor: rule.color + "08" }}
                >
                  <div className="flex items-center gap-2">
                    {/* Team toggle */}
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

                    {/* Role select */}
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

                    <button
                      onClick={() => removeZoneRule(rule.id)}
                      className="w-6 h-6 rounded-md bg-white border border-[rgba(20,60,35,.15)] grid place-items-center text-xs font-bold text-[#E0463B] cursor-pointer hover:bg-[#fef0ef]"
                    >&times;</button>
                  </div>

                  {/* Horizontal bounds */}
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-extrabold text-[#5d6f63] w-8">X</span>
                    <label className="text-[9px] font-bold text-[#5d6f63]">L</label>
                    <input
                      type="range" min="0" max="100" step="1"
                      value={Math.round(rule.xMin * 100)}
                      onChange={(e) => updateZoneRule(rule.id, { xMin: +e.target.value / 100 })}
                      className="flex-1"
                    />
                    <input
                      type="range" min="0" max="100" step="1"
                      value={Math.round(rule.xMax * 100)}
                      onChange={(e) => updateZoneRule(rule.id, { xMax: +e.target.value / 100 })}
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
                      className="flex-1"
                    />
                    <input
                      type="range" min="0" max="100" step="1"
                      value={Math.round(rule.yMax * 100)}
                      onChange={(e) => updateZoneRule(rule.id, { yMax: +e.target.value / 100 })}
                      className="flex-1"
                    />
                    <label className="text-[9px] font-bold text-[#5d6f63]">Opp</label>
                    <span className="text-[9px] font-bold text-[#5d6f63] w-16 text-right">
                      {Math.round(rule.yMin * 100)}–{Math.round(rule.yMax * 100)}%
                    </span>
                  </div>
                </div>
              ))}

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

          {/* Save as custom preset */}
          {zoneRules.length > 0 && (selectedPresetId === "custom" || selectedPresetId === "none") && (
            <div className="flex gap-2 mt-2">
              <input
                type="text"
                value={saveName}
                onChange={(e) => setSaveName(e.target.value)}
                placeholder="Preset name..."
                className="flex-1 rounded-lg border border-[rgba(20,60,35,.15)] px-2.5 py-1.5 text-xs font-bold bg-white"
              />
              <button
                onClick={handleSavePreset}
                disabled={!saveName.trim()}
                className="rounded-lg px-3 py-1.5 text-[10px] font-extrabold bg-[#2B8A4E] text-white cursor-pointer disabled:opacity-40 disabled:cursor-default"
              >
                Save preset
              </button>
            </div>
          )}
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
