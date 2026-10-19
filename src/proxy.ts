// Refreshes the Supabase session cookie on every request and guards routes that
// require a signed-in user. Role-level gating (player vs coach vs master) is done
// in the UI + enforced by RLS; here we only require *authentication* for the app
// shell and bounce unauthenticated users to /login.
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Routes that don't require a session. /privacy and /terms must stay public so
// app-store crawlers (and users not signed in) can reach the legal pages.
// The Android APK must also stay public — it's downloaded straight from the
// login screen by people who don't have an account yet.
const PUBLIC_PREFIXES = ["/login", "/auth", "/privacy", "/terms"];

// Public downloadable files that must never be auth-gated (otherwise the
// request gets redirected to /login and the user downloads the HTML login
// page renamed as the file instead of the real binary).
const PUBLIC_FILES = ["/soccer-iq-lab.apk"];

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // IMPORTANT: getUser() (not getSession) so the token is validated server-side.
  const { data: { user } } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const isPublic =
    PUBLIC_FILES.includes(path) ||
    PUBLIC_PREFIXES.some((p) => path === p || path.startsWith(p + "/"));

  if (!user && !isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", path);
    return NextResponse.redirect(url);
  }

  // Already signed in but sitting on /login → send home.
  if (user && path === "/login") {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  // Run on everything except Next internals + static assets. Downloadable
  // binaries (.apk/.aab) are excluded so they're served directly without the
  // auth check, which would otherwise redirect them to /login.
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|apk|aab)$).*)",
  ],
};
