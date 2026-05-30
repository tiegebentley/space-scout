"use client";
// Course + lesson browser. Lists courses (lab COURSES port) and their lessons.
// A lesson is openable when it's built (exists in the LESSONS registry); others
// show "coming soon". Completed lessons get a check, pulled from the store.
import Link from "next/link";
import { clsx } from "clsx";
import { COURSES, LESSONS, getLesson } from "@/data/lessons";
import { useGameStore } from "@/stores/gameStore";

const LEVEL_STYLES: Record<string, string> = {
  beginner: "text-[#2B8A4E]",
  intermediate: "text-[#B07E00]",
  advanced: "text-[#E0463B]",
};

export default function LearnPage() {
  // Select the stable array reference (not a fresh `?? []`, which would change
  // the snapshot every render and trigger a Zustand update loop).
  const completed = useGameStore((s) => s.progress.completedLessons) ?? [];

  return (
    <main className="flex-1 flex flex-col items-center p-4">
      <div className="w-full max-w-xl">
        <div className="flex items-center justify-between mb-4">
          <Link href="/" className="text-xs font-extrabold text-[#5d6f63] hover:underline">← Home</Link>
        </div>
        <h1 className="font-[Fredoka] font-bold text-3xl text-[#16241c] mb-1">Learn</h1>
        <p className="text-sm font-bold text-[#5d6f63] mb-6">
          Work through a lesson, then put it into practice in a live game.
        </p>

        <div className="flex flex-col gap-6">
          {COURSES.map((course) => (
            <div key={course.id}>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xl">{course.icon}</span>
                <h2 className="font-[Fredoka] font-semibold text-xl text-[#16241c]">{course.title}</h2>
                <span className={clsx("text-[10px] font-extrabold uppercase tracking-wide", LEVEL_STYLES[course.level])}>
                  {course.level}
                </span>
              </div>
              <p className="text-xs font-semibold text-[#5d6f63] mb-3">{course.description}</p>

              <div className="flex flex-col gap-2">
                {course.lessonIds.map((id) => {
                  const lesson = getLesson(id);
                  const built = !!lesson && id in LESSONS;
                  const done = completed.includes(id);
                  const title = lesson?.title ?? prettifyId(id);

                  if (!built) {
                    return (
                      <div key={id} className="flex items-center justify-between rounded-xl bg-[#f3f5f3] border border-[rgba(20,60,35,.08)] px-4 py-3 opacity-60">
                        <span className="text-sm font-bold text-[#5d6f63]">{title}</span>
                        <span className="text-[10px] font-extrabold uppercase tracking-wide text-[#9aa79f]">Coming soon</span>
                      </div>
                    );
                  }
                  return (
                    <Link key={id} href={`/learn/${id}`} className="block">
                      <div className="flex items-center justify-between rounded-xl bg-white border border-[rgba(20,60,35,.1)] shadow-sm px-4 py-3 active:translate-y-[1px] transition-transform cursor-pointer">
                        <div>
                          <p className="text-sm font-bold text-[#16241c]">{title}</p>
                          {lesson?.description && (
                            <p className="text-[11px] font-semibold text-[#5d6f63]">{lesson.description}</p>
                          )}
                        </div>
                        {done ? (
                          <span className="shrink-0 ml-3 inline-flex items-center justify-center w-7 h-7 rounded-full bg-[#2B8A4E] text-white text-sm font-bold">✓</span>
                        ) : (
                          <span className="shrink-0 ml-3 text-[#2E6FE0] font-extrabold">›</span>
                        )}
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}

function prettifyId(id: string): string {
  return id.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}
