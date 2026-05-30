"use client";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { PlayerProgress, SkillRatings, CompletedDrill, Achievement, GameMode, MatchConfig, WingerBounds, RulePreset } from "@/types/game";
import { XP_TABLE, LEVEL_NAMES, WINGER_X_BOUNDS } from "@/engine/constants";

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
  recordLesson: (lessonId: string) => void;
  updateSkill: (skill: keyof SkillRatings, delta: number) => void;
  unlockAchievement: (achievement: Achievement) => void;

  // winger zones
  wingerBounds: WingerBounds;
  setWingerBounds: (bounds: WingerBounds) => void;

  // custom rule presets
  customPresets: RulePreset[];
  savePreset: (preset: RulePreset) => void;
  deletePreset: (id: string) => void;

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

      recordLesson: (lessonId) =>
        set((s) => {
          const done = s.progress.completedLessons ?? [];
          if (done.includes(lessonId)) return s;
          return {
            progress: { ...s.progress, completedLessons: [...done, lessonId] },
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
      savePreset: (preset) =>
        set((s) => ({
          customPresets: [
            ...s.customPresets.filter((p) => p.id !== preset.id),
            preset,
          ],
        })),
      deletePreset: (id) =>
        set((s) => ({
          customPresets: s.customPresets.filter((p) => p.id !== id),
        })),

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
      }),
    }
  )
);

export { LEVEL_NAMES };
