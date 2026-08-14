import * as CombatLogger from "./CombatLogger";
import type { WaveOutcome } from "../types/combat";
import { collapseStatusTickPairs } from "./collapseStatusTickPairs";

/** Duration assigned to each animation (matches the old phaser constant). */
export const DEFAULT_ANIMATION_DURATION = 400;

export type ScheduledAnimation = {
  log: CombatLogger.CombatLogEntry;
  startTime: number;
  endTime: number;
  executed: boolean;
};

export type PlaybackSchedule = {
  animations: ScheduledAnimation[];
  maxEndTime: number;
  outcome: WaveOutcome | null;
};

/** Collapse status-tick pairs and build the sorted playback timeline. */
export function schedulePlayback(
  logs: CombatLogger.CombatLogEntry[],
  durationMs: number = DEFAULT_ANIMATION_DURATION,
): PlaybackSchedule {
  let maxEnd = 0;
  const animations: ScheduledAnimation[] = [];
  let outcome: WaveOutcome | null = null;

  collapseStatusTickPairs(logs).forEach((log) => {
    const startTime = log.timeMs;
    const endTime = startTime + durationMs;
    if (endTime > maxEnd) maxEnd = endTime;
    animations.push({ log, startTime, endTime, executed: false });
    if (log.type === "outcome") outcome = log.result;
  });

  animations.sort((a, b) => a.startTime - b.startTime);
  return { animations, maxEndTime: maxEnd, outcome };
}
