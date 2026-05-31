// Master-only admin API for managing user roles.
//   GET  → list all users (id, email, role, display_name)
//   POST → { userId, role } set a user's role
// Auth: the caller's session must resolve to role 'master' (checked server-side
// against profiles). Privileged work (listing auth users, role writes) uses the
// service-role admin client, so the master check here is the real gate.
import { NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import type { Role } from "@/lib/auth/roles";

const ROLES: Role[] = ["master", "coach", "player"];

async function requireMaster(): Promise<{ ok: true; uid: string } | { ok: false; status: number; msg: string }> {
  const supabase = await getSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, status: 401, msg: "Not signed in" };
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "master") return { ok: false, status: 403, msg: "Master only" };
  return { ok: true, uid: user.id };
}

export async function GET() {
  const gate = await requireMaster();
  if (!gate.ok) return NextResponse.json({ error: gate.msg }, { status: gate.status });

  const admin = getSupabaseAdmin();
  // Pull profiles (role + name) and auth users (email) and merge.
  const [{ data: profiles, error: pErr }, { data: authList, error: aErr }] = await Promise.all([
    admin.from("profiles").select("id, role, display_name"),
    admin.auth.admin.listUsers({ page: 1, perPage: 1000 }),
  ]);
  if (pErr || aErr) return NextResponse.json({ error: (pErr || aErr)?.message }, { status: 500 });

  const emailById = new Map(authList.users.map((u) => [u.id, u.email ?? ""]));
  const createdById = new Map(authList.users.map((u) => [u.id, u.created_at]));
  const users = (profiles ?? []).map((p) => ({
    id: p.id,
    email: emailById.get(p.id) ?? "",
    role: p.role as Role,
    displayName: p.display_name as string | null,
    createdAt: createdById.get(p.id) ?? null,
  })).sort((a, b) => a.email.localeCompare(b.email));

  return NextResponse.json({ users });
}

export async function POST(req: Request) {
  const gate = await requireMaster();
  if (!gate.ok) return NextResponse.json({ error: gate.msg }, { status: gate.status });

  const body = await req.json().catch(() => null) as { userId?: string; role?: string } | null;
  const userId = body?.userId;
  const role = body?.role as Role | undefined;
  if (!userId || !role || !ROLES.includes(role)) {
    return NextResponse.json({ error: "Provide userId and a valid role" }, { status: 400 });
  }
  // Don't let the master demote themselves (avoids locking out the last master).
  if (userId === gate.uid && role !== "master") {
    return NextResponse.json({ error: "You can't change your own master role here." }, { status: 400 });
  }

  const admin = getSupabaseAdmin();
  const { error } = await admin.from("profiles").update({ role }).eq("id", userId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
