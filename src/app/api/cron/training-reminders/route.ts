// Daily reminder run (Vercel Cron → vercel.json). Emails every player on the
// team about each session starting within the next ~26 hours that hasn't been
// reminded yet, then marks it reminded. Protected by CRON_SECRET (Vercel sends
// it as "Authorization: Bearer <CRON_SECRET>"); fails closed if it isn't set.
import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { teamMembers, emailTeam, type SessionRow } from "@/lib/training";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const admin = getSupabaseAdmin();
  const now = new Date();
  const until = new Date(now.getTime() + 26 * 3600_000);
  const { data: due, error } = await admin
    .from("training_sessions").select("*")
    .is("reminder_sent_at", null)
    .gte("starts_at", now.toISOString()).lte("starts_at", until.toISOString());
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  let sessions = 0, emails = 0;
  for (const s of (due ?? []) as SessionRow[]) {
    const { data: team } = await admin.from("siq_teams").select("name").eq("id", s.team_id).single();
    emails += await emailTeam(await teamMembers(s.team_id), "reminder", s, team?.name ?? "your team");
    await admin.from("training_sessions").update({ reminder_sent_at: new Date().toISOString() }).eq("id", s.id);
    sessions++;
  }
  return NextResponse.json({ ok: true, sessions, emails });
}
