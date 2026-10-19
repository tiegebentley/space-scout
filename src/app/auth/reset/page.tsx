"use client";
import { Suspense, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseBrowser } from "@/lib/supabase/client";

/**
 * Password-reset landing page.
 *
 * The reset email (sent from /login via resetPasswordForEmail with
 * redirectTo = <origin>/auth/reset) brings the user here with a recovery token
 * in the URL. The Supabase browser client detects it and establishes a
 * temporary recovery session, after which updateUser({ password }) is allowed.
 */
function ResetInner() {
  const supabase = getSupabaseBrowser();
  const router = useRouter();

  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  // Wait for the recovery session to be picked up from the URL. If none ever
  // arrives, the link was invalid or expired.
  useEffect(() => {
    let settled = false;
    const { data: sub } = supabase.auth.onAuthStateChange((event: string, session: unknown) => {
      if (event === "PASSWORD_RECOVERY" || session) {
        settled = true;
        setReady(true);
      }
    });
    supabase.auth.getSession().then(({ data }: { data: { session: unknown } }) => {
      if (data.session) {
        settled = true;
        setReady(true);
      }
    });
    const t = setTimeout(() => {
      if (!settled) {
        setErr("This reset link is invalid or has expired. Request a new one from the sign-in page.");
      }
    }, 4000);
    return () => {
      sub.subscription.unsubscribe();
      clearTimeout(t);
    };
  }, [supabase]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    if (password.length < 8) { setErr("Password must be at least 8 characters."); return; }
    if (password !== confirm) { setErr("Passwords don't match."); return; }
    setBusy(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setDone(true);
      setTimeout(() => { router.replace("/login"); }, 2200);
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Couldn't update your password.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="flex-1 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-lg border border-[rgba(20,60,35,.08)] p-6">
        <div className="text-center mb-5">
          <div className="text-3xl">&#9917;</div>
          <h1 className="font-[Fredoka] font-bold text-2xl text-[#16241c]">Soccer IQ Lab</h1>
          <p className="text-sm font-semibold text-[#5d6f63]">Set a new password</p>
        </div>

        {done ? (
          <p className="text-sm font-bold text-[#1e5e36] text-center py-4">
            Password updated. Taking you to sign in&hellip;
          </p>
        ) : (
          <form onSubmit={submit} className="flex flex-col gap-3">
            <div className="relative">
              <input value={password} onChange={(e) => setPassword(e.target.value)}
                type={showPw ? "text" : "password"} required autoComplete="new-password"
                placeholder="New password" disabled={!ready}
                className="w-full rounded-xl border border-[rgba(20,60,35,.15)] px-3 py-2.5 pr-12 text-sm font-semibold disabled:opacity-50" />
              <button type="button" onClick={() => setShowPw((v) => !v)}
                aria-label={showPw ? "Hide password" : "Show password"}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-xs font-bold text-[#2B8A4E] px-2 py-1 cursor-pointer">
                {showPw ? "Hide" : "Show"}
              </button>
            </div>
            <input value={confirm} onChange={(e) => setConfirm(e.target.value)}
              type={showPw ? "text" : "password"} required autoComplete="new-password"
              placeholder="Confirm new password" disabled={!ready}
              className="rounded-xl border border-[rgba(20,60,35,.15)] px-3 py-2.5 text-sm font-semibold disabled:opacity-50" />

            {err && <p className="text-xs font-bold text-[#E0463B]">{err}</p>}
            {!ready && !err && <p className="text-xs font-semibold text-[#9aa79f]">Verifying your reset link&hellip;</p>}

            <button type="submit" disabled={busy || !ready}
              className="rounded-xl bg-[#2B8A4E] text-white font-[Fredoka] font-bold text-base py-3 disabled:opacity-50 cursor-pointer">
              {busy ? "…" : "Update password"}
            </button>
          </form>
        )}

        <div className="mt-4 pt-4 border-t border-[rgba(20,60,35,.1)] text-center">
          <a href="/login"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-[#5d6f63] hover:text-[#1F6E3D] hover:underline">
            <span aria-hidden>&larr;</span> Back to sign in
          </a>
        </div>
      </div>
    </main>
  );
}

export default function ResetPage() {
  return <Suspense fallback={<main className="flex-1" />}><ResetInner /></Suspense>;
}
