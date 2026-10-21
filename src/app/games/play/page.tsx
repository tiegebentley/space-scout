"use client";
// /games/play?g=<preset id>  or  ?c=<encoded custom config>[&from=<saved id>]
import { Suspense, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { SSG_PRESETS, decodeSsg } from "@/engine/ssg/presets";
import { SsgView } from "@/components/ssg/SsgView";

function Play() {
  const q = useSearchParams();
  const g = q.get("g"), c = q.get("c"), from = q.get("from");
  const config = useMemo(() => {
    if (g) return SSG_PRESETS.find((p) => p.id === g)?.config ?? null;
    if (c) return decodeSsg(c);
    return null;
  }, [g, c]);

  if (!config) {
    return (
      <main className="flex-1 flex flex-col items-center justify-center p-6 text-center">
        <p className="font-[Fredoka] font-semibold text-xl">That game link didn&apos;t work.</p>
        <Link href="/games" className="btn-primary mt-4">Back to games</Link>
      </main>
    );
  }
  const editHref = from ? `/games/build?id=${from}` : c ? `/games/build?c=${c}` : g ? `/games/build?g=${g}` : undefined;
  return (
    <main className="flex-1 flex flex-col items-center p-2 sm:p-4">
      <SsgView key={`${g}|${c}`} initial={config} editHref={editHref} />
    </main>
  );
}

export default function GamesPlayPage() {
  return (
    <Suspense fallback={<main className="flex-1 grid place-items-center font-[Fredoka] text-lg">Loading…</main>}>
      <Play />
    </Suspense>
  );
}
