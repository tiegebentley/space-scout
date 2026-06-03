"use client";
import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getSupabaseBrowser } from "@/lib/supabase/client";

function LoginInner() {
  const supabase = getSupabaseBrowser();
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") || "/";

  // The public marketing/landing site (outside this auth-gated app). Configurable
  // via env so the domain can change without a code edit; defaults to the live site.
  const landingUrl = process.env.NEXT_PUBLIC_LANDING_URL || "https://thesocceriqlab.com/";

  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true); setErr(null); setInfo(null);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email, password,
          options: { data: { display_name: displayName || email.split("@")[0] } },
        });
        if (error) throw error;
        // New accounts default to the "player" role (DB trigger). If email
        // confirmation is on, there's no session yet.
        const { data: s } = await supabase.auth.getSession();
        if (!s.session) { setInfo("Account created. Check your email to confirm, then sign in."); setMode("login"); return; }
        router.replace(next); router.refresh();
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        router.replace(next); router.refresh();
      }
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="flex-1 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-lg border border-[rgba(20,60,35,.08)] p-6">
        <div className="text-center mb-5">
          <div className="text-3xl">🚀</div>
          <h1 className="font-[Fredoka] font-bold text-2xl text-[#16241c]">Space Scout</h1>
          <p className="text-sm font-semibold text-[#5d6f63]">{mode === "login" ? "Sign in to continue" : "Create your account"}</p>
        </div>

        <form onSubmit={submit} className="flex flex-col gap-3">
          {mode === "signup" && (
            <input value={displayName} onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Display name" autoComplete="name"
              className="rounded-xl border border-[rgba(20,60,35,.15)] px-3 py-2.5 text-sm font-semibold" />
          )}
          <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" required
            placeholder="Email" autoComplete="email"
            className="rounded-xl border border-[rgba(20,60,35,.15)] px-3 py-2.5 text-sm font-semibold" />
          <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" required
            placeholder="Password" autoComplete={mode === "login" ? "current-password" : "new-password"}
            className="rounded-xl border border-[rgba(20,60,35,.15)] px-3 py-2.5 text-sm font-semibold" />

          {err && <p className="text-xs font-bold text-[#E0463B]">{err}</p>}
          {info && <p className="text-xs font-bold text-[#1e5e36]">{info}</p>}

          <button type="submit" disabled={busy}
            className="rounded-xl bg-[#2B8A4E] text-white font-[Fredoka] font-bold text-base py-3 disabled:opacity-50 cursor-pointer">
            {busy ? "…" : mode === "login" ? "Sign in" : "Create account"}
          </button>
        </form>

        <button onClick={() => { setMode(mode === "login" ? "signup" : "login"); setErr(null); setInfo(null); }}
          className="w-full mt-3 text-xs font-bold text-[#2E6FE0] hover:underline cursor-pointer">
          {mode === "login" ? "No account? Sign up (as a player)" : "Have an account? Sign in"}
        </button>

        <div className="mt-4 pt-4 border-t border-[rgba(20,60,35,.1)] text-center">
          <a href={landingUrl}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-[#5d6f63] hover:text-[#1F6E3D] hover:underline">
            <span aria-hidden>←</span> Back to Soccer IQ Lab
          </a>
        </div>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return <Suspense fallback={<main className="flex-1" />}><LoginInner /></Suspense>;
}
