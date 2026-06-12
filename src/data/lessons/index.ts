// Registry of all lessons + courses for the Learn flow. Courses port the lab's
// COURSES list; for the first milestone only the spacing lesson is fully built —
// other lesson ids are listed so the course UI shows the full curriculum with
// "coming soon" states, and get filled in during the content port.
import type { Lesson, Course } from "@/types/lessons";
import { SPACING_LESSON } from "./spacing";
import { MEET_SHAPE_LESSON } from "./meet-shape";
import { RESTARTS_LESSON } from "./restarts";
import { PLAYING_OUT_BACK_LESSON } from "./playing-out-back";
import { RONDO_WHAT_LESSON } from "./rondo-what";
import { GROUND_CONTROL_LESSON } from "./ground-control";
import { RONDO_3V1_LESSON } from "./rondo-3v1";
import { AROUND_THROUGH_OVER_LESSON } from "./around-through-over";
import { ESCAPE_PRESS_LESSON } from "./escape-press";
import { WIN_IT_BACK_LESSON } from "./win-it-back";
import { TALK_AND_SHAPES_LESSON } from "./talk-and-shapes";
import { ITS_A_RONDO_LESSON } from "./its-a-rondo";

export const LESSONS: Record<string, Lesson> = {
  [MEET_SHAPE_LESSON.id]: MEET_SHAPE_LESSON,
  [SPACING_LESSON.id]: SPACING_LESSON,
  [RESTARTS_LESSON.id]: RESTARTS_LESSON,
  [PLAYING_OUT_BACK_LESSON.id]: PLAYING_OUT_BACK_LESSON,
  [RONDO_WHAT_LESSON.id]: RONDO_WHAT_LESSON,
  [GROUND_CONTROL_LESSON.id]: GROUND_CONTROL_LESSON,
  [RONDO_3V1_LESSON.id]: RONDO_3V1_LESSON,
  [AROUND_THROUGH_OVER_LESSON.id]: AROUND_THROUGH_OVER_LESSON,
  [ESCAPE_PRESS_LESSON.id]: ESCAPE_PRESS_LESSON,
  [WIN_IT_BACK_LESSON.id]: WIN_IT_BACK_LESSON,
  [TALK_AND_SHAPES_LESSON.id]: TALK_AND_SHAPES_LESSON,
  [ITS_A_RONDO_LESSON.id]: ITS_A_RONDO_LESSON,
};

export function getLesson(id: string): Lesson | undefined {
  return LESSONS[id];
}

// Stable id of the saved in-app edit of a built-in lesson. The author saves
// edits of a built-in under this id (see app/author), so it's the single link
// between a shipped lesson and the user's edited version of it.
export function editedIdFor(builtinId: string): string {
  return `custom-of-${builtinId}`;
}

// Resolve the ACTIVE version of a lesson id, given the user's saved lessons:
//   • built-in WITH a saved edit  → the saved edit (your edits win everywhere)
//   • built-in with no edit       → the shipped built-in
//   • a custom lesson id          → that custom lesson
// This is what the course view + player should render so in-app edits replace
// what the course shows. getLesson() stays pristine for "revert to original".
export function resolveLesson(id: string, customLessons: Lesson[]): Lesson | undefined {
  const builtin = getLesson(id);
  if (builtin) {
    return customLessons.find((l) => l.id === editedIdFor(id)) ?? builtin;
  }
  return customLessons.find((l) => l.id === id);
}

// True when this id is a saved edit of a built-in (so the Learn page can avoid
// double-listing it under "Your Lessons" — it already shows inside its course).
export function isEditOfBuiltin(id: string): boolean {
  return id.startsWith("custom-of-");
}

export const COURSES: Course[] = [
  {
    id: "5v5-pilot",
    title: "5v5 Pilot Course",
    icon: "🚀",
    level: "beginner",
    description:
      "The pilot course: three focused 5v5 lessons. Start by learning to play out of the back through the #6, then build from there.",
    lessonIds: [
      "playing-out-of-the-back",
      "pilot-lesson-2",
      "pilot-lesson-3",
    ],
  },
  {
    id: "share-the-ball",
    title: "Share the Ball — Rondos",
    icon: "🔺",
    level: "beginner",
    description:
      "When you hit a wall, share the ball! An 8-lesson 5v5 journey for young players: first touch, triangles, playing around–through–over pressure, escaping the press, winning the ball back, talking, and making shapes — from your first rondo to real-game IQ.",
    lessonIds: [
      "rondo-what",
      "ground-control",
      "rondo-3v1",
      "around-through-over",
      "escape-the-press",
      "win-it-back",
      "talk-and-shapes",
      "its-a-rondo",
    ],
  },
  {
    id: "5v5-beginner",
    title: "5v5 Beginner",
    icon: "🟢",
    level: "beginner",
    description:
      "Start here! Learn the fundamentals of 5v5 soccer: kickoffs, spacing, direction, playing out from the goalkeeper, finding space, and what to do when you lose the ball.",
    comingSoon: true,
    lessonIds: [
      "meet-5v5-shape",
      "kickoff-basics",
      "spacing-dont-bunch",
      "which-way",
      "playing-out-from-gk",
      "finding-space",
      "when-we-lose-ball",
    ],
  },
  {
    id: "5v5-intermediate",
    title: "5v5 Intermediate",
    icon: "🟡",
    level: "intermediate",
    description:
      "Ready for more? Learn transitions, 2v1 support play, and game-day set pieces like goal kicks, kickoffs, and throw-ins.",
    comingSoon: true,
    lessonIds: ["restarts-build-from-back", "when-we-win-ball", "helping-teammate-2v1", "game-day-situations"],
  },
];
