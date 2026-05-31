"use client";
// Auth + role context. Tracks the Supabase session, loads the user's profile
// (role), and exposes a can() bound to that role. Wrap the app in this.
import { createContext, useContext, useEffect, useMemo, useState, useCallback } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { getSupabaseBrowser } from "@/lib/supabase/client";
import { can as canFn, type Permission, type Role } from "./roles";
import { useGameStore } from "@/stores/gameStore";
import { saveProgress } from "@/lib/sync";

interface AuthState {
  loading: boolean;          // initial session + profile resolution in flight
  session: Session | null;
  user: User | null;
  role: Role | null;
  displayName: string | null;
  can: (perm: Permission) => boolean;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
}

const Ctx = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const supabase = getSupabaseBrowser();
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<Role | null>(null);
  const [displayName, setDisplayName] = useState<string | null>(null);

  const loadProfile = useCallback(async (uid: string | undefined) => {
    if (!uid) { setRole(null); setDisplayName(null); return; }
    const { data } = await supabase
      .from("profiles")
      .select("role, display_name")
      .eq("id", uid)
      .single();
    setRole((data?.role as Role) ?? "player");
    setDisplayName(data?.display_name ?? null);
  }, [supabase]);

  const refresh = useCallback(async () => {
    const { data } = await supabase.auth.getSession();
    setSession(data.session);
    await loadProfile(data.session?.user?.id);
  }, [supabase, loadProfile]);

  useEffect(() => {
    let active = true;
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!active) return;
      setSession(data.session);
      await loadProfile(data.session?.user?.id);
      setLoading(false);
    })();
    const { data: sub } = supabase.auth.onAuthStateChange((_evt: string, sess: Session | null) => {
      setSession(sess);
      loadProfile(sess?.user?.id);
    });
    return () => { active = false; sub.subscription.unsubscribe(); };
  }, [supabase, loadProfile]);

  // On sign-in, pull the user's content from Supabase into the store (migrating
  // any local-only items up). Keyed on user id so it runs once per login.
  const userId = session?.user?.id ?? null;
  useEffect(() => {
    if (!userId) return;
    void useGameStore.getState().hydrateContent();
  }, [userId]);

  // Persist progress to Supabase whenever it changes (debounced), while signed in.
  useEffect(() => {
    if (!userId) return;
    let t: ReturnType<typeof setTimeout> | null = null;
    const unsub = useGameStore.subscribe((state, prev) => {
      if (state.progress === prev.progress) return;
      if (t) clearTimeout(t);
      const snapshot = state.progress;
      t = setTimeout(() => { void saveProgress(snapshot); }, 800);
    });
    return () => { if (t) clearTimeout(t); unsub(); };
  }, [userId]);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setSession(null); setRole(null); setDisplayName(null);
    // Clear the next-user-visible content (lessons/progress/presets) from the
    // persisted store so a shared browser doesn't leak the prior user's data.
    useGameStore.getState().resetUserContent();
    // Hard navigation to /login drops all remaining in-memory state and lands
    // cleanly on the login page.
    if (typeof window !== "undefined") window.location.assign("/login");
  }, [supabase]);

  const value = useMemo<AuthState>(() => ({
    loading,
    session,
    user: session?.user ?? null,
    role,
    displayName,
    can: (perm: Permission) => canFn(role, perm),
    signOut,
    refresh,
  }), [loading, session, role, displayName, signOut, refresh]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth(): AuthState {
  const v = useContext(Ctx);
  if (!v) throw new Error("useAuth must be used within <AuthProvider>");
  return v;
}
