// Schedule / cancel training sessions (coach of the team only).
//   POST   → { teamId, title, startsAt (ISO), durationMin, location?, notes?, lessonId?, tz? }
//            creates the session and emails every player on the team right away.
//   DELETE → ?id=<sessionId>   cancels it and emails the team.
import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { getCaller, canCoach, coachedTeamIds, teamMembers, emailTeam, type SessionRow } from "@/lib/training";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const me = await getCaller();
  if (!me) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  if (!canCoach(me)) return NextResponse.json({ error: "Only coaches can schedule training" }, { status: 403 });
  const b = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const teamId = String(b.teamId || "");
  if (!(await coachedTeamIds(me.id)).includes(teamId)) return NextResponse.json({ error: "Pick one of your teams" }, { status: 403 });

  const title = String(b.title || "").trim().slice(0, 120);
  const startsAt = new Date(String(b.startsAt || ""));
  const durationMin = Math.round(Number(b.durationMin) || 60);
  if (!title) return NextResponse.json({ error: "Add a title" }, { status: 400 });
  if (isNaN(startsAt.getTime())) return NextResponse.json({ error: "Pick a date and time" }, { status: 400 });
  if (startsAt.getTime() < Date.now() - 5 * 60_000) return NextResponse.json({ error: "That time is in the past" }, { status: 400 });
  if (durationMin < 5 || durationMin > 600) return NextResponse.json({ error: "Length must be 5–600 minutes" }, { status: 400 });

  const row = {
    team_id: teamId, coach_id: me.id, title,
    starts_at: startsAt.toISOString(), duration_min: durationMin,
    location: String(b.location || "").trim().slice(0, 200) || null,
    notes: String(b.notes || "").trim().slice(0, 2000) || null,
    lesson_id: String(b.lessonId || "").trim() || null,
    tz: String(b.tz || "").trim().slice(0, 64) || null,
  };
  const admin = getSupabaseAdmin();
  const { data, error } = await admin.from("training_sessions").insert(row).select("*").single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const { data: team } = await admin.from("siq_teams").select("name").eq("id", teamId).single();
  const members = await teamMembers(teamId);
  const emailed = await emailTeam(members, "scheduled", data as SessionRow, team?.name ?? "your team");
  return NextResponse.json({ ok: true, session: data, emailed, members: members.length });
}

export async function DELETE(req: Request) {
  const me = await getCaller();
  if (!me) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  const id = new URL(req.url).searchParams.get("id") || "";
  const admin = getSupabaseAdmin();
  const { data: s } = await admin.from("training_sessions").select("*").eq("id", id).maybeSingle();
  if (!s) return NextResponse.json({ error: "Session not found" }, { status: 404 });
  if (!(await coachedTeamIds(me.id)).includes((s as SessionRow).team_id)) return NextResponse.json({ error: "Not your team" }, { status: 403 });
  await admin.from("training_sessions").delete().eq("id", id);
  // Only tell players about cancellations of sessions that haven't happened yet.
  if (new Date((s as SessionRow).starts_at).getTime() > Date.now()) {
    const { data: team } = await admin.from("siq_teams").select("name").eq("id", (s as SessionRow).team_id).single();
    await emailTeam(await teamMembers((s as SessionRow).team_id), "cancelled", s as SessionRow, team?.name ?? "your team");
  }
  return NextResponse.json({ ok: true });
}
