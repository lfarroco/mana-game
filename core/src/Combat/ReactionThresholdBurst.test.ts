/**
 * Threshold burst collapse (2026-09-05).
 *
 * Bug: a unit arriving at 25k shield with an `every_100_shield` reaction
 * generated 250 identical reaction events in a single frame — flooding the
 * effects, the combat log (the transmitted event data), and the playback FX.
 *
 * Fix: same-frame crossings of one (force, reaction) collapse into ONE burst
 * firing (CombatRunner step 3.5 + TriggerSystem's `burst` param):
 *   - linear magnitudes scale × burst  ("+10 power" × 3 fires → one "+30"),
 *   - duration effects (haste/slow/charge) apply once per DISTINCT target at
 *     their base duration — a burst of 250 hastes reaches at most the team's
 *     9 units at 500ms each, never 250 × 500ms of stacking,
 *   - random targeting samples distinct targets without replacement.
 *
 * The tracker-level unit tests (CombatStatsTracker.test.ts) cover the raw
 * crossings; these cover the runner-level collapse semantics.
 */
/// <reference types="jest" />

import {
  registerBaseCollection,
  resetCardRegistry,
  makeTestUnit,
  setupCombat,
  runFrames,
  filterLogs,
} from "../__test_utils__/combatHarness";
import * as Models from "../Models";
import * as Constants from "../Constants";
import * as CombatStatsTracker from "./CombatStatsTracker";
import {
  charge,
  haste,
  increasePower,
  poison,
  randomAlly,
  reaction,
  self,
} from "../data/effectBuilders";

beforeAll(registerBaseCollection);
afterAll(resetCardRegistry);

/**
 * Build a PLAYER team whose only source of the tracked stat is a direct
 * CombatStatsTracker call, so the first frame sees exactly `shieldAmount` of
 * shield and produces a clean same-frame burst. All units have cooldown 99999
 * (they never cast on their own).
 */
function buildBurstBoard(
  reactor: Models.Unit,
  allyCount: number,
): {
  combatState: Models.CombatState;
  combatRunner: ReturnType<typeof setupCombat>["combatRunner"];
  env: Models.CombatEnvironment;
} {
  // The 8 board cells besides the reactor's [1, 1].
  const allyCells: Array<[number, number]> = [
    [0, 0],
    [0, 1],
    [0, 2],
    [1, 0],
    [2, 0],
    [1, 2],
    [2, 1],
    [2, 2],
  ];
  const allies: Models.Unit[] = [];
  for (let i = 0; i < allyCount; i++) {
    const ally = makeTestUnit({
      effects: [],
      cooldown: 99999,
      position: allyCells[i],
    });
    ally.id = `burst-ally-${i}`;
    allies.push(ally);
  }

  const { combatState, combatRunner, env } = setupCombat([reactor, ...allies]);
  return { combatState, combatRunner, env };
}

/** Push `shieldAmount` of shield onto the player force BEFORE frame 1. */
function trackShieldBurst(
  env: Models.CombatEnvironment,
  source: Models.Unit,
  shieldAmount: number,
): void {
  CombatStatsTracker.trackShield(
    env.combatStates.combatStatsTrackerState,
    source,
    shieldAmount,
  );
}

function makeShieldReactor(
  effect: Models.Effect,
  id = "burst-reactor",
): Models.Unit {
  const reactor = makeTestUnit({
    effects: [],
    reactions: [reaction("every_100_shield", "allies", effect)],
    power: 10,
    cooldown: 99999,
    position: [1, 1],
  });
  reactor.id = id;
  return reactor;
}

const SHIELD_25K = 25_000; // 250 crossings of every_100_shield

