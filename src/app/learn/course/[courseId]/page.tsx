"use client";
// Course detail — the lesson list for one course (reached from a course card on
// /learn). Built lessons are playable; others show "coming soon". Built-in
// lessons carry an Edit button that forks an editable copy into the author.
import { use } from "react";
import Link from "next/link";
import { clsx } from "clsx";
import { COURSES, LESSONS, getLesson } from "@/data/lessons";
import { useGameStore } from "@/stores/gameStore";

const LEVEL_STYLES: Record<string, string> = {
  beginner: "text-[#2B8A4E]",
  intermediate: "text-[#B07E00]",
  advanced: "text-[#E0463B]",
};

export default function CoursePage({ params }: { params: Promise<{ courseId: string }> }) {
  const { courseId } = use(params);
  const completed = useGameStore((s) => s.progress.completedLessons) ?? [];
  const course = COURSES.find((c) => c.id === courseId);

  if (!course) {
    return (
      <main className="flex-1 flex flex-col items-center justify-center p-6 text-center">
        <p className="font-[Fredoka] font-bold text-xl text-[#16241c] mb-2">Course not found</p>
        <Link href="/learn" className="rounded-xl bg-[#2E6FE0] text-white font-bold px-5 py-2.5 text-sm">← Back to courses</Link>
      </main>
    );
  }

  return (
    <main className="flex-1 flex flex-col items-center p-4">
      <div className="w-full max-w-xl">
        <Link href="/learn" className="text-xs font-extrabold text-[#5d6f63] hover:underline">← Courses</Link>
        <div className="flex items-center gap-2 mt-2 mb-1">
          <span className="text-2xl">{course.icon}</span>
          <h1 className="font-[Fredoka] font-bold text-2xl text-[#16241c]">{course.title}</h1>
          <span className={clsx("text-[10px] font-extrabold uppercase tracking-wide", LEVEL_STYLES[course.level])}>{course.level}</span>
        </div>
        <p className="text-sm font-semibold text-[#5d6f63] mb-5">{course.description}</p>

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
              <div key={id} className="flex items-center gap-2 rounded-xl bg-white border border-[rgba(20,60,35,.1)] shadow-sm px-4 py-3">
                <Link href={`/learn/${id}`} className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-[#16241c]">{title}</p>
                  {lesson?.description && <p className="text-[11px] font-semibold text-[#5d6f63]">{lesson.description}</p>}
                </Link>
                {done && <span className="shrink-0 inline-flex items-center justify-center w-7 h-7 rounded-full bg-[#2B8A4E] text-white text-sm font-bold">✓</span>}
                <Link href={`/author?edit=${id}`} title="Edit (makes your own copy)" className="shrink-0 rounded-lg bg-white border border-[rgba(20,60,35,.15)] text-[#2E6FE0] text-[11px] font-extrabold px-2.5 py-1.5">Edit</Link>
              </div>
            );
          })}
        </div>
      </div>
    </main>
  );
}

function prettifyId(id: string): string {
  return id.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}
