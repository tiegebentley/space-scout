"use client";
import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getSupabaseBrowser } from "@/lib/supabase/client";

function StoreBadge({
  store,
  href,
  label,
  name,
}: {
  store: "play" | "apple";
  href: string;
  label: string;
  name: string;
}) {
  const live = Boolean(href);
  const icon =
    store === "play" ? (
      // Google Play triangle
      <svg viewBox="0 0 512 512" className="w-6 h-6 shrink-0" aria-hidden>
        <path fill="#00D9FF" d="M48 59v394l218-197z" />
        <path fill="#00F076" d="M48 59l218 197 70-63z" />
        <path fill="#FFC900" d="M336 193l-70 63 70 63 80-46c20-12 20-22 0-34z" />
        <path fill="#FF3A44" d="M48 453l218-197 70 63z" />
      </svg>
    ) : (
      // Apple logo
      <svg viewBox="0 0 384 512" className="w-6 h-6 shrink-0" aria-hidden>
        <path
          fill="currentColor"
          d="M318 268c-1-58 47-86 49-87-27-39-68-44-83-45-35-4-69 21-87 21s-45-20-74-20c-38 1-73 22-93 56-39 69-10 171 28 227 19 27 41 58 70 57 28-1 39-18 73-18s44 18 74 17c30-1 49-28 67-55 21-31 30-61 30-63-1-1-58-22-59-87z"
        />
        <path
          fill="currentColor"
          d="M260 116c15-19 26-45 23-71-22 1-49 15-65 33-14 16-27 43-24 68 25 2 50-12 66-30z"
        />
      </svg>
    );

  const inner = (
    <>
      {icon}
      <span className="flex flex-col leading-tight text-left">
        <span className="text-[10px] font-semibold opacity-80">{label}</span>
        <span className="text-sm font-bold -mt-0.5">{name}</span>
      </span>
      {!live && (
        <span className="ml-auto text-[9px] font-bold uppercase tracking-wide rounded-full bg-white/15 px-2 py-0.5">
          Soon
        </span>
      )}
    </>
  );

  const cls =
    "flex items-center gap-2.5 rounded-xl px-3.5 py-2.5 text-white bg-[#16241c] w-full";

  if (!live) {
    return (
      <div
        className={`${cls} opacity-50 cursor-default select-none`}
        aria-disabled="true"
        title={`${name} — coming soon`}
      >
        {inner}
      </div>
    );
  }

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={`${cls} hover:bg-[#1f3328] transition-colors`}
    >
      {inner}
    </a>
  );
}

function LoginInner() {
  const supabase = getSupabaseBrowser();
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") || "/";

  // The public marketing/landing site (outside this auth-gated app). Configurable
  // via env so the domain can change without a code edit; defaults to the live site.
  const landingUrl = process.env.NEXT_PUBLIC_LANDING_URL || "https://thesocceriqlab.com/";

  // Native app store links. Empty until the listings are published; when empty the
  // badge renders as a non-clickable "Coming soon" state. Flip on by setting the env
  // vars at deploy time — no code change needed.
  const playStoreUrl = process.env.NEXT_PUBLIC_PLAY_STORE_URL || "";
  const appStoreUrl = process.env.NEXT_PUBLIC_APP_STORE_URL || "";

  // Direct Android download (sideload). Served from /public; overridable via env.
  const androidApkUrl = process.env.NEXT_PUBLIC_ANDROID_APK_URL || "/soccer-iq-lab.apk";

  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
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
          <div className="text-3xl">&#9917;</div>
          <h1 className="font-[Fredoka] font-bold text-2xl text-[#16241c]">Soccer IQ Lab</h1>
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
          <div className="relative">
            <input value={password} onChange={(e) => setPassword(e.target.value)} type={showPw ? "text" : "password"} required
              placeholder="Password" autoComplete={mode === "login" ? "current-password" : "new-password"}
              className="w-full rounded-xl border border-[rgba(20,60,35,.15)] px-3 py-2.5 pr-12 text-sm font-semibold" />
            <button type="button" onClick={() => setShowPw((v) => !v)}
              aria-label={showPw ? "Hide password" : "Show password"}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-xs font-bold text-[#2B8A4E] px-2 py-1 cursor-pointer">
              {showPw ? "Hide" : "Show"}
            </button>
          </div>

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

        <div className="mt-4 pt-4 border-t border-[rgba(20,60,35,.1)]">
          <p className="text-center text-[11px] font-bold uppercase tracking-wide text-[#9aa79f] mb-2.5">
            Get the mobile app
          </p>

          {/* Primary, unambiguous Android download */}
          <a
            href={androidApkUrl}
            download
            className="flex items-center justify-center gap-2 rounded-xl bg-[#2B8A4E] text-white font-[Fredoka] font-bold text-base py-3 w-full hover:bg-[#247642] transition-colors"
          >
            <svg viewBox="0 0 24 24" className="w-5 h-5" aria-hidden fill="currentColor">
              <path d="M12 16l-5-5h3V4h4v7h3l-5 5zm-7 2h14v2H5v-2z" />
            </svg>
            Download for Android
          </a>
          <p className="text-center text-[10px] text-[#9aa79f] mt-1.5">
            Installs directly. Tap “Install anyway” if your phone asks.
          </p>

          {/* Store badges (live once published) */}
          <div className="flex flex-col gap-2 mt-3">
            <StoreBadge
              store="play"
              href={playStoreUrl}
              label="Get it on"
              name="Google Play"
            />
            <StoreBadge
              store="apple"
              href={appStoreUrl}
              label="Download on the"
              name="App Store"
            />
          </div>
        </div>

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
