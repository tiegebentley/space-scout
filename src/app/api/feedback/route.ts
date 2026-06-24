// Post-lesson feedback API.
//   POST → { lessonId, lessonTitle, score, total, pct, rating (1-5), comment }
// Emails the feedback to FEEDBACK_TO_EMAIL (Marcus) via Resend. The signed-in
// user's email/name is attached server-side for context (not trusted from body).
// Auth: must be signed in. Rating is required; comment is optional.
import { NextResponse } from "next/server";
import { Resend } from "resend";
import { getSupabaseServer } from "@/lib/supabase/server";

type Body = {
  lessonId?: string;
  lessonTitle?: string;
  score?: number;
  total?: number;
  pct?: number;
  rating?: number;
  comment?: string;
};

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export async function POST(req: Request) {
  const supabase = await getSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const body = (await req.json().catch(() => null)) as Body | null;
  const rating = Number(body?.rating);
  if (!body || !Number.isInteger(rating) || rating < 1 || rating > 5) {
    return NextResponse.json({ error: "Provide a rating from 1 to 5" }, { status: 400 });
  }

  const apiKey = process.env.RESEND_API_KEY;
  const to = process.env.FEEDBACK_TO_EMAIL;
  const from = process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev";
  if (!apiKey || !to) {
    console.error("[feedback] RESEND_API_KEY or FEEDBACK_TO_EMAIL not configured");
    return NextResponse.json({ error: "Email is not configured" }, { status: 500 });
  }

  // Best-effort display name from profiles.
  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name")
    .eq("id", user.id)
    .single();

  const name = profile?.display_name || user.email || "A player";
  const lessonTitle = body.lessonTitle || body.lessonId || "(unknown lesson)";
  const stars = "★".repeat(rating) + "☆".repeat(5 - rating);
  const comment = (body.comment || "").trim();
  const scoreLine =
    typeof body.pct === "number"
      ? `${body.pct}% (${body.score ?? "?"}/${body.total ?? "?"})`
      : "n/a";

  const html = `
    <div style="font-family:system-ui,Segoe UI,Arial,sans-serif;max-width:560px">
      <h2 style="margin:0 0 4px">New lesson feedback — Soccer IQ Lab</h2>
      <p style="color:#5d6f63;margin:0 0 16px">From <strong>${esc(name)}</strong> (${esc(user.email || "no email")})</p>
      <table style="border-collapse:collapse;width:100%;font-size:14px">
        <tr><td style="padding:6px 0;color:#5d6f63">Lesson</td><td style="padding:6px 0"><strong>${esc(lessonTitle)}</strong></td></tr>
        <tr><td style="padding:6px 0;color:#5d6f63">Score</td><td style="padding:6px 0">${esc(scoreLine)}</td></tr>
        <tr><td style="padding:6px 0;color:#5d6f63">Rating</td><td style="padding:6px 0;font-size:18px;color:#E0A500">${stars} <span style="color:#5d6f63;font-size:13px">(${rating}/5)</span></td></tr>
      </table>
      ${comment ? `<p style="margin:16px 0 4px;color:#5d6f63">Comment</p><blockquote style="margin:0;padding:12px 16px;background:#f3f7f1;border-left:3px solid #2B8A4E;border-radius:6px;white-space:pre-wrap">${esc(comment)}</blockquote>` : `<p style="margin:16px 0 0;color:#9aa79f;font-style:italic">No comment left.</p>`}
    </div>`;

  const text =
    `New lesson feedback — Soccer IQ Lab\n` +
    `From: ${name} (${user.email || "no email"})\n` +
    `Lesson: ${lessonTitle}\n` +
    `Score: ${scoreLine}\n` +
    `Rating: ${rating}/5\n` +
    `Comment: ${comment || "(none)"}\n`;

  try {
    const resend = new Resend(apiKey);
    const { error } = await resend.emails.send({
      from: `Soccer IQ Lab <${from}>`,
      to,
      replyTo: user.email || undefined,
      subject: `Lesson feedback: ${lessonTitle} — ${rating}/5`,
      html,
      text,
    });
    if (error) {
      console.error("[feedback] resend error", error);
      return NextResponse.json({ error: "Failed to send feedback" }, { status: 502 });
    }
  } catch (e) {
    console.error("[feedback] send threw", e);
    return NextResponse.json({ error: "Failed to send feedback" }, { status: 502 });
  }

  return NextResponse.json({ ok: true });
}
