"use client";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { PlayerProgress, SkillRatings, CompletedDrill, Achievement, GameMode, MatchConfig, WingerBounds, RulePreset } from "@/types/game";
import type { Lesson } from "@/types/lessons";
import { XP_TABLE, LEVEL_NAMES, WINGER_X_BOUNDS } from "@/engine/constants";
import * as sync from "@/lib/sync";

interface GameStore {
  // navigation / mode
  currentMode: GameMode | null;
  matchConfig: MatchConfig;
  setMode: (mode: GameMode | null) => void;
  setMatchConfig: (config: Partial<MatchConfig>) => void;

  // player progress (persisted)
  progress: PlayerProgress;
  addXp: (amount: number) => void;
  recordDrill: (drill: CompletedDrill) => void;
  recordMatch: () => void;
  recordLesson: (lessonId: string, scorePct?: number) => void;
  updateSkill: (skill: keyof SkillRatings, delta: number) => void;
  unlockAchievement: (achievement: Achievement) => void;

  // winger zones
  wingerBounds: WingerBounds;
  setWingerBounds: (bounds: WingerBounds) => void;

  // custom rule presets
  customPresets: RulePreset[];
  savePreset: (preset: RulePreset) => void;
  deletePreset: (id: string) => void;

  // custom lessons authored in /author (persisted locally + synced to Supabase)
  customLessons: Lesson[];
  // ids of lessons published into the shared program (master only). Published
  // lessons resolve as program content for everyone, not "your lessons".
  publishedIds: string[];
  saveCustomLesson: (lesson: Lesson, opts?: { publish?: boolean }) => void;
  deleteCustomLesson: (id: string) => void;
  // Load server content into the store on login, merging any local-only items up.
  hydrateContent: () => Promise<void>;

  // audio
  soundEnabled: boolean;
  toggleSound: () => void;
}

function calcLevel(totalXp: number): { level: number; xp: number; xpToNext: number } {
  let level = 0;
  for (let i = 0; i < XP_TABLE.length; i++) {
    if (totalXp >= XP_TABLE[i]) level = i;
    else break;
  }
  const current = XP_TABLE[level] || 0;
  const next = XP_TABLE[level + 1] || XP_TABLE[XP_TABLE.length - 1] + 5000;
  return { level, xp: totalXp - current, xpToNext: next - current };
}

const DEFAULT_PROGRESS: PlayerProgress = {
  level: 0,
  xp: 0,
  xpToNext: XP_TABLE[1],
  totalXp: 0,
  skills: {
    passing: 20,
    movement: 20,
    defending: 20,
    shooting: 20,
    positioning: 20,
    gameReading: 20,
  },
  drillsCompleted: [],
  matchesPlayed: 0,
  achievements: [],
  completedLessons: [],
  lessonScores: {},
};

