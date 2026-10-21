"use client";
// Build-your-own small-sided game: numbers, neutrals, bumpers, box size, rules.
// Live preview from the real engine setup. Save to this device or share a link.
import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { clsx } from "clsx";
import { SSG_PRESETS, decodeSsg, encodeSsg, sanitizeSsg, ssgSummary } from "@/engine/ssg/presets";
import { DEFAULT_SSG } from "@/engine/ssg/SmallSidedEngine";
import type { SsgConfig } from "@/engine/ssg/types";
import { SsgPreview } from "@/components/ssg/SsgPreview";
import { loadCustomGames, saveCustomGame } from "@/lib/ssgLocal";

function Builder() {
  const q = useSearchParams();
  const router = useRouter();
  const editId = q.get("id");
  const [cfg, setCfg] = useState<SsgConfig>(() => sanitizeSsg({ ...DEFAULT_SSG, name: "My rondo" }));
  const [copied, setCopied] = useState(false);

  // Prefill: a saved game (?id), a link (?c) or a preset (?g).
  useEffect(() => {
    const id = q.get("id"), c = q.get("c"), g = q.get("g");
    if (id) { const s = loadCustomGames().find((x) => x.id === id); if (s) setCfg(s.config); }
    else if (c) { const d = decodeSsg(c); if (d) setCfg(d); }
    else if (g) { const p = SSG_PRESETS.find((x) => x.id === g); if (p) setCfg(sanitizeSsg({ ...p.config, name: `${p.config.name} (custom)` })); }
  }, [q]);

  const set = <K extends keyof SsgConfig>(k: K, v: SsgConfig[K]) => setCfg((c) => sanitizeSsg({ ...c, [k]: v }));
  const clean = useMemo(() => sanitizeSsg(cfg), [cfg]);
  const rondo = clean.mode === "rondo";

  const play = () => router.push(`/games/play?c=${encodeSsg(clean)}${editId ? `&from=${editId}` : ""}`);
  const save = () => { saveCustomGame(clean, editId ?? undefined); router.push("/games"); };
  const share = async () => {
    const url = `${window.location.origin}/games/play?c=${encodeSsg(clean)}`;
    try { await navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 1800); }
    catch { window.prompt("Copy this link", url); }
  };

  return (
    <main className="flex-1 flex flex-col items-center p-4">
      <div className="w-full max-w-2xl">
        <Link href="/games" className="text-xs font-extrabold text-[#5d6f63] hover:underline">← Games</Link>
        <h1 className="font-[Fredoka] font-bold text-3xl text-[#16241c] mt-3">{editId ? "Edit game" : "Build a game"}</h1>
        <p className="text-sm font-bold text-[#5d6f63] mb-5">Set the numbers and rules — the preview shows exactly how it starts.</p>

        <div className="grid sm:grid-cols-[1fr_240px] gap-4 items-start">
          <div className="flex flex-col gap-3">
            <Card>
              <Label>Name</Label>
              <input
                value={cfg.name}
                onChange={(e) => setCfg((c) => ({ ...c, name: e.target.value }))}
                onBlur={() => setCfg((c) => sanitizeSsg(c))}
                maxLength={40}
                className="w-full rounded-xl border-2 border-[rgba(20,60,35,.15)] px-3 py-2 font-bold text-[#16241c] bg-white"
              />
              <Label className="mt-3">Game type</Label>
              <Seg value={clean.mode} onChange={(v) => setCfg((c) => sanitizeSsg({ ...c, mode: v as SsgConfig["mode"], perimeter: v === "rondo", swapOnTurnover: v === "rondo", passesForPoint: v === "rondo" ? 10 : 6 }))}
                options={[["rondo", "Rondo"], ["possession", "Possession game"]]} />
              <p className="text-[11.5px] font-semibold text-[#5d6f63] mt-1.5">
                {rondo ? "Blues keep it, Reds win it back. Classic rondo rules." : "Both teams try to keep the ball. Turnovers switch possession."}
              </p>
            </Card>

            <Card>
              <Label>Players</Label>
              <Stepper label={rondo ? "Blues (keep it)" : "Blues"} dot="#2E6FE0" value={clean.teamA} min={1} max={7} onChange={(v) => set("teamA", v)} />
              <Stepper label={rondo ? "Reds (in the middle)" : "Reds"} dot="#E0463B" value={clean.teamB} min={1} max={7} onChange={(v) => set("teamB", v)} />
              <Stepper label="Neutrals (inside)" dot="#8B5CF6" value={clean.neutrals} min={0} max={3} onChange={(v) => set("neutrals", v)} />
              <Stepper label="Bumpers (on the lines)" dot="#F28C28" value={clean.bumpers} min={0} max={4} onChange={(v) => set("bumpers", v)} />
              <p className="text-[11.5px] font-semibold text-[#5d6f63] mt-1">Neutrals and bumpers always play with the team that has the ball.</p>
            </Card>

            <Card>
              <Label>Box size (yards)</Label>
              <Stepper label="Width" value={clean.boxW} min={8} max={40} step={2} onChange={(v) => set("boxW", v)} />
              <Stepper label="Length" value={clean.boxH} min={8} max={40} step={2} onChange={(v) => set("boxH", v)} />
              <p className="text-[11.5px] font-semibold text-[#5d6f63] mt-1">Smaller box = less time on the ball.</p>
            </Card>

            <Card>
              <Label>Rules</Label>
              <Stepper label="Passes in a row for a point" value={clean.passesForPoint} min={3} max={15} onChange={(v) => set("passesForPoint", v)} />
              <Label className="mt-2">Touch limit</Label>
              <Seg value={String(clean.touchLimit)} onChange={(v) => set("touchLimit", Number(v) as 0 | 1 | 2)} options={[["0", "Free"], ["2", "2-touch"], ["1", "1-touch"]]} />
              <Label className="mt-3">Length of game</Label>
              <Seg value={String(clean.duration)} onChange={(v) => set("duration", Number(v))} options={[["60", "1 min"], ["120", "2 min"], ["180", "3 min"], ["300", "5 min"]]} />
              {rondo && (
                <>
                  <Toggle label="Blues stand on the outside lines" value={clean.perimeter} onChange={(v) => set("perimeter", v)} />
                  <Toggle label="Lose it → go in the middle" value={clean.swapOnTurnover} onChange={(v) => set("swapOnTurnover", v)} />
                </>
              )}
            </Card>
          </div>

          <div className="sm:sticky sm:top-4 flex flex-col gap-3">
            <div className="rounded-2xl overflow-hidden border-2 border-[rgba(20,60,35,.12)] bg-white">
              <SsgPreview config={clean} className="w-full block aspect-square" />
              <div className="p-3">
                <p className="font-[Fredoka] font-semibold text-[#16241c] leading-tight">{clean.name}</p>
                <p className="text-[11px] font-bold text-[#2E6FE0]">{ssgSummary(clean)}</p>
                <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2 text-[10.5px] font-bold text-[#5d6f63]">
                  <Key c="#2E6FE0" t="Blues" /><Key c="#E0463B" t="Reds" />
                  {clean.neutrals > 0 && <Key c="#8B5CF6" t="Neutral" />}
                  {clean.bumpers > 0 && <Key c="#F28C28" t="Bumper" />}
                  <Key c="#FFC531" t="You" ring />
                </div>
              </div>
            </div>
            <button onClick={play} className="btn-primary w-full cursor-pointer">Play now</button>
            <button onClick={save} className="w-full rounded-xl bg-[#2E6FE0] text-white font-extrabold text-sm py-3 cursor-pointer">{editId ? "Save changes" : "Save to My games"}</button>
            <button onClick={share} className="w-full rounded-xl bg-white border-2 border-[rgba(20,60,35,.15)] text-[#1F6E3D] font-extrabold text-sm py-2.5 cursor-pointer">{copied ? "Link copied!" : "Copy share link"}</button>
          </div>
        </div>
      </div>
    </main>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return <div className="rounded-2xl bg-white border-2 border-[rgba(20,60,35,.1)] p-4 shadow-sm">{children}</div>;
}
function Label({ children, className }: { children: React.ReactNode; className?: string }) {
  return <p className={clsx("text-[11px] font-extrabold tracking-wide text-[#5d6f63] mb-1.5 uppercase", className)}>{children}</p>;
}
function Key({ c, t, ring }: { c: string; t: string; ring?: boolean }) {
  return <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full inline-block" style={ring ? { boxShadow: `0 0 0 2px ${c}`, background: "#2E6FE0" } : { background: c }} />{t}</span>;
}
function Stepper({ label, value, min, max, step = 1, onChange, dot }: { label: string; value: number; min: number; max: number; step?: number; onChange: (v: number) => void; dot?: string }) {
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
function Seg({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: Array<[string, string]> }) {
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
function Toggle({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button onClick={() => onChange(!value)} className="w-full flex items-center justify-between mt-3 text-[13.5px] font-bold text-[#16241c] cursor-pointer">
      {label}
      <span className={clsx("w-10 h-6 rounded-full relative transition-colors", value ? "bg-[#2B8A4E]" : "bg-[#ccc]")}>
        <span className={clsx("absolute top-[3px] w-[18px] h-[18px] rounded-full bg-white shadow transition-transform", value ? "left-[19px]" : "left-[3px]")} />
      </span>
    </button>
  );
}

export default function BuildPage() {
  return (
    <Suspense fallback={<main className="flex-1 grid place-items-center font-[Fredoka] text-lg">Loading…</main>}>
      <Builder />
    </Suspense>
  );
}