describe("threshold burst collapse", () => {
  it("collapses 250 same-frame shield crossings into ONE scaled power reaction", () => {
    const reactor = makeShieldReactor(increasePower(5, self));
    const { combatState, combatRunner, env } = buildBurstBoard(reactor, 0);

    trackShieldBurst(env, reactor, SHIELD_25K);
    runFrames(combatRunner, combatState, 1);

    const reactionLogs = filterLogs(
      combatRunner.getEnv().logger.getLogs(),
      "reaction",
    );
    expect(reactionLogs.filter((l) => l.unitId === reactor.id)).toHaveLength(1); // 1 burst, not 250 crossings

    const powerLogs = filterLogs(
      combatRunner.getEnv().logger.getLogs(),
      "increase_power",
    ).filter((l) => l.targetId === reactor.id);
    expect(powerLogs).toHaveLength(1);
    expect(powerLogs[0].amount).toBe(5 * 250); // "+5 power" × 250 → "+1250"
    expect(powerLogs[0].permanent).toBe(false);

    // The full burst magnitude was applied to the reactor's power.
    expect(combatState.unitById.get(reactor.id)!.power).toBe(10 + 1250);
  });

  it("single crossing (burst of 1) keeps the old per-crossing behavior", () => {
    const reactor = makeShieldReactor(increasePower(5, self));
    const { combatState, combatRunner, env } = buildBurstBoard(reactor, 0);

    trackShieldBurst(env, reactor, 100); // exactly one crossing
    runFrames(combatRunner, combatState, 1);

    const logs = combatRunner.getEnv().logger.getLogs();
    expect(
      filterLogs(logs, "reaction").filter((l) => l.unitId === reactor.id),
    ).toHaveLength(1);
    expect(
      filterLogs(logs, "increase_power").filter(
        (l) => l.targetId === reactor.id,
      ),
    ).toHaveLength(1);
    expect(combatState.unitById.get(reactor.id)!.power).toBe(15); // 10 + 5
  });

  it("a haste burst hits DISTINCT allies once each at the base duration", () => {
    // Reactor + 3 allies + auto-added core = 4 eligible random allies
    // (random_ally excludes the reactor itself).
    const reactor = makeShieldReactor(haste(500, randomAlly(1)));
    const { combatState, combatRunner, env } = buildBurstBoard(reactor, 3);

    trackShieldBurst(env, reactor, SHIELD_25K);
    // 1 frame fires the burst; ~13 more let the 200ms projectiles land.
    runFrames(combatRunner, combatState, 15);

    const logs = combatRunner.getEnv().logger.getLogs();
    const casts = filterLogs(logs, "haste_cast");
    // 250 crossings → 4 distinct targets (the whole eligible pool), NOT 250
    // hastes and NOT one 125000ms haste.
    expect(casts).toHaveLength(4);
    expect(casts.every((c) => c.effectDuration === 500)).toBe(true);
    const castTargets = casts.map((c) => c.targetId);
    expect(new Set(castTargets).size).toBe(4);

    // The reactor is never a target of its own random-ally haste.
    expect(castTargets).not.toContain(reactor.id);

    // Projectiles landed: each distinct target holds one base-duration haste
    // (slightly decayed by the frames after landing), never 500 × 250.
    const hits = filterLogs(logs, "haste_hit");
    expect(hits).toHaveLength(4);
    expect(hits.every((h) => h.effectDuration === 500)).toBe(true);

    const playerUnits = combatState.units.filter(
      (u) => u.force === Constants.FORCE_ID_PLAYER,
    );
    for (const unit of playerUnits) {
      if (unit.id === reactor.id) {
        expect(unit.hasted).toBe(0); // never targeted by its own haste
      } else {
        expect(unit.hasted).toBeGreaterThan(0);
        expect(unit.hasted).toBeLessThanOrEqual(500); // no stacking
      }
    }
  });

  it("a charge burst caps at distinct targets without scaling the amount", () => {
    const reactor = makeShieldReactor(charge(300, randomAlly(1)));
    const { combatState, combatRunner, env } = buildBurstBoard(reactor, 3);

    trackShieldBurst(env, reactor, SHIELD_25K);
    runFrames(combatRunner, combatState, 15);

    const logs = combatRunner.getEnv().logger.getLogs();
    const casts = filterLogs(logs, "charge_cast");
    // 250 crossings → 4 distinct targets, each charged the base 300ms.
    expect(casts).toHaveLength(4);
    expect(casts.every((c) => c.amount === 300)).toBe(true);
    expect(new Set(casts.map((c) => c.targetId)).size).toBe(4);

    const hits = filterLogs(logs, "charge_hit");
    expect(hits).toHaveLength(4);
    expect(hits.every((h) => h.amount === 300)).toBe(true);
  });

  it("a reaction-sourced basic scales its amount across the burst", () => {
    // "every 100 shield → poison" — a 250-crossing burst is ONE poison cast
    // worth 250× the single-cast amount instead of 250 casts.
    const reactor = makeShieldReactor(poison); // power 10 → 10 × 0.1 = 1 base
    const { combatState, combatRunner, env } = buildBurstBoard(reactor, 0);

    trackShieldBurst(env, reactor, SHIELD_25K);
    runFrames(combatRunner, combatState, 15);

    const logs = combatRunner.getEnv().logger.getLogs();
    const casts = filterLogs(logs, "poison_cast").filter(
      (l) => l.sourceId === reactor.id,
    );
    expect(casts).toHaveLength(1);
    expect(casts[0].amount).toBeCloseTo(1 * 250, 6);
  });

  it("covers the whole eligible team when the burst exceeds its size (cap ≤ 9)", () => {
    // Full 9-unit team (core + reactor + 7 allies); random_ally pool = 8.
    const reactor = makeShieldReactor(haste(500, randomAlly(1)));

    const core = makeTestUnit({
      effects: [],
      isCore: true,
      cooldown: 99999,
      life: 500,
      position: [0, 0],
    });
    core.id = "burst-core";

    const cells: Array<[number, number]> = [
      [0, 1],
      [0, 2],
      [1, 0],
      [2, 0],
      [1, 2],
      [2, 1],
      [2, 2],
    ];
    const allies = cells.map((position, i) => {
      const ally = makeTestUnit({
        effects: [],
        cooldown: 99999,
        position,
      });
      ally.id = `burst-ally-${i}`;
      return ally;
    });

    const { combatState, combatRunner, env } = setupCombat([
      core,
      reactor,
      ...allies,
    ]);

    trackShieldBurst(env, reactor, SHIELD_25K);
    runFrames(combatRunner, combatState, 15);

    const casts = filterLogs(
      combatRunner.getEnv().logger.getLogs(),
      "haste_cast",
    );
    // min(250, pool of 8) → 8 distinct targets, one base application each —
    // the burst never exceeds the team size even with 250 crossings.
    expect(casts).toHaveLength(8);
    expect(casts.every((c) => c.effectDuration === 500)).toBe(true);
    expect(new Set(casts.map((c) => c.targetId)).size).toBe(8);
  });
});
