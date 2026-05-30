"use client";
// Live "Scenario" lesson step: runs the real GameEngine constrained by the
// step's matchConfig (boundaries via zoneRules, forced restart via
// scenarioSetup) and tracks a ScenarioObjective. Shows an objective HUD and a
// success / try-again panel, then lets the lesson advance.
//
// Retry remounts the inner ScenarioRun (via a key) so useGameLoop builds a
// fresh engine.
import { useCallback, useState } from "react";
import type { MatchConfig, ScenarioObjective } from "@/types/game";
import { ScenarioRun } from "./ScenarioRun";

interface Props {
  matchConfig: Partial<MatchConfig>;
  objective: ScenarioObjective;
  onComplete: () => void;
}

export function ScenarioView({ matchConfig, objective, onComplete }: Props) {
  const [runId, setRunId] = useState(0);
  const retry = useCallback(() => setRunId((n) => n + 1), []);
  return (
    <ScenarioRun
      key={runId}
      matchConfig={matchConfig}
      objective={objective}
      onComplete={onComplete}
      onRetry={retry}
    />
  );
}
