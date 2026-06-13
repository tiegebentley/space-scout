"use client";
import { use } from "react";
import Link from "next/link";
import { LessonPlayer } from "@/components/lessons/LessonPlayer";
import { resolveLesson, canAccessLesson } from "@/data/lessons";
import { useGameStore } from "@/stores/gameStore";
import { useAuth } from "@/lib/auth/AuthProvider";

// Next 16: params is a Promise. In a client component we unwrap it with use().
export default function LessonPage({ params }: { params: Promise<{ lessonId: string }> }) {
  const { lessonId } = use(params);
  const customLessons = useGameStore((s) => s.customLessons) ?? [];
  const { role } = useAuth();
  const isMaster = role === "master";
  // Active version: a saved in-app edit of a built-in wins over the shipped one.
  const lesson = resolveLesson(lessonId, customLessons);

  // Access gate (direct-URL guard): lessons inside a locked course are blocked
  // for non-admins. Only the 5v5 Pilot's lessons are open to everyone for now.
  if (lesson && !canAccessLesson(lessonId, isMaster)) {
    return (
      <main className="flex-1 flex flex-col items-center justify-center p-6 text-center">
        <span className="text-4xl mb-3">🔒</span>
        <p className="font-[Fredoka] font-bold text-xl text-[#16241c] mb-2">Lesson locked</p>
        <p className="text-sm font-semibold text-[#5d6f63] mb-4">This lesson isn&apos;t available on your account yet. Start with the 5v5 Pilot Course.</p>
        <Link href="/learn" className="rounded-xl bg-[#2E6FE0] text-white font-bold px-5 py-2.5 text-sm">
          ← Back to lessons
        </Link>
      </main>
    );
  }

  if (!lesson) {
    return (
      <main className="flex-1 flex flex-col items-center justify-center p-6 text-center">
        <p className="font-[Fredoka] font-bold text-xl text-[#16241c] mb-2">Lesson coming soon</p>
        <p className="text-sm font-semibold text-[#5d6f63] mb-4">This lesson hasn&apos;t been built yet.</p>
        <Link href="/learn" className="rounded-xl bg-[#2E6FE0] text-white font-bold px-5 py-2.5 text-sm">
          ← Back to lessons
        </Link>
      </main>
    );
  }

  return <LessonPlayer lesson={lesson} />;
}
