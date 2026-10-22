"use client";
// The small-sided game settings form — shared by the games builder and the
// lesson editor (Rondo / Small-Sided step), so both configure games the same way.
import { clsx } from "clsx";
import { SSG_PRESETS, sanitizeSsg } from "@/engine/ssg/presets";
import type { SsgConfig } from "@/engine/ssg/types";

type Props = {
  value: SsgConfig;
  onChange: (c: SsgConfig) => void;
  /** Compact cards (lesson editor sidebar). */
  compact?: boolean;
  /** Show a "start from a preset" row. */
  presets?: boolean;
  /** Also let the author fix difficulty / side (the player can't change these in a lesson). */
  playerOptions?: boolean;
};

export function SsgConfigForm({ value, onChange, compact, presets, playerOptions }: Props) {
  const c = sanitizeSsg(value);
  const set = <K extends keyof SsgConfig>(k: K, v: SsgConfig[K]) => onChange(sanitizeSsg({ ...c, [k]: v }));
  const rondo = c.mode === "rondo";
  return (
    <div className={clsx("flex flex-col", compact ? "gap-2" : "gap-3")}>
      {presets && (
        <Card compact={compact}>
          <Label>Start from</Label>
          <div className="flex flex-wrap gap-1.5">
            {SSG_PRESETS.map((p) => (
              <button key={p.id} onClick={() => onChange(sanitizeSsg({ ...p.config, userTeam: c.userTeam, difficulty: c.difficulty }))}
                className="rounded-lg px-2 py-1 text-[11px] font-extrabold bg-[#f3f7f2] text-[#1F6E3D] border border-[rgba(20,60,35,.12)] cursor-pointer">
                {p.config.name}
              </button>
            ))}
          </div>
        </Card>
      )}

      <Card compact={compact}>
        <Label>Game type</Label>
        <Seg value={c.mode} onChange={(v) => onChange(sanitizeSsg({ ...c, mode: v as SsgConfig["mode"], perimeter: v === "rondo", swapOnTurnover: v === "rondo", passesForPoint: v === "rondo" ? 10 : 6 }))}
          options={[["rondo", "Rondo"], ["possession", "Possession game"]]} />
        <p className="text-[11.5px] font-semibold text-[#5d6f63] mt-1.5">
          {rondo ? "Blues keep it, Reds win it back. Classic rondo rules." : "Both teams try to keep the ball. Turnovers switch possession."}
        </p>
      </Card>

      <Card compact={compact}>
        <Label>Players</Label>
        <Stepper label={rondo ? "Blues (keep it)" : "Blues"} dot="#2E6FE0" value={c.teamA} min={1} max={7} onChange={(v) => set("teamA", v)} />
        <Stepper label={rondo ? "Reds (in the middle)" : "Reds"} dot="#E0463B" value={c.teamB} min={1} max={7} onChange={(v) => set("teamB", v)} />
        <Stepper label="Neutrals (inside)" dot="#8B5CF6" value={c.neutrals} min={0} max={3} onChange={(v) => set("neutrals", v)} />
        <Stepper label="Bumpers (on the lines)" dot="#F28C28" value={c.bumpers} min={0} max={4} onChange={(v) => set("bumpers", v)} />
        <p className="text-[11.5px] font-semibold text-[#5d6f63] mt-1">Neutrals and bumpers always play with the team that has the ball.</p>
      </Card>

      <Card compact={compact}>
        <Label>Box size (yards)</Label>
        <Stepper label="Width" value={c.boxW} min={8} max={40} step={2} onChange={(v) => set("boxW", v)} />
        <Stepper label="Length" value={c.boxH} min={8} max={40} step={2} onChange={(v) => set("boxH", v)} />
        <p className="text-[11.5px] font-semibold text-[#5d6f63] mt-1">Smaller box = less time on the ball.</p>
      </Card>

      <Card compact={compact}>
        <Label>Rules</Label>
        <Stepper label="Passes in a row for a point" value={c.passesForPoint} min={3} max={15} onChange={(v) => set("passesForPoint", v)} />
        <Label className="mt-2">Touch limit</Label>
        <Seg value={String(c.touchLimit)} onChange={(v) => set("touchLimit", Number(v) as 0 | 1 | 2)} options={[["0", "Free"], ["2", "2-touch"], ["1", "1-touch"]]} />
        <Label className="mt-3">Length of game</Label>
        <Seg value={String(c.duration)} onChange={(v) => set("duration", Number(v))} options={[["60", "1 min"], ["120", "2 min"], ["180", "3 min"], ["300", "5 min"]]} />
        {rondo && (
          <>
            <Toggle label="Blues stand on the outside lines" value={c.perimeter} onChange={(v) => set("perimeter", v)} />
            <Toggle label="Lose it → go in the middle" value={c.swapOnTurnover} onChange={(v) => set("swapOnTurnover", v)} />
          </>
        )}
      </Card>

      {playerOptions && (
        <Card compact={compact}>
          <Label>Player starts</Label>
          <Seg value={c.userTeam} onChange={(v) => set("userTeam", v as "A" | "B")}
            options={rondo ? [["A", "On the outside"], ["B", "In the middle"]] : [["A", "Blues"], ["B", "Reds"]]} />
          <Label className="mt-3">Opponent difficulty</Label>
          <Seg value={c.difficulty} onChange={(v) => set("difficulty", v as SsgConfig["difficulty"])}
            options={[["easy", "Easy"], ["medium", "Medium"], ["hard", "Hard"], ["elite", "Elite"]]} />
        </Card>
      )}
    </div>
  );
}

