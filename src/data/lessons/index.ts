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
import { LW_MODULE_LESSONS } from "./lw-module";
import { RW_MODULE_LESSONS } from "./rw-module";
import { AM_MODULE_LESSONS } from "./am-module";
import { THREE_V_THREE_LESSONS } from "./3v3-fundamentals";
import { CB6_MODULE_LESSONS } from "./cb-6-module";
import { ST9_MODULE_LESSONS } from "./st-9-module";
import { SEVEN_V_SEVEN_LESSONS } from "./7v7-intro";

// Position + small-sided modules register as id→lesson entries like everything else.
const POSITION_MODULE_LESSONS = Object.fromEntries(
  [
    ...LW_MODULE_LESSONS,
    ...RW_MODULE_LESSONS,
    ...AM_MODULE_LESSONS,
    ...THREE_V_THREE_LESSONS,
    ...CB6_MODULE_LESSONS,
    ...ST9_MODULE_LESSONS,
    ...SEVEN_V_SEVEN_LESSONS,
  ].map((l) => [l.id, l]),
);

export const LESSONS: Record<string, Lesson> = {
  ...POSITION_MODULE_LESSONS,
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
    id: "lw-11-module",
    title: "The Left Winger — #11",
    icon: "⚡",
    level: "beginner",
    description:
      "Own the left side! Five lessons on the #11: where the winger lives (wide!), why width stretches defenses, receiving with an open body, being brave 1v1, and the end product — cut-backs, far-post runs, and the sprint back.",
    lessonIds: ["lw-meet", "lw-stay-wide", "lw-receive", "lw-take-on", "lw-complete"],
  },
  {
    id: "rw-7-module",
    title: "The Right Winger — #7",
    icon: "🏹",
    level: "beginner",
    description:
      "Own the right side! Five lessons on the #7: living on the right touchline, the far-side switch secret, give-and-gos with your #10, winning your 1v1, and finishing the job at the far post — then sprinting back.",
    lessonIds: ["rw-meet", "rw-the-switch", "rw-give-and-go", "rw-take-on", "rw-complete"],
  },
  {
    id: "am-10-module",
    title: "The Attacking Mid — #10",
    icon: "🎨",
    level: "intermediate",
    description:
      "Be the creator! Five lessons on the #10: living between the lines, finding pockets, the final pass that sets runners free, turning to shoot, and being the engine that connects everything — including the first press.",
    lessonIds: ["am-meet", "am-find-pocket", "am-final-pass", "am-turn-and-shoot", "am-engine"],
  },
  {
    id: "3v3-fundamentals",
    title: "3v3 Fundamentals",
    icon: "🔻",
    level: "beginner",
    description:
      "Start small, think big! Seven 3v3 lessons for your youngest players: the magic triangle, making yourself big, pass-and-move, support angles, dribble-or-pass decisions, winning the ball back together, and finishing a 3v3 chance.",
    lessonIds: [
      "3v3-magic-triangle",
      "3v3-make-yourself-big",
      "3v3-pass-and-move",
      "3v3-support-angles",
      "3v3-dribble-or-pass",
      "3v3-win-it-back",
      "3v3-score-the-goal",
    ],
  },
  {
    id: "cb-6-module",
    title: "The Anchor — #6",
    icon: "🛡️",
    level: "intermediate",
    description:
      "Be the calm in the storm! Seven lessons on the #6 — the deepest builder and protector: dropping to receive, scanning before the ball arrives, the first pass out, screening the middle, winning it back, and being the pivot that connects everything.",
    lessonIds: [
      "cb6-meet-the-6",
      "cb6-drop-and-receive",
      "cb6-scan-before",
      "cb6-first-pass-out",
      "cb6-screen-the-middle",
      "cb6-win-it-restart",
      "cb6-be-the-pivot",
    ],
  },
  {
    id: "st-9-module",
    title: "The Striker — #9",
    icon: "🎯",
    level: "intermediate",
    description:
      "Score the goals! Seven lessons on the #9: living on the last shoulder, timing runs in behind, checking to the ball, first-time finishing, attacking the near and far post, and pressing from the front to start the defense.",
    lessonIds: [
      "st9-meet-the-9",
      "st9-last-shoulder",
      "st9-run-behind",
      "st9-check-to-ball",
      "st9-first-time-finishing",
      "st9-near-far-post",
      "st9-press-from-front",
    ],
  },
  {
    id: "7v7-intro",
    title: "7v7 Intro",
    icon: "🟦",
    level: "intermediate",
    description:
      "Step up to 7v7! Seven lessons on the bigger game: the 2-3-1 shape, the back two, the midfield three, width from the fullbacks, wide overloads, pressing as a unit, and transition — what all seven do the instant the ball changes hands.",
    lessonIds: [
      "7v7-welcome",
      "7v7-back-two",
      "7v7-midfield-three",
      "7v7-width-fullbacks",
      "7v7-overloads-wide",
      "7v7-pressing-unit",
      "7v7-transition",
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
