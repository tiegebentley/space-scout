"use client";
// Learn home — a GRID of course cards (lab style). Click a course to open its
// lesson list at /learn/course/<id>. Authored lessons get their own "Your
// Lessons" section with Edit/Delete. Course cards show completion progress.
import Link from "next/link";
import { clsx } from "clsx";
import { COURSES, LESSONS, isEditOfBuiltin, canAccessCourse } from "@/data/lessons";
import { useGameStore } from "@/stores/gameStore";
import { useAuth } from "@/lib/auth/AuthProvider";

const LEVEL_BADGE: Record<string, string> = {
  beginner: "bg-[#2B8A4E] text-white",
  intermediate: "bg-[#F0B429] text-[#3a2e00]",
  advanced: "bg-[#E0463B] text-white",
};

export default function LearnPage() {
  const completed = useGameStore((s) => s.progress.completedLessons) ?? [];
  const customLessons = useGameStore((s) => s.customLessons) ?? [];
  const deleteCustomLesson = useGameStore((s) => s.deleteCustomLesson);
  const { can, role } = useAuth();
  const isMaster = role === "master";
  // Edits of built-in lessons show inside their course (as the active version),
  // so don't also list them here — only show genuinely standalone custom lessons.
  const ownLessons = customLessons.filter((l) => !isEditOfBuiltin(l.id));
  const canAuthor = can("lesson:createCustom");

  return (
    <main className="flex-1 flex flex-col items-center p-4">
      <div className="w-full max-w-2xl">
        <div className="flex items-center justify-between mb-4">
          <Link href="/" className="text-xs font-extrabold text-[#5d6f63] hover:underline">← Home</Link>
        </div>
        <div className="flex items-center justify-between mb-1">
          <h1 className="font-[Fredoka] font-bold text-3xl text-[#16241c]">Learn</h1>
          {canAuthor && <Link href="/author" className="rounded-xl bg-[#2E6FE0] text-white text-xs font-extrabold px-3 py-2">+ Create lesson</Link>}
        </div>
        <p className="text-sm font-bold text-[#5d6f63] mb-6">Pick a course, then put each lesson into practice in a live game.</p>

        {/* Course cards grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-8">
          {COURSES.map((course) => {
            const builtIds = course.lessonIds.filter((id) => id in LESSONS);
            const doneCount = builtIds.filter((id) => completed.includes(id)).length;
            const total = course.lessonIds.length;
            const pct = total > 0 ? Math.round((doneCount / total) * 100) : 0;

            // Coming-soon courses (everything but the Pilot for now) render greyed
            // out and are NOT clickable — a plain div instead of a Link.
            if (course.comingSoon) {
              return (
                <div key={course.id} className="block" aria-disabled>
                  <div className="relative h-full flex flex-col gap-2 rounded-2xl bg-white border-2 border-[rgba(20,60,35,.1)] shadow-sm p-4 opacity-55 cursor-not-allowed select-none">
                    <span className="absolute top-2.5 right-2.5 text-[9px] font-extrabold uppercase tracking-wide px-2 py-0.5 rounded bg-[#e8f0e6] text-[#5d6f63]">Coming Soon</span>
                    <span className="text-3xl leading-none">{course.icon}</span>
                    <h2 className="font-[Fredoka] font-semibold text-base text-[#16241c] leading-tight">{course.title}</h2>
                    <span className={clsx("self-start text-[9px] font-extrabold uppercase tracking-wide px-2 py-0.5 rounded", LEVEL_BADGE[course.level])}>
                      {course.level}
                    </span>
                  </div>
                </div>
              );
            }

            // Access gate: only the 5v5 Pilot is open to non-admins right now.
            // Every other course renders locked (greyed, not clickable) unless
            // the viewer is the master/admin.
            if (!canAccessCourse(course.id, isMaster)) {
              return (
                <div key={course.id} className="block" aria-disabled>
                  <div className="relative h-full flex flex-col gap-2 rounded-2xl bg-white border-2 border-[rgba(20,60,35,.1)] shadow-sm p-4 opacity-55 cursor-not-allowed select-none">
                    <span className="absolute top-2.5 right-2.5 text-[9px] font-extrabold uppercase tracking-wide px-2 py-0.5 rounded bg-[#e8f0e6] text-[#5d6f63]">🔒 Locked</span>
                    <span className="text-3xl leading-none">{course.icon}</span>
                    <h2 className="font-[Fredoka] font-semibold text-base text-[#16241c] leading-tight">{course.title}</h2>
                    <span className={clsx("self-start text-[9px] font-extrabold uppercase tracking-wide px-2 py-0.5 rounded", LEVEL_BADGE[course.level])}>
                      {course.level}
                    </span>
                  </div>
                </div>
              );
            }

            return (
              <Link key={course.id} href={`/learn/course/${course.id}`} className="block">
                <div className="h-full flex flex-col gap-2 rounded-2xl bg-white border-2 border-[rgba(20,60,35,.1)] shadow-sm p-4 hover:border-[#2E6FE0] hover:-translate-y-0.5 transition-all cursor-pointer">
                  <span className="text-3xl leading-none">{course.icon}</span>
                  <h2 className="font-[Fredoka] font-semibold text-base text-[#16241c] leading-tight">{course.title}</h2>
                  <span className={clsx("self-start text-[9px] font-extrabold uppercase tracking-wide px-2 py-0.5 rounded", LEVEL_BADGE[course.level])}>
                    {course.level}
                  </span>
                  <div className="mt-auto pt-1">
                    <div className="w-full bg-[#e8f0e6] rounded-full h-1.5 overflow-hidden">
                      <div className="h-full bg-[#2B8A4E] rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                    <p className="text-[10px] font-bold text-[#5d6f63] mt-1">{doneCount}/{total} done</p>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>

        {/* Your custom lessons */}
        {ownLessons.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xl">✏️</span>
              <h2 className="font-[Fredoka] font-semibold text-xl text-[#16241c]">Your Lessons</h2>
            </div>
            <div className="flex flex-col gap-2">
              {ownLessons.map((l) => (
                <div key={l.id} className="flex items-center gap-2 rounded-xl bg-white border border-[rgba(20,60,35,.1)] shadow-sm px-4 py-3">
                  <Link href={`/learn/${l.id}`} className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-[#16241c] truncate">{l.title}</p>
                    <p className="text-[11px] font-semibold text-[#5d6f63]">{l.steps.filter((s) => s.kind === "scenario").length} scenarios{completed.includes(l.id) ? " · ✓ done" : ""}</p>
                  </Link>
                  {can("lesson:editOwnCustom") && <>
                    <Link href={`/author?edit=${l.id}`} className="shrink-0 rounded-lg bg-[#2E6FE0] text-white text-[11px] font-extrabold px-2.5 py-1.5">Edit</Link>
                    <button
                      onClick={() => { if (confirm(`Delete "${l.title}"?`)) deleteCustomLesson(l.id); }}
                      className="shrink-0 rounded-lg bg-white border border-[rgba(20,60,35,.15)] text-[#E0463B] text-[11px] font-extrabold px-2.5 py-1.5 cursor-pointer"
                    >Delete</button>
                  </>}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