export const useGameStore = create<GameStore>()(
  persist(
    (set) => ({
      currentMode: null,
      matchConfig: {
        duration: 180000,
        format: "5v5",
        speed: 38,
        aiDifficulty: "medium",
        buildoutLines: false,
      },
      setMode: (mode) => set({ currentMode: mode }),
      setMatchConfig: (config) =>
        set((s) => ({ matchConfig: { ...s.matchConfig, ...config } })),

      progress: DEFAULT_PROGRESS,

      addXp: (amount) =>
        set((s) => {
          const totalXp = s.progress.totalXp + amount;
          const { level, xp, xpToNext } = calcLevel(totalXp);
          return {
            progress: { ...s.progress, totalXp, level, xp, xpToNext },
          };
        }),

      recordDrill: (drill) =>
        set((s) => ({
          progress: {
            ...s.progress,
            drillsCompleted: [...s.progress.drillsCompleted, drill],
          },
        })),

      recordMatch: () =>
        set((s) => ({
          progress: {
            ...s.progress,
            matchesPlayed: s.progress.matchesPlayed + 1,
          },
        })),

      recordLesson: (lessonId, scorePct) =>
        set((s) => {
          const done = s.progress.completedLessons ?? [];
          const scores = { ...(s.progress.lessonScores ?? {}) };
          if (scorePct != null) {
            scores[lessonId] = Math.max(scores[lessonId] ?? 0, scorePct); // keep best
          }
          return {
            progress: {
              ...s.progress,
              completedLessons: done.includes(lessonId) ? done : [...done, lessonId],
              lessonScores: scores,
            },
          };
        }),

      updateSkill: (skill, delta) =>
        set((s) => ({
          progress: {
            ...s.progress,
            skills: {
              ...s.progress.skills,
              [skill]: Math.min(99, Math.max(1, s.progress.skills[skill] + delta)),
            },
          },
        })),

      unlockAchievement: (achievement) =>
        set((s) => {
          if (s.progress.achievements.some((a) => a.id === achievement.id)) return s;
          return {
            progress: {
              ...s.progress,
              achievements: [...s.progress.achievements, achievement],
            },
          };
        }),

      wingerBounds: { lw: { ...WINGER_X_BOUNDS.lw }, rw: { ...WINGER_X_BOUNDS.rw } },
      setWingerBounds: (bounds) => set({ wingerBounds: bounds }),

      customPresets: [],
      savePreset: (preset) => {
        void sync.upsertPreset({ id: preset.id, name: preset.name ?? "Preset", data: preset });
        set((s) => ({
          customPresets: [
            ...s.customPresets.filter((p) => p.id !== preset.id),
            preset,
          ],
        }));
      },
      deletePreset: (id) => {
        void sync.deletePreset(id);
        set((s) => ({
          customPresets: s.customPresets.filter((p) => p.id !== id),
        }));
      },

      customLessons: [],
      publishedIds: [],
      saveCustomLesson: (lesson, opts) =>
        set((s) => {
          const publish = opts?.publish ?? s.publishedIds.includes(lesson.id);
          // Write through to Supabase (RLS gates who may publish / edit what).
          void sync.upsertLesson(lesson, publish);
          return {
            customLessons: [
              ...s.customLessons.filter((l) => l.id !== lesson.id),
              lesson,
            ],
            publishedIds: publish
              ? Array.from(new Set([...s.publishedIds, lesson.id]))
              : s.publishedIds.filter((id) => id !== lesson.id),
          };
        }),
      deleteCustomLesson: (id) => {
        void sync.deleteLesson(id);
        set((s) => ({
          customLessons: s.customLessons.filter((l) => l.id !== id),
          publishedIds: s.publishedIds.filter((p) => p !== id),
        }));
      },
      hydrateContent: async () => {
        const [remoteLessons, remoteProgress, remotePresets] = await Promise.all([
          sync.fetchLessons(),
          sync.fetchProgress(),
          sync.fetchPresets(),
        ]);
        set((s) => {
          // Merge: server wins on conflicts; local-only lessons get pushed up.
          const serverIds = new Set(remoteLessons.map((r) => r.lesson.id));
          const localOnly = s.customLessons.filter((l) => !serverIds.has(l.id));
          localOnly.forEach((l) => void sync.upsertLesson(l, false)); // migrate up
          const merged = [...remoteLessons.map((r) => r.lesson), ...localOnly];
          const published = remoteLessons.filter((r) => r.isPublished).map((r) => r.lesson.id);
          // Progress: if the server has none yet, push our local progress up.
          if (!remoteProgress) void sync.saveProgress(s.progress);
          const presets = remotePresets.length
            ? remotePresets.map((p) => p.data as RulePreset)
            : s.customPresets;
          return {
            customLessons: merged,
            publishedIds: Array.from(new Set([...s.publishedIds, ...published])),
            progress: remoteProgress ?? s.progress,
            customPresets: presets,
          };
        });
      },

      soundEnabled: true,
      toggleSound: () => set((s) => ({ soundEnabled: !s.soundEnabled })),
    }),
    {
      name: "space-scout-progress",
      partialize: (state) => ({
        progress: state.progress,
        soundEnabled: state.soundEnabled,
        wingerBounds: state.wingerBounds,
        customPresets: state.customPresets,
        customLessons: state.customLessons,
      }),
    }
  )
);

export { LEVEL_NAMES };
