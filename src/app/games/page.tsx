"use client";
// Small-sided games hub: rondo + possession presets, your saved custom games,
// and the "build your own" entry point.
import { useEffect, useState } from "react";
import Link from "next/link";
import { SSG_PRESETS, encodeSsg, ssgSummary } from "@/engine/ssg/presets";
import { SsgPreview } from "@/components/ssg/SsgPreview";
import { deleteCustomGame, loadCustomGames, type SavedSsg } from "@/lib/ssgLocal";

export default function GamesPage() {
  const [mine, setMine] = useState<SavedSsg[]>([]);
  const [copied, setCopied] = useState<string | null>(null);
  useEffect(() => { setMine(loadCustomGames()); }, []);

  const share = async (g: SavedSsg) => {
    const url = `${window.location.origin}/games/play?c=${encodeSsg(g.config)}`;
    try { await navigator.clipboard.writeText(url); setCopied(g.id); setTimeout(() => setCopied(null), 1800); }
    catch { window.prompt("Copy this link", url); }
  };

  return (
    <main className="flex-1 flex flex-col items-center p-4">
      <div className="w-full max-w-2xl">
        <div className="flex items-center justify-between mb-4">
          <Link href="/" className="text-xs font-extrabold text-[#5d6f63] hover:underline">← Home</Link>
        </div>
        <div className="flex items-center justify-between gap-3 mb-1">
          <h1 className="font-[Fredoka] font-bold text-3xl text-[#16241c]">Small-Sided Games</h1>
          <Link href="/games/build" className="shrink-0 rounded-xl bg-[#2E6FE0] text-white text-xs font-extrabold px-3 py-2">+ Build a game</Link>
        </div>
        <p className="text-sm font-bold text-[#5d6f63] mb-6">Rondos and possession games in a box. Keep the ball, find the angle, beat the press.</p>

        <Section title="Rondos" sub="Keep it on the outside — lose it and you're in the middle.">
          {SSG_PRESETS.filter((p) => p.group === "rondo").map((p) => (
            <GameCard key={p.id} href={`/games/play?g=${p.id}`} config={p.config} blurb={p.blurb} />
          ))}
        </Section>

        <Section title="Possession games" sub="Uneven numbers, neutrals and bumpers.">
          {SSG_PRESETS.filter((p) => p.group === "possession").map((p) => (
            <GameCard key={p.id} href={`/games/play?g=${p.id}`} config={p.config} blurb={p.blurb} />
          ))}
        </Section>

        <Section title="My games" sub="Games you've built on this device. Share a link so your team can play the same setup.">
          {mine.map((g) => (
            <div key={g.id} className="flex flex-col rounded-2xl bg-white border-2 border-[rgba(20,60,35,.1)] shadow-sm overflow-hidden">
              <Link href={`/games/play?c=${encodeSsg(g.config)}&from=${g.id}`} className="block">
                <SsgPreview config={g.config} className="w-full h-28 block" />
                <div className="p-3 pb-2">
                  <h3 className="font-[Fredoka] font-semibold text-[15px] text-[#16241c] leading-tight">{g.config.name}</h3>
                  <p className="text-[11px] font-bold text-[#5d6f63] mt-0.5">{ssgSummary(g.config)}</p>
                </div>
              </Link>
              <div className="mt-auto flex gap-1 px-2 pb-2 text-[11px] font-extrabold">
                <Link href={`/games/build?id=${g.id}`} className="flex-1 text-center rounded-lg bg-[#f3f7f2] py-1.5 text-[#1F6E3D]">Edit</Link>
                <button onClick={() => share(g)} className="flex-1 rounded-lg bg-[#f3f7f2] py-1.5 text-[#2E6FE0] cursor-pointer">{copied === g.id ? "Copied!" : "Share"}</button>
                <button
                  onClick={() => { if (confirm(`Delete "${g.config.name}"?`)) { deleteCustomGame(g.id); setMine(loadCustomGames()); } }}
                  className="flex-1 rounded-lg bg-[#fdf0ef] py-1.5 text-[#E0463B] cursor-pointer"
                >Delete</button>
              </div>
            </div>
          ))}
          <Link href="/games/build" className="flex flex-col items-center justify-center gap-1 rounded-2xl border-2 border-dashed border-[rgba(20,60,35,.25)] text-[#1F6E3D] p-4 min-h-[180px] hover:bg-white/60">
            <span className="text-3xl leading-none">+</span>
            <span className="font-[Fredoka] font-semibold">Build your own</span>
            <span className="text-[11px] font-bold text-[#5d6f63] text-center">Pick the numbers, neutrals, bumpers and box size</span>
          </Link>
        </Section>
      </div>
    </main>
  );
}

function Section({ title, sub, children }: { title: string; sub: string; children: React.ReactNode }) {
  return (
    <section className="mb-8">
      <h2 className="font-[Fredoka] font-semibold text-xl text-[#16241c]">{title}</h2>
      <p className="text-[12px] font-bold text-[#5d6f63] mb-3">{sub}</p>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">{children}</div>
    </section>
  );
}

function GameCard({ href, config, blurb }: { href: string; config: Parameters<typeof SsgPreview>[0]["config"]; blurb: string }) {
  return (
    <Link href={href} className="flex flex-col rounded-2xl bg-white border-2 border-[rgba(20,60,35,.1)] shadow-sm overflow-hidden active:translate-y-[2px] transition-transform">
      <SsgPreview config={config} className="w-full h-28 block" />
      <div className="p-3">
        <h3 className="font-[Fredoka] font-semibold text-[15px] text-[#16241c] leading-tight">{config.name}</h3>
        <p className="text-[11px] font-bold text-[#2E6FE0] mt-0.5">{ssgSummary(config)}</p>
        <p className="text-[11.5px] font-semibold text-[#5d6f63] mt-1 leading-snug">{blurb}</p>
      </div>
    </Link>
  );
}
