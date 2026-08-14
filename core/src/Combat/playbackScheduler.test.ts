/// <reference types="jest" />

import type { CombatLogEntry } from "./CombatLogger";
import { DEFAULT_ANIMATION_DURATION, schedulePlayback } from "./playbackScheduler";

const tickLog = (
  timeMs: number,
  type: "poison_tick" | "regen_tick",
  amount: number,
): CombatLogEntry => ({
  type,
  force: "player",
  amount,
  newLife: 100,
  lifeDelta: type === "poison_tick" ? -amount : amount,
  timeMs,
});

describe("schedulePlayback", () => {
  it("assigns startTime = log.timeMs and endTime = startTime + DEFAULT_ANIMATION_DURATION", () => {
    const logs = [tickLog(1000, "poison_tick", 10)];

    const schedule = schedulePlayback(logs);

    expect(schedule.animations).toHaveLength(1);
    expect(schedule.animations[0].startTime).toBe(1000);
    expect(schedule.animations[0].endTime).toBe(1000 + DEFAULT_ANIMATION_DURATION);
  });

  it("collapses a poison+regen pair at the same time/force into ONE scheduled animation", () => {
    const logs = [tickLog(1000, "poison_tick", 10), tickLog(1000, "regen_tick", 12)];

    const schedule = schedulePlayback(logs);

    expect(schedule.animations).toHaveLength(1);
    expect(schedule.animations[0].log).toMatchObject({ type: "regen_tick", amount: 2 });
  });

  it("sorts animations by startTime", () => {
    const logs = [
      tickLog(3000, "poison_tick", 10),
      tickLog(1000, "poison_tick", 10),
      tickLog(2000, "poison_tick", 10),
    ];

    const schedule = schedulePlayback(logs);

    expect(schedule.animations.map((a) => a.startTime)).toEqual([1000, 2000, 3000]);
  });

  it("maxEndTime is the largest endTime", () => {
    const logs = [tickLog(1000, "poison_tick", 10), tickLog(3000, "poison_tick", 10)];

    const schedule = schedulePlayback(logs);

    expect(schedule.maxEndTime).toBe(3000 + DEFAULT_ANIMATION_DURATION);
  });

  it("an outcome log sets the schedule outcome", () => {
    const logs: CombatLogEntry[] = [{ type: "outcome", result: "player_won", timeMs: 5000 }];

    const schedule = schedulePlayback(logs);

    expect(schedule.outcome).toBe("player_won");
  });

  it("all animations start with executed: false", () => {
    const logs = [tickLog(1000, "poison_tick", 10), tickLog(2000, "regen_tick", 12)];

    const schedule = schedulePlayback(logs);

    expect(schedule.animations.every((a) => a.executed === false)).toBe(true);
  });
});
