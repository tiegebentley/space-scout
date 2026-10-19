// Teams + schedule overview for the signed-in user.
//   GET  → { me, coached: [{ id, name, joinCode, members[] }], joined: [{ id, name, coachName }], sessions[] }
//   POST → { action: "create", name }            (coach/master)
//          { action: "join", code }               (anyone; validated by siq_join_team RPC)
//          { action: "leave", teamId }            (member)
//          { action: "removeMember", teamId, userId }  (coach of team)
//          { action: "rename", teamId, name }     (coach of team)
import { NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { getCaller, canCoach, coachedTeamIds, teamMembers, randomJoinCode } from "@/lib/training";

export const dynamic = "force-dynamic";

export async function GET() {
  const me = await getCaller();
  if (!me) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  const admin = getSupabaseAdmin();

  const { data: coachedRows } = await admin.from("siq_teams").select("id, name, join_code").eq("coach_id", me.id).order("created_at");
  const coached = await Promise.all(
    (coachedRows ?? []).map(async (t: { id: string; name: string; join_code: string }) => ({
      id: t.id, name: t.name, joinCode: t.join_code,
      members: (await teamMembers(t.id)).map((m) => ({ id: m.id, name: m.name })),
    })),
  );

  const { data: memberRows } = await admin.from("siq_team_members").select("team_id").eq("user_id", me.id);
  const joinedIds = (memberRows ?? []).map((r: { team_id: string }) => r.team_id);
  let joined: { id: string; name: string; coachName: string }[] = [];
  if (joinedIds.length) {
    const { data: teams } = await admin.from("siq_teams").select("id, name, coach_id").in("id", joinedIds);
    const coachIds = Array.from(new Set((teams ?? []).map((t: { coach_id: string }) => t.coach_id)));
    const { data: coaches } = await admin.from("profiles").select("id, display_name").in("id", coachIds);
    const cname = new Map((coaches ?? []).map((c: { id: string; display_name: string | null }) => [c.id, c.display_name || "Coach"]));
    joined = (teams ?? []).map((t: { id: string; name: string; coach_id: string }) => ({ id: t.id, name: t.name, coachName: cname.get(t.coach_id) || "Coach" }));
  }

  const teamIds = [...coached.map((t) => t.id), ...joinedIds];
  const teamName = new Map<string, string>([...coached.map((t) => [t.id, t.name] as [string, string]), ...joined.map((t) => [t.id, t.name] as [string, string])]);
  let sessions: unknown[] = [];
  let setupNeeded = false;
  if (teamIds.length) {
    const since = new Date(Date.now() - 3 * 3600_000).toISOString(); // keep sessions visible until ~3h after start
    const { data, error } = await admin
      .from("training_sessions")
      .select("id, team_id, title, starts_at, duration_min, location, notes, lesson_id, tz")
      .in("team_id", teamIds).gte("starts_at", since).order("starts_at").limit(50);
    if (error) setupNeeded = /training_sessions/.test(error.message);
    sessions = (data ?? []).map((s: { team_id: string }) => ({ ...s, teamName: teamName.get(s.team_id) ?? "" }));
  }

  return NextResponse.json({
    me: { id: me.id, name: me.name, role: me.role, canCoach: canCoach(me) },
    coached, joined, sessions, setupNeeded,
  });
}

export async function POST(req: Request) {
  const me = await getCaller();
  if (!me) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  const body = (await req.json().catch(() => ({}))) as Record<string, string>;
  const admin = getSupabaseAdmin();

  switch (body.action) {
    case "create": {
      if (!canCoach(me)) return NextResponse.json({ error: "Only coaches can create teams" }, { status: 403 });
      const name = (body.name || "").trim().slice(0, 60);
      if (!name) return NextResponse.json({ error: "Give your team a name" }, { status: 400 });
      for (let i = 0; i < 5; i++) {
        const { error } = await admin.from("siq_teams").insert({ coach_id: me.id, name, join_code: randomJoinCode() });
        if (!error) return NextResponse.json({ ok: true });
        if (!/duplicate|unique/i.test(error.message)) return NextResponse.json({ error: error.message }, { status: 500 });
      }
      return NextResponse.json({ error: "Couldn't create a join code — try again" }, { status: 500 });
    }
    case "join": {
      const code = (body.code || "").trim().toUpperCase();
      if (!/^[A-Z0-9]{4,10}$/.test(code)) return NextResponse.json({ error: "Enter the code your coach gave you" }, { status: 400 });
      // Uses the caller's own session: the RPC only admits the team whose code matches.
      const sb = await getSupabaseServer();
      const { data, error } = await sb.rpc("siq_join_team", { p_code: code });
      if (error) return NextResponse.json({ error: /invalid/i.test(error.message) ? "That code doesn't match a team" : error.message }, { status: 400 });
      return NextResponse.json({ ok: true, team: Array.isArray(data) ? data[0] : data });
    }
    case "leave": {
      await admin.from("siq_team_members").delete().eq("team_id", body.teamId).eq("user_id", me.id);
      return NextResponse.json({ ok: true });
    }
    case "removeMember": {
      if (!(await coachedTeamIds(me.id)).includes(body.teamId)) return NextResponse.json({ error: "Not your team" }, { status: 403 });
      await admin.from("siq_team_members").delete().eq("team_id", body.teamId).eq("user_id", body.userId);
      return NextResponse.json({ ok: true });
    }
    case "rename": {
      if (!(await coachedTeamIds(me.id)).includes(body.teamId)) return NextResponse.json({ error: "Not your team" }, { status: 403 });
      const name = (body.name || "").trim().slice(0, 60);
      if (!name) return NextResponse.json({ error: "Name can't be empty" }, { status: 400 });
      await admin.from("siq_teams").update({ name }).eq("id", body.teamId);
      return NextResponse.json({ ok: true });
    }
  }
  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
