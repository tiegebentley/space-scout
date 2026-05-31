import "server-only";
// Service-role Supabase client — BYPASSES RLS. Use ONLY in trusted server code
// (route handlers) after verifying the caller is allowed (e.g. master). Never
// import this into a client component.
import { createClient } from "@supabase/supabase-js";

export function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}
