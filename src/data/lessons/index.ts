// Registry of all lessons + courses for the Learn flow. Courses port the lab's
// COURSES list; for the first milestone only the spacing lesson is fully built —
// other lesson ids are listed so the course UI shows the full curriculum with
// "coming soon" states, and get filled in during the content port.
import type { Lesson, Course } from "@/types/lessons";
import { SPACING_LESSON } from "./spacing";
import { MEET_SHAPE_LESSON } from "./meet-shape";
import { RESTARTS_LESSON } from "./restarts";

export const LESSONS: Record<string, Lesson> = {
  [MEET_SHAPE_LESSON.id]: MEET_SHAPE_LESSON,
  [SPACING_LESSON.id]: SPACING_LESSON,
  [RESTARTS_LESSON.id]: RESTARTS_LESSON,
};

export function getLesson(id: string): Lesson | undefined {
  return LESSONS[id];
}

export const COURSES: Course[] = [
  {
    id: "5v5-beginner",
    title: "5v5 Beginner",
    icon: "🟢",
    level: "beginner",
    description:
      "Start here! Learn the fundamentals of 5v5 soccer: kickoffs, spacing, direction, playing out from the goalkeeper, finding space, and what to do when you lose the ball.",
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
    lessonIds: ["restarts-build-from-back", "when-we-win-ball", "helping-teammate-2v1", "game-day-situations"],
  },
];
