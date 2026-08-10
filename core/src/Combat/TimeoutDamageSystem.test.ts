/// <reference types="jest" />

import * as Timeout from "../Combat/TimeoutDamageSystem";
import * as CombatLogger from "../Combat/CombatLogger";
import * as Constants from "../Constants";
import * as Models from "../Models";

describe("TimeoutDamageSystem", () => {
  describe("initializeTimeoutDamageSystem", () => {
    it("creates an active system with zero elapsed", () => {
      const state = Timeout.initializeTimeoutDamageSystem();
      expect(state.isActive).toBe(true);
      expect(state.combatElapsedTime).toBe(0);
      expect(state.timeSinceLastTick).toBe(0);
      expect(state.stormStarted).toBe(false);
    });
  });

  describe("stopTimeoutDamageSystem", () => {
    it("sets isActive to false", () => {
      const state = Timeout.initializeTimeoutDamageSystem();
      const stopped = Timeout.stopTimeoutDamageSystem(state);
      expect(stopped.isActive).toBe(false);
      expect(stopped.combatElapsedTime).toBe(state.combatElapsedTime);
    });

    it("does not mutate original state", () => {
      const state = Timeout.initializeTimeoutDamageSystem();
      Timeout.stopTimeoutDamageSystem(state);
      expect(state.isActive).toBe(true);
    });
  });

  describe("onTimeoutDamageCombatEnd", () => {
    it("sets isActive to false if active", () => {
      const state = Timeout.initializeTimeoutDamageSystem();
      const result = Timeout.onTimeoutDamageCombatEnd(state);
      expect(result.isActive).toBe(false);
    });

    it("returns already-inactive state unchanged", () => {
      const active = Timeout.initializeTimeoutDamageSystem();
      const stopped = Timeout.stopTimeoutDamageSystem(active);
      const result = Timeout.onTimeoutDamageCombatEnd(stopped);
      expect(result.isActive).toBe(false);
      expect(result).toBe(stopped);
    });
  });

  describe("getTimeoutDamageConfig", () => {
    it("returns config from state", () => {
      const state = Timeout.initializeTimeoutDamageSystem();
      const config = Timeout.getTimeoutDamageConfig(state);
      expect(config.timeoutDamageStartTime).toBe(
        Constants.TIMEOUT_DAMAGE_START_TIME,
      );
      expect(config.timeoutDamageInterval).toBe(1000);
      expect(config.isActive).toBe(true);
      expect(config.combatElapsed).toBe(0);
      expect(config.stormState.stormStarted).toBe(false);
    });

    it("reports stormStarted when elapsed >= start time", () => {
      // Simulate state past the start time
      const state: Timeout.TimeoutSystemState = {
        combatElapsedTime: Constants.TIMEOUT_DAMAGE_START_TIME + 1000,
        timeSinceLastTick: 500,
        isActive: true,
        stormStarted: true,
      };
      const config = Timeout.getTimeoutDamageConfig(state);
      expect(config.stormState.stormStarted).toBe(true);
    });

    it("reports isActive from state", () => {
      const active = Timeout.initializeTimeoutDamageSystem();
      const stopped = Timeout.stopTimeoutDamageSystem(active);
      expect(Timeout.getTimeoutDamageConfig(active).isActive).toBe(true);
      expect(Timeout.getTimeoutDamageConfig(stopped).isActive).toBe(false);
    });
  });
});

describe("updateTimeoutDamageSystem — tick cadence", () => {
  const FRAME_DELTA = 16.67;
  const STORM_START = Constants.TIMEOUT_DAMAGE_START_TIME;
  type TimeoutCastLog = Extract<
    CombatLogger.CombatLogEntry,
    { type: "timeout_damage_cast" }
  >;

  const createMockEnv = (): Models.CombatEnvironment => ({
    seed: "test-seed",
    combatState: {} as Models.CombatState,
    combatStates: {} as Models.CombatSystemStates,
    logger: CombatLogger.createCombatLogger(),
    deferredEvents: [],
  });

  const advance = (
    env: Models.CombatEnvironment,
    state: Timeout.TimeoutSystemState,
    totalMs: number,
  ): Timeout.TimeoutSystemState => {
    let next = state;
    let elapsed = 0;
    while (elapsed < totalMs) {
      elapsed += FRAME_DELTA;
      env.logger.setCurrentTimeMs(elapsed);
      next = Timeout.updateTimeoutDamageSystem(env, next, FRAME_DELTA);
    }
    return next;
  };

  const castsFor = (
    logs: CombatLogger.CombatLogEntry[],
    force: string,
  ): TimeoutCastLog[] =>
    logs.filter(
      (l): l is TimeoutCastLog =>
        l.type === "timeout_damage_cast" && l.force === force,
    );

  it("does not tick or emit storm_start before the storm starts", () => {
    const env = createMockEnv();
    let state = Timeout.initializeTimeoutDamageSystem();

    state = advance(env, state, STORM_START - 1000);

    const logs = env.logger.getLogs();
    expect(logs.filter((l) => l.type === "storm_start")).toHaveLength(0);
    expect(castsFor(logs, Constants.FORCE_ID_PLAYER)).toHaveLength(0);
    expect(state.stormStarted).toBe(false);
  });

  it("logs storm_start before the first timeout cast", () => {
    const env = createMockEnv();
    let state = Timeout.initializeTimeoutDamageSystem();

    state = advance(env, state, STORM_START);

    const logs = env.logger.getLogs();
    const stormIndex = logs.findIndex((l) => l.type === "storm_start");
    const firstCastIndex = logs.findIndex(
      (l) => l.type === "timeout_damage_cast",
    );
    expect(stormIndex).toBeGreaterThanOrEqual(0);
    expect(firstCastIndex).toBeGreaterThan(stormIndex);
  });

  it("ticks exactly once per 1000ms once the storm is active", () => {
    const env = createMockEnv();
    let state = Timeout.initializeTimeoutDamageSystem();

    // 30s pre-storm + 4s of storm: first tick fires on the storm-start frame,
    // then one per 1000ms → 5 ticks total.
    state = advance(env, state, STORM_START + 4000);

    const casts = castsFor(env.logger.getLogs(), Constants.FORCE_ID_PLAYER);
    expect(casts).toHaveLength(5);

    const intervals = casts
      .slice(1)
      .map((cast, i) => cast.timeMs - casts[i].timeMs);
    for (const interval of intervals) {
      expect(interval).toBeGreaterThanOrEqual(950);
      expect(interval).toBeLessThanOrEqual(1050);
    }
  });

  it("schedules one deferred hit per tick (both forces in the same event)", () => {
    const env = createMockEnv();
    let state = Timeout.initializeTimeoutDamageSystem();

    state = advance(env, state, STORM_START + 1500);

    const casts = castsFor(env.logger.getLogs(), Constants.FORCE_ID_PLAYER);
    expect(casts.length).toBeGreaterThanOrEqual(2);
    // Each tick logs 2 casts (one per force) but schedules a single deferred
    // event whose execute() damages both cores.
    expect(env.deferredEvents).toHaveLength(casts.length);

    const castTimes = casts.map((cast) => cast.timeMs);
    for (const event of env.deferredEvents) {
      // Hits are scheduled travelTime (400ms) after the cast that spawned them.
      expect(castTimes).toContain(event.timeMs - 400);
    }
  });
});
