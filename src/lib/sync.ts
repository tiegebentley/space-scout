"use client";
// Supabase write-through + initial load for user content (custom lessons,
// progress, match presets). The zustand store stays the in-memory source the UI
// reads; these helpers mirror changes to Supabase (RLS enforces permissions) and
// hydrate the store on login. All writes are best-effort: a failed write (e.g. a
// coach trying to touch a published lesson) is blocked by RLS and logged, never
// crashes the UI.
import { getSupabaseBrowser } from "@/lib/supabase/client";
import type { Lesson } from "@/types/lessons";
import type { PlayerProgress } from "@/types/game";

async function uid(): Promise<string | null> {
  const { data } = await getSupabaseBrowser().auth.getSession();
  return data.session?.user?.id ?? null;
}

// ── custom lessons ──────────────────────────────────────────────────────────
export async function fetchLessons(): Promise<{ lesson: Lesson; isPublished: boolean }[]> {
  const sb = getSupabaseBrowser();
  const { data, error } = await sb.from("custom_lessons").select("data, is_published");
  if (error) { console.warn("[sync] fetchLessons", error.message); return []; }
  return ((data ?? []) as { data: Lesson; is_published: boolean }[])
    .map((r) => ({ lesson: r.data, isPublished: !!r.is_published }));
}

export async function upsertLesson(lesson: Lesson, isPublished = false): Promise<{ ok: boolean; error?: string }> {
  const sb = getSupabaseBrowser();
  const owner = await uid();
  if (!owner) return { ok: false, error: "not signed in" };
  const { error } = await sb.from("custom_lessons")
    .upsert({ id: lesson.id, owner_id: owner, data: lesson, is_published: isPublished }, { onConflict: "id" });
  if (error) { console.warn("[sync] upsertLesson", error.message); return { ok: false, error: error.message }; }
  return { ok: true };
}

export async function deleteLesson(id: string): Promise<{ ok: boolean; error?: string }> {
  const sb = getSupabaseBrowser();
  const { error } = await sb.from("custom_lessons").delete().eq("id", id);
  if (error) { console.warn("[sync] deleteLesson", error.message); return { ok: false, error: error.message }; }
  return { ok: true };
}

// ── progress ────────────────────────────────────────────────────────────────
export async function fetchProgress(): Promise<PlayerProgress | null> {
  const sb = getSupabaseBrowser();
  const u = await uid(); if (!u) return null;
  const { data, error } = await sb.from("progress").select("data").eq("user_id", u).maybeSingle();
  if (error) { console.warn("[sync] fetchProgress", error.message); return null; }
  return (data?.data as PlayerProgress) ?? null;
}

export async function saveProgress(progress: PlayerProgress): Promise<void> {
  const sb = getSupabaseBrowser();
  const u = await uid(); if (!u) return;
  const { error } = await sb.from("progress").upsert({ user_id: u, data: progress }, { onConflict: "user_id" });
  if (error) console.warn("[sync] saveProgress", error.message);
}

// ── match presets ───────────────────────────────────────────────────────────
export interface RemotePreset { id: string; name: string; data: unknown }
export async function fetchPresets(): Promise<RemotePreset[]> {
  const sb = getSupabaseBrowser();
  const { data, error } = await sb.from("match_presets").select("id, name, data");
  if (error) { console.warn("[sync] fetchPresets", error.message); return []; }
  return (data ?? []) as RemotePreset[];
}
export async function upsertPreset(p: RemotePreset): Promise<void> {
  const sb = getSupabaseBrowser();
  const owner = await uid(); if (!owner) return;
  const { error } = await sb.from("match_presets").upsert({ id: p.id, owner_id: owner, name: p.name, data: p.data }, { onConflict: "id" });
  if (error) console.warn("[sync] upsertPreset", error.message);
}
export async function deletePreset(id: string): Promise<void> {
  const sb = getSupabaseBrowser();
  const { error } = await sb.from("match_presets").delete().eq("id", id);
  if (error) console.warn("[sync] deletePreset", error.message);
}
