"use client";
// Master-only user/role management. Lists all users and lets the master change
// each one's role. Backed by /api/admin/users (which re-checks master server-side
// and uses the service role to read emails + write roles).
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { clsx } from "clsx";
import { useAuth } from "@/lib/auth/AuthProvider";
import { ROLE_LABEL, type Role } from "@/lib/auth/roles";

interface Row { id: string; email: string; role: Role; displayName: string | null; createdAt: string | null }
const ROLES: Role[] = ["master", "coach", "player"];

export default function AdminPage() {
  const { user, can, loading: authLoading } = useAuth();
  const [rows, setRows] = useState<Row[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [flash, setFlash] = useState<string | null>(null);

  const load = useCallback(async () => {
    setErr(null);
    const res = await fetch("/api/admin/users");
    if (!res.ok) { setErr((await res.json().catch(() => ({}))).error ?? "Failed to load users"); return; }
    setRows((await res.json()).users as Row[]);
  }, []);

  useEffect(() => { if (!authLoading && can("roles:manage")) void load(); }, [authLoading, can, load]);

  const setRole = async (id: string, role: Role) => {
    setSavingId(id); setErr(null); setFlash(null);
    const res = await fetch("/api/admin/users", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: id, role }),
    });
    const j = await res.json().catch(() => ({}));
    setSavingId(null);
    if (!res.ok) { setErr(j.error ?? "Update failed"); return; }
    setRows((prev) => prev?.map((r) => (r.id === id ? { ...r, role } : r)) ?? null);
    setFlash("Role updated");
    setTimeout(() => setFlash(null), 2000);
  };

  if (!authLoading && !can("roles:manage")) {
    return (
      <main className="flex-1 flex flex-col items-center justify-center p-6 text-center">
        <div className="text-4xl mb-3">🔒</div>
        <h1 className="font-[Fredoka] font-bold text-2xl text-[#16241c]">Admin</h1>
        <p className="text-sm font-semibold text-[#5d6f63] mt-1">User management is for the program master only.</p>
        <Link href="/" className="mt-5 rounded-xl bg-[#2B8A4E] text-white font-bold text-sm px-5 py-2.5">← Back home</Link>
      </main>
    );
  }

  return (
    <main className="flex-1 flex flex-col items-center p-4">
      <div className="w-full max-w-2xl">
        <Link href="/" className="text-xs font-extrabold text-[#5d6f63] hover:underline">← Home</Link>
        <h1 className="font-[Fredoka] font-bold text-3xl text-[#16241c] mt-2 mb-1">Manage Users</h1>
        <p className="text-sm font-bold text-[#5d6f63] mb-5">Set each person&apos;s role. Coaches can author their own lessons; players can only play.</p>

        {err && <p className="mb-3 rounded-lg bg-[#fff3e0] border border-[#f0b657] text-[#8a5a00] text-xs font-bold px-3 py-2">{err}</p>}
        {flash && <p className="mb-3 rounded-lg bg-[#2B8A4E14] border border-[#2B8A4E55] text-[#1e5e36] text-xs font-bold px-3 py-2">{flash}</p>}

        {!rows ? (
          <p className="text-sm font-bold text-[#5d6f63]">Loading…</p>
        ) : (
          <div className="flex flex-col gap-2">
            {rows.map((r) => {
              const isSelf = r.id === user?.id;
              return (
                <div key={r.id} className="flex items-center gap-3 rounded-xl bg-white border border-[rgba(20,60,35,.1)] shadow-sm px-4 py-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-[#16241c] truncate">
                      {r.displayName || r.email.split("@")[0]}
                      {isSelf && <span className="ml-2 text-[10px] font-extrabold text-[#2E6FE0]">(you)</span>}
                    </p>
                    <p className="text-[11px] font-semibold text-[#5d6f63] truncate">{r.email}</p>
                  </div>
                  <div className="flex rounded-lg overflow-hidden border border-[rgba(20,60,35,.15)] text-[10px] font-extrabold">
                    {ROLES.map((role) => {
                      const active = r.role === role;
                      const disabled = savingId === r.id || (isSelf && role !== "master");
                      return (
                        <button key={role} disabled={disabled} onClick={() => !active && setRole(r.id, role)}
                          title={isSelf && role !== "master" ? "You can't change your own master role here" : undefined}
                          className={clsx("px-2.5 py-1 cursor-pointer disabled:cursor-not-allowed",
                            active ? (role === "master" ? "bg-[#16241c] text-white" : role === "coach" ? "bg-[#2E6FE0] text-white" : "bg-[#2B8A4E] text-white")
                                   : "bg-white text-[#5d6f63] disabled:opacity-40")}>
                          {ROLE_LABEL[role]}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
            {rows.length === 0 && <p className="text-sm font-bold text-[#5d6f63]">No users yet.</p>}
          </div>
        )}
      </div>
    </main>
  );
}
