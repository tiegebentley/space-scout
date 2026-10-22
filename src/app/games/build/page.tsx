"use client";
// Build-your-own small-sided game: numbers, neutrals, bumpers, box size, rules.
// Live preview from the real engine setup. Save to this device or share a link.
import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { SSG_PRESETS, decodeSsg, encodeSsg, sanitizeSsg, ssgSummary } from "@/engine/ssg/presets";
import { DEFAULT_SSG } from "@/engine/ssg/SmallSidedEngine";
import type { SsgConfig } from "@/engine/ssg/types";
import { SsgPreview } from "@/components/ssg/SsgPreview";
import { SsgConfigForm, Card, Label } from "@/components/ssg/SsgConfigForm";
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

  const clean = useMemo(() => sanitizeSsg(cfg), [cfg]);

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
            </Card>
            <SsgConfigForm value={clean} onChange={setCfg} />
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

function Key({ c, t, ring }: { c: string; t: string; ring?: boolean }) {
  return <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full inline-block" style={ring ? { boxShadow: `0 0 0 2px ${c}`, background: "#2E6FE0" } : { background: c }} />{t}</span>;
}

export default function BuildPage() {
  return (
    <Suspense fallback={<main className="flex-1 grid place-items-center font-[Fredoka] text-lg">Loading…</main>}>
      <Builder />
    </Suspense>
  );
}