export function Card({ children, compact }: { children: React.ReactNode; compact?: boolean }) {
  return <div className={clsx("rounded-2xl bg-white border-2 border-[rgba(20,60,35,.1)] shadow-sm", compact ? "p-3" : "p-4")}>{children}</div>;
}
export function Label({ children, className }: { children: React.ReactNode; className?: string }) {
  return <p className={clsx("text-[11px] font-extrabold tracking-wide text-[#5d6f63] mb-1.5 uppercase", className)}>{children}</p>;
}
export function Stepper({ label, value, min, max, step = 1, onChange, dot }: { label: string; value: number; min: number; max: number; step?: number; onChange: (v: number) => void; dot?: string }) {
  return (
    <div className="flex items-center justify-between py-1.5">
      <span className="flex items-center gap-2 text-[13.5px] font-bold text-[#16241c]">
        {dot && <span className="w-3 h-3 rounded-full inline-block" style={{ background: dot }} />}{label}
      </span>
      <span className="flex items-center gap-2">
        <button onClick={() => onChange(Math.max(min, value - step))} disabled={value <= min} className="w-9 h-9 rounded-xl bg-[#f3f7f2] font-extrabold text-lg text-[#1F6E3D] disabled:opacity-30 cursor-pointer" aria-label={`Fewer ${label}`}>−</button>
        <span className="w-8 text-center font-[Fredoka] font-semibold text-lg tabular-nums">{value}</span>
        <button onClick={() => onChange(Math.min(max, value + step))} disabled={value >= max} className="w-9 h-9 rounded-xl bg-[#f3f7f2] font-extrabold text-lg text-[#1F6E3D] disabled:opacity-30 cursor-pointer" aria-label={`More ${label}`}>+</button>
      </span>
    </div>
  );
}
export function Seg({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: Array<[string, string]> }) {
  return (
    <div className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}>
      {options.map(([v, l]) => (
        <button key={v} onClick={() => onChange(v)} className={clsx(
          "rounded-xl py-2 text-[12.5px] font-extrabold border-2 cursor-pointer transition-colors",
          value === v ? "bg-[#2B8A4E] text-white border-[#2B8A4E]" : "bg-white text-[#5d6f63] border-[rgba(20,60,35,.12)]"
        )}>{l}</button>
      ))}
    </div>
  );
}
export function Toggle({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button onClick={() => onChange(!value)} className="w-full flex items-center justify-between mt-3 text-[13.5px] font-bold text-[#16241c] cursor-pointer">
      {label}
      <span className={clsx("w-10 h-6 rounded-full relative transition-colors shrink-0 ml-2", value ? "bg-[#2B8A4E]" : "bg-[#ccc]")}>
        <span className={clsx("absolute top-[3px] w-[18px] h-[18px] rounded-full bg-white shadow transition-transform", value ? "left-[19px]" : "left-[3px]")} />
      </span>
    </button>
  );
}
