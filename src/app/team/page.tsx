"use client";
// Team & Training. Coaches: create a team (players join with its code), see the
// roster, and schedule training sessions — players are emailed when a session is
// scheduled and reminded the day of. Players: join a team with a code and see
// their upcoming training.
import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { clsx } from "clsx";
import { LESSONS } from "@/data/lessons";

interface Member { id: string; name: string }
interface CoachedTeam { id: string; name: string; joinCode: string; members: Member[] }
interface JoinedTeam { id: string; name: string; coachName: string }
interface Session {
  id: string; team_id: string; teamName: string; title: string; starts_at: string;
  duration_min: number; location: string | null; notes: string | null; lesson_id: string | null; tz: string | null;
}
interface TeamData {
  me: { id: string; name: string; role: string; canCoach: boolean };
  coached: CoachedTeam[]; joined: JoinedTeam[]; sessions: Session[]; setupNeeded?: boolean;
}

const card = "bg-white rounded-2xl shadow-lg border border-[rgba(20,60,35,.08)] p-5 mb-5";
const input = "w-full rounded-xl border border-[rgba(20,60,35,.15)] px-3 py-2.5 text-sm font-semibold bg-white";
const btn = "rounded-xl bg-[#2B8A4E] text-white font-extrabold text-sm px-4 py-2.5 cursor-pointer disabled:opacity-40 disabled:cursor-default";
const label = "text-[11px] font-extrabold tracking-wide text-[#5d6f63] mb-1 block";

function fmtWhen(iso: string) {
  return new Intl.DateTimeFormat(undefined, { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(iso));
}
function relDay(iso: string) {
  const d = new Date(iso); const now = new Date();
  const day = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diff = Math.round((day(d) - day(now)) / 86400000);
  return diff === 0 ? "Today" : diff === 1 ? "Tomorrow" : diff > 1 && diff < 7 ? `In ${diff} days` : "";
}

export default function TeamPage() {
  const [data, setData] = useState<TeamData | null>(null);
  const [loadErr, setLoadErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const r = await fetch("/api/team", { cache: "no-store" });
    if (!r.ok) { setLoadErr("Couldn't load your team."); return; }
    setData(await r.json());
  }, []);
  useEffect(() => { void load(); }, [load]);

  const post = useCallback(async (url: string, body: unknown, method = "POST") => {
    setBusy(true); setMsg(null);
    try {
      const r = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: method === "DELETE" ? undefined : JSON.stringify(body) });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) { setMsg({ ok: false, text: j.error || "Something went wrong" }); return null; }
      await load();
      return j;
    } finally { setBusy(false); }
  }, [load]);

  if (loadErr) return <Shell><p className="text-sm font-bold text-[#E0463B]">{loadErr}</p></Shell>;
  if (!data) return <Shell><p className="text-sm font-bold text-[#5d6f63]">Loading…</p></Shell>;

  return (
    <Shell>
      {msg && (
        <div className={clsx("rounded-xl px-4 py-3 mb-4 text-sm font-bold", msg.ok ? "bg-[#eaf6ee] text-[#1e5e36]" : "bg-[#fdecea] text-[#b3261e]")}>{msg.text}</div>
      )}
      {data.setupNeeded && (
        <div className="rounded-xl px-4 py-3 mb-4 text-sm font-bold bg-[#fff6e0] text-[#8a5a00]">Training scheduling is still being set up — check back shortly.</div>
      )}

      <Upcoming sessions={data.sessions} coachTeamIds={data.coached.map((t) => t.id)} onCancel={async (id) => {
        if (await post(`/api/training?id=${id}`, null, "DELETE")) setMsg({ ok: true, text: "Session cancelled — your players were notified." });
      }} busy={busy} />

      {data.me.canCoach && (
        <CoachPanel teams={data.coached} busy={busy}
          onCreate={async (name) => { if (await post("/api/team", { action: "create", name })) setMsg({ ok: true, text: `Team "${name}" created. Share the join code with your players.` }); }}
          onRemove={async (teamId, userId) => { await post("/api/team", { action: "removeMember", teamId, userId }); }}
          onSchedule={async (payload) => {
            const j = await post("/api/training", payload);
            if (j) setMsg({ ok: true, text: j.members ? `Training scheduled. ${j.emailed} of ${j.members} players emailed — they'll get a reminder the day of.` : "Training scheduled. No players on this team yet — share the join code." });
            return !!j;
          }}
        />
      )}

      <JoinPanel joined={data.joined} busy={busy}
        onJoin={async (code) => { const j = await post("/api/team", { action: "join", code }); if (j) setMsg({ ok: true, text: `You joined ${j.team?.name ?? "the team"}!` }); }}
        onLeave={async (teamId) => { await post("/api/team", { action: "leave", teamId }); }}
      />
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex-1 flex flex-col items-center p-4">
      <div className="w-full max-w-xl">
        <Link href="/" className="inline-flex items-center gap-1.5 text-sm font-bold text-[#5d6f63] mb-4 hover:text-[#1F6E3D]">← Home</Link>
        <h1 className="font-[Fredoka] font-bold text-2xl text-[#16241c] mb-4">Team &amp; Training</h1>
        {children}
      </div>
    </main>
  );
}

