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
  // Snapshot the landing URL immediately (tokens live in the query/hash).
  const [landingHref] = useState(() => (typeof window !== "undefined" ? window.location.href : ""));

  // Establish the recovery session from whatever token format the reset email
  // delivered. Supabase can send any of three:
  //   1. PKCE flow:   ?code=<uuid>            -> exchangeCodeForSession
  //   2. OTP flow:     ?token_hash=..&type=recovery -> verifyOtp
  //   3. Legacy hash:  #access_token=..&refresh_token=.. -> setSession
  // The @supabase/ssr browser client uses PKCE by default, so (1) is the usual
  // case and must be exchanged explicitly — it does NOT fire onAuthStateChange
  // on its own, which is why a passive listener timed out as "invalid".
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const sb = supabase as unknown as {
          auth: {
            getSession: () => Promise<{ data: { session: unknown } }>;
            exchangeCodeForSession: (code: string) => Promise<{ error: unknown }>;
            verifyOtp: (args: { token_hash: string; type: string }) => Promise<{ error: unknown }>;
            setSession: (args: { access_token: string; refresh_token: string }) => Promise<{ error: unknown }>;
          };
        };

        const url = new URL(landingHref || window.location.href);
        const code = url.searchParams.get("code");
        const tokenHash = url.searchParams.get("token_hash");
        const type = url.searchParams.get("type");
        const hash = new URLSearchParams(url.hash.replace(/^#/, ""));
        const accessToken = hash.get("access_token");
        const refreshToken = hash.get("refresh_token");
        const hashError = url.searchParams.get("error_description") || hash.get("error_description");

        let err: unknown = null;
        if (hashError) {
          err = new Error(String(hashError));
        } else if (code) {
          ({ error: err } = await sb.auth.exchangeCodeForSession(code));
        } else if (tokenHash) {
          ({ error: err } = await sb.auth.verifyOtp({ token_hash: tokenHash, type: type || "recovery" }));
        } else if (accessToken && refreshToken) {
          ({ error: err } = await sb.auth.setSession({ access_token: accessToken, refresh_token: refreshToken }));
        } else {
          // No token in the link: only OK if a recovery session was already
          // established (e.g. the client auto-exchanged it). The link's own
          // token always wins over whoever happens to be signed in, so a reset
          // link can never change a different account's password.
          const existing = await sb.auth.getSession();
          if (!existing.data.session) err = new Error("missing token");
        }

        if (cancelled) return;
        if (err) {
          setErr("This reset link is invalid or has expired. Request a new one from the sign-in page.");
          return;
        }
        // Clean the token out of the address bar so a refresh can't re-trigger it.
        window.history.replaceState({}, "", window.location.pathname);
        setReady(true);
      } catch {
        if (!cancelled) setErr("This reset link is invalid or has expired. Request a new one from the sign-in page.");
      }
    })();
    return () => { cancelled = true; };
  }, [supabase, landingHref]);

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
