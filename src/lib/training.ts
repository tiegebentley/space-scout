import "server-only";
// Server helpers for teams + training sessions. Every route verifies the caller
// with the cookie session first, then uses the service-role client for the
// actual reads/writes (training_sessions has no client RLS policies).
import { Resend } from "resend";
import { getSupabaseServer } from "@/lib/supabase/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export type Role = "master" | "coach" | "player";

export interface Caller { id: string; email: string | null; role: Role; name: string }

export async function getCaller(): Promise<Caller | null> {
  const sb = await getSupabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return null;
  const admin = getSupabaseAdmin();
  const { data: prof } = await admin.from("profiles").select("role, display_name").eq("id", user.id).maybeSingle();
  return {
    id: user.id,
    email: user.email ?? null,
    role: ((prof?.role as Role) ?? "player"),
    name: prof?.display_name || user.email?.split("@")[0] || "Player",
  };
}

export const canCoach = (c: Caller) => c.role === "coach" || c.role === "master";

export interface SessionRow {
  id: string; team_id: string; coach_id: string; title: string; starts_at: string;
  duration_min: number; location: string | null; notes: string | null;
  lesson_id: string | null; tz: string | null; reminder_sent_at: string | null;
}

// Team ids the caller coaches.
export async function coachedTeamIds(userId: string): Promise<string[]> {
  const { data } = await getSupabaseAdmin().from("siq_teams").select("id").eq("coach_id", userId);
  return (data ?? []).map((r: { id: string }) => r.id);
}

// Members of a team with their names + emails (server-side only).
export async function teamMembers(teamId: string): Promise<{ id: string; name: string; email: string | null }[]> {
  const admin = getSupabaseAdmin();
  const { data: rows } = await admin.from("siq_team_members").select("user_id").eq("team_id", teamId);
  const ids = (rows ?? []).map((r: { user_id: string }) => r.user_id);
  if (!ids.length) return [];
  const { data: profs } = await admin.from("profiles").select("id, display_name").in("id", ids);
  const nameOf = new Map((profs ?? []).map((p: { id: string; display_name: string | null }) => [p.id, p.display_name]));
  const out: { id: string; name: string; email: string | null }[] = [];
  for (const id of ids) {
    const { data } = await admin.auth.admin.getUserById(id);
    const email = data.user?.email ?? null;
    out.push({ id, name: nameOf.get(id) || email?.split("@")[0] || "Player", email });
  }
  return out;
}

export function randomJoinCode(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O/1/I confusion
  let s = "";
  for (let i = 0; i < 6; i++) s += alphabet[Math.floor(Math.random() * alphabet.length)];
  return s;
}

// ── email ───────────────────────────────────────────────────────────────────
const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export function formatWhen(iso: string, tz: string | null): string {
  try {
    return new Intl.DateTimeFormat("en-US", {
      weekday: "long", month: "long", day: "numeric", hour: "numeric", minute: "2-digit",
      timeZone: tz || "America/New_York", timeZoneName: "short",
    }).format(new Date(iso));
  } catch {
    return new Date(iso).toUTCString();
  }
}

export async function emailTeam(
  recipients: { email: string | null; name: string }[],
  kind: "scheduled" | "reminder" | "cancelled",
  s: SessionRow,
  teamName: string,
): Promise<number> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev";
  if (!apiKey) { console.error("[training] RESEND_API_KEY not configured"); return 0; }
  const resend = new Resend(apiKey);
  const when = formatWhen(s.starts_at, s.tz);
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://app.thesocceriqlab.com";
  const subject =
    kind === "scheduled" ? `New training: ${s.title} — ${when}`
      : kind === "reminder" ? `Reminder: ${s.title} is coming up — ${when}`
      : `Cancelled: ${s.title} — ${when}`;
  const lead =
    kind === "scheduled" ? "Your coach scheduled a training session."
      : kind === "reminder" ? "Heads up — you have training coming up."
      : "This training session has been cancelled.";
  let sent = 0;
  for (const r of recipients) {
    if (!r.email || r.email.endsWith(".test")) continue;
    const html = `
      <div style="font-family:system-ui,Segoe UI,Arial,sans-serif;max-width:560px">
        <h2 style="margin:0 0 6px;color:#16241c">⚽ ${esc(s.title)}</h2>
        <p style="margin:0 0 14px;color:#5d6f63">Hi ${esc(r.name)} — ${lead}</p>
        <table style="border-collapse:collapse;font-size:14px">
          <tr><td style="padding:4px 12px 4px 0;color:#5d6f63">Team</td><td><strong>${esc(teamName)}</strong></td></tr>
          <tr><td style="padding:4px 12px 4px 0;color:#5d6f63">When</td><td><strong>${esc(when)}</strong> (${s.duration_min} min)</td></tr>
          ${s.location ? `<tr><td style="padding:4px 12px 4px 0;color:#5d6f63">Where</td><td>${esc(s.location)}</td></tr>` : ""}
        </table>
        ${s.notes ? `<p style="margin:14px 0 4px;color:#5d6f63">Coach's notes</p><blockquote style="margin:0;padding:10px 14px;background:#f3f7f1;border-left:3px solid #2B8A4E;border-radius:6px;white-space:pre-wrap">${esc(s.notes)}</blockquote>` : ""}
        ${kind !== "cancelled" ? `<p style="margin:18px 0 0"><a href="${appUrl}/team" style="background:#2B8A4E;color:#fff;text-decoration:none;padding:10px 16px;border-radius:10px;font-weight:700">Open Soccer IQ Lab</a></p>` : ""}
      </div>`;
    try {
      const { error } = await resend.emails.send({ from: `Soccer IQ Lab <${from}>`, to: r.email, subject, html });
      if (error) console.error("[training] email", r.email, error.message);
      else sent++;
    } catch (e) {
      console.error("[training] email failed", e);
    }
  }
  return sent;
}