function Upcoming({ sessions, coachTeamIds, onCancel, busy }: { sessions: Session[]; coachTeamIds: string[]; onCancel: (id: string) => void; busy: boolean }) {
  return (
    <div className={card}>
      <p className="text-xs font-extrabold tracking-wide text-[#5d6f63] mb-3">UPCOMING TRAINING</p>
      {sessions.length === 0 ? (
        <p className="text-sm font-semibold text-[#5d6f63]">Nothing scheduled yet.</p>
      ) : (
        <div className="flex flex-col gap-2.5">
          {sessions.map((s) => {
            const lesson = s.lesson_id ? LESSONS[s.lesson_id] : null;
            const rel = relDay(s.starts_at);
            return (
              <div key={s.id} className="rounded-xl border border-[rgba(20,60,35,.1)] p-3.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-[Fredoka] font-semibold text-base text-[#16241c] leading-tight">{s.title}</p>
                    <p className="text-[13px] font-bold text-[#2B8A4E] mt-0.5">
                      {rel && <span className="mr-1.5 rounded bg-[#eaf6ee] px-1.5 py-0.5 text-[10px] uppercase tracking-wide">{rel}</span>}
                      {fmtWhen(s.starts_at)} · {s.duration_min} min
                    </p>
                    <p className="text-[12px] font-semibold text-[#5d6f63] mt-0.5">{s.teamName}{s.location ? ` · ${s.location}` : ""}</p>
                  </div>
                  {coachTeamIds.includes(s.team_id) && (
                    <button disabled={busy} onClick={() => { if (confirmCancel()) onCancel(s.id); }}
                      className="shrink-0 text-[11px] font-extrabold text-[#E0463B] hover:underline cursor-pointer disabled:opacity-40">Cancel</button>
                  )}
                </div>
                {s.notes && <p className="text-[13px] font-semibold text-[#33433a] mt-2 whitespace-pre-wrap">{s.notes}</p>}
                {lesson && (
                  <Link href={`/learn/${s.lesson_id}`} className="inline-block mt-2 text-[12px] font-extrabold text-[#2E6FE0] hover:underline">
                    Prep lesson: {lesson.title} →
                  </Link>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
// Cancelling emails the whole team, so confirm in-page first.
function confirmCancel() { return typeof window === "undefined" ? false : window.confirm("Cancel this session? Your players will be emailed."); }

function CoachPanel({ teams, busy, onCreate, onRemove, onSchedule }: {
  teams: CoachedTeam[]; busy: boolean;
  onCreate: (name: string) => void;
  onRemove: (teamId: string, userId: string) => void;
  onSchedule: (p: Record<string, unknown>) => Promise<boolean>;
}) {
  const [teamName, setTeamName] = useState("");
  const [teamId, setTeamId] = useState(teams[0]?.id ?? "");
  useEffect(() => { if (!teams.find((t) => t.id === teamId)) setTeamId(teams[0]?.id ?? ""); }, [teams, teamId]);
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("17:30");
  const [duration, setDuration] = useState(60);
  const [location, setLocation] = useState("");
  const [notes, setNotes] = useState("");
  const [lessonId, setLessonId] = useState("");
  const lessonOptions = useMemo(() => Object.values(LESSONS).map((l) => ({ id: l.id, title: l.title })).sort((a, b) => a.title.localeCompare(b.title)), []);

  const schedule = async () => {
    if (!teamId || !title.trim() || !date || !time) return;
    const startsAt = new Date(`${date}T${time}`).toISOString(); // coach's local time
    const ok = await onSchedule({
      teamId, title, startsAt, durationMin: duration, location, notes, lessonId,
      tz: Intl.DateTimeFormat().resolvedOptions().timeZone,
    });
    if (ok) { setTitle(""); setNotes(""); setLessonId(""); }
  };

  return (
    <>
      <div className={card}>
        <p className="text-xs font-extrabold tracking-wide text-[#5d6f63] mb-3">SCHEDULE TRAINING</p>
        {teams.length === 0 ? (
          <p className="text-sm font-semibold text-[#5d6f63]">Create a team below first — then you can schedule training for it.</p>
        ) : (
          <div className="flex flex-col gap-3">
            {teams.length > 1 && (
              <div><span className={label}>TEAM</span>
                <select value={teamId} onChange={(e) => setTeamId(e.target.value)} className={input}>
                  {teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select></div>
            )}
            <div><span className={label}>TITLE</span>
              <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} placeholder="e.g. Rondos + finishing" className={input} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><span className={label}>DATE</span><input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={input} /></div>
              <div><span className={label}>START TIME</span><input type="time" value={time} onChange={(e) => setTime(e.target.value)} className={input} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><span className={label}>LENGTH</span>
                <select value={duration} onChange={(e) => setDuration(+e.target.value)} className={input}>
                  {[30, 45, 60, 75, 90, 120].map((m) => <option key={m} value={m}>{m} min</option>)}
                </select></div>
              <div><span className={label}>LOCATION (optional)</span>
                <input value={location} onChange={(e) => setLocation(e.target.value)} maxLength={200} placeholder="Field 3" className={input} /></div>
            </div>
            <div><span className={label}>PREP LESSON (optional)</span>
              <select value={lessonId} onChange={(e) => setLessonId(e.target.value)} className={input}>
                <option value="">— none —</option>
                {lessonOptions.map((l) => <option key={l.id} value={l.id}>{l.title}</option>)}
              </select></div>
            <div><span className={label}>NOTES FOR PLAYERS (optional)</span>
              <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} maxLength={2000} placeholder="Bring shin guards and water." className={clsx(input, "resize-none")} /></div>
            <button onClick={schedule} disabled={busy || !teamId || !title.trim() || !date || !time} className={btn}>
              {busy ? "…" : "Schedule & notify players"}
            </button>
          </div>
        )}
      </div>

      <div className={card}>
        <p className="text-xs font-extrabold tracking-wide text-[#5d6f63] mb-3">MY TEAMS</p>
        {teams.map((t) => (
          <div key={t.id} className="rounded-xl border border-[rgba(20,60,35,.1)] p-3.5 mb-3">
            <div className="flex items-center justify-between gap-2">
              <p className="font-[Fredoka] font-semibold text-base text-[#16241c]">{t.name}</p>
              <span className="text-[11px] font-extrabold text-[#5d6f63]">JOIN CODE <span className="ml-1 rounded-lg bg-[#16241c] text-white px-2 py-1 tracking-[.2em] font-mono text-sm">{t.joinCode}</span></span>
            </div>
            <p className="text-[12px] font-semibold text-[#5d6f63] mt-2 mb-1.5">{t.members.length} player{t.members.length === 1 ? "" : "s"}</p>
            <div className="flex flex-wrap gap-1.5">
              {t.members.map((m) => (
                <span key={m.id} className="inline-flex items-center gap-1.5 rounded-full bg-[#eef3ee] px-2.5 py-1 text-[12px] font-bold text-[#33433a]">
                  {m.name}
                  <button title="Remove from team" disabled={busy} onClick={() => onRemove(t.id, m.id)} className="text-[#9aa79f] hover:text-[#E0463B] cursor-pointer">×</button>
                </span>
              ))}
            </div>
          </div>
        ))}
        <div className="flex gap-2">
          <input value={teamName} onChange={(e) => setTeamName(e.target.value)} maxLength={60} placeholder="New team name (e.g. U10 Blue)" className={input} />
          <button disabled={busy || !teamName.trim()} onClick={() => { onCreate(teamName.trim()); setTeamName(""); }} className={clsx(btn, "shrink-0")}>Create</button>
        </div>
      </div>
    </>
  );
}

function JoinPanel({ joined, busy, onJoin, onLeave }: { joined: JoinedTeam[]; busy: boolean; onJoin: (code: string) => void; onLeave: (teamId: string) => void }) {
  const [code, setCode] = useState("");
  return (
    <div className={card}>
      <p className="text-xs font-extrabold tracking-wide text-[#5d6f63] mb-3">TEAMS I&apos;M ON</p>
      {joined.length === 0 && <p className="text-sm font-semibold text-[#5d6f63] mb-3">Not on a team yet. Ask your coach for the join code.</p>}
      {joined.map((t) => (
        <div key={t.id} className="flex items-center justify-between rounded-xl border border-[rgba(20,60,35,.1)] px-3.5 py-2.5 mb-2">
          <div><p className="text-sm font-bold text-[#16241c]">{t.name}</p><p className="text-[11px] font-semibold text-[#5d6f63]">Coach: {t.coachName}</p></div>
          <button disabled={busy} onClick={() => onLeave(t.id)} className="text-[11px] font-extrabold text-[#9aa79f] hover:text-[#E0463B] cursor-pointer">Leave</button>
        </div>
      ))}
      <div className="flex gap-2 mt-1">
        <input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} maxLength={10} placeholder="Join code" className={clsx(input, "uppercase tracking-[.2em] font-mono")} />
        <button disabled={busy || code.trim().length < 4} onClick={() => { onJoin(code.trim()); setCode(""); }} className={clsx(btn, "shrink-0")}>Join</button>
      </div>
    </div>
  );
}
