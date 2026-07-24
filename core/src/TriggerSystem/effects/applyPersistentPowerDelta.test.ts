/**
 * applyPersistentPowerDelta — permanent power changes are a run-level
 * mechanic: they must survive combat boundaries (a regression here silently
 * corrupts the whole run). Previously only covered indirectly.
 */
/// <reference types="jest" />

import {
  registerBaseCollection,
  resetCardRegistry,
  makeTestUnit,
  setupCombat,
  runUntil,
  filterLogs,
} from "../../__test_utils__/combatHarness";
import * as Unit from "../../Entities/Unit";
import * as Constants from "../../Constants";
import { increasePower, self } from "../../data/effectBuilders";
import { applyPersistentPowerDelta } from "./applyPersistentPowerDelta";

beforeAll(registerBaseCollection);
afterAll(resetCardRegistry);

describe("applyPersistentPowerDelta", () => {
  it("applies a permanent delta to both power and bonusPower", () => {
    const unit = makeTestUnit({ effects: [], power: 10 });
    unit.id = "target";
    const { env } = setupCombat([unit]);
    const csUnit = env.combatState.unitById.get("target")!;

    const applied = applyPersistentPowerDelta(env, csUnit, 5, true);

    expect(applied).toBe(5);
    expect(csUnit.power).toBe(15);
    expect(csUnit.bonusPower).toBe(5);
  });

  it("does not touch bonusPower for non-permanent deltas", () => {
    const unit = makeTestUnit({ effects: [], power: 10 });
    unit.id = "target";
    const { env } = setupCombat([unit]);
    const csUnit = env.combatState.unitById.get("target")!;

    const applied = applyPersistentPowerDelta(env, csUnit, 5, false);

    expect(applied).toBe(5);
    expect(csUnit.power).toBe(15);
    expect(csUnit.bonusPower).toBe(0);
  });

  it("clamps at zero power and reports the actual applied delta", () => {
    const unit = makeTestUnit({ effects: [], power: 10 });
    unit.id = "target";
    const { env } = setupCombat([unit]);
    const csUnit = env.combatState.unitById.get("target")!;

    const applied = applyPersistentPowerDelta(env, csUnit, -25, true);

    expect(applied).toBe(-10);
    expect(csUnit.power).toBe(0);
    expect(csUnit.bonusPower).toBe(-10);
  });

  it("writes the delta through to the persistent unit in combatState.units", () => {
    // Some callers hold a different instance with the same id (e.g. a unit
    // snapshot); the canonical instance in combatState.units must still get
    // the delta so it is carried back after combat.
    const unit = makeTestUnit({ effects: [], power: 10 });
    unit.id = "target";
    const { env } = setupCombat([unit]);
    const csUnit = env.combatState.unitById.get("target")!;
    const detached = { ...csUnit };

    const applied = applyPersistentPowerDelta(env, detached, 7, true);

    expect(applied).toBe(7);
    expect(detached.power).toBe(17);
    expect(detached.bonusPower).toBe(7);
    expect(csUnit.power).toBe(17);
    expect(csUnit.bonusPower).toBe(7);
  });

  it("applies the delta only once when the target IS the persistent unit", () => {
    const unit = makeTestUnit({ effects: [], power: 10 });
    unit.id = "target";
    const { env } = setupCombat([unit]);
    const csUnit = env.combatState.unitById.get("target")!;

    applyPersistentPowerDelta(env, csUnit, 7, true);

    expect(csUnit.power).toBe(17);
    expect(csUnit.bonusPower).toBe(7);
  });

  it("does not write through for enemy (CPU) units — they are ephemeral", () => {
    const cpuUnit = makeTestUnit({ effects: [], power: 10 });
    cpuUnit.id = "cpu-target";
    cpuUnit.force = Constants.FORCE_ID_CPU;
    const { env } = setupCombat([]);
    // Add the CPU unit to the fight (past combat-state creation, so this
    // instance is the one resolveTargets would hand to an effect).
    env.combatState.units.push(cpuUnit);
    const detached = { ...cpuUnit };

    const applied = applyPersistentPowerDelta(env, detached, 7, true);

    expect(applied).toBe(7);
    // The target itself always receives the delta…
    expect(detached.power).toBe(17);
    expect(detached.bonusPower).toBe(7);
    // …but the persistent enemy instance is left untouched.
    expect(cpuUnit.power).toBe(10);
    expect(cpuUnit.bonusPower).toBe(0);
  });
});

describe("permanent power across combat boundaries", () => {
  it("permanent increase_power survives a stat reset via bonusPower", () => {
    const buffer = makeTestUnit({
      effects: [increasePower(5, self, true)],
      power: 10,
      cooldown: 500,
    });
    buffer.id = "perm-buffer";
    const { combatState, combatRunner } = setupCombat([buffer]);

    runUntil(
      combatRunner,
      combatState,
      (logs) => filterLogs(logs, "increase_power").length >= 1,
    );

    const csBuffer = combatState.unitById.get("perm-buffer")!;
    expect(csBuffer.power).toBe(15);
    expect(csBuffer.bonusPower).toBe(5);

    // Between combats, unit stats are recomputed from the card definition;
    // bonusPower is what carries permanent deltas into the next combat.
    Unit.resetUnitStats(csBuffer);
    expect(csBuffer.power).toBe(15);
  });

  it("non-permanent increase_power is lost on stat reset", () => {
    const buffer = makeTestUnit({
      effects: [increasePower(5, self, false)],
      power: 10,
      cooldown: 500,
    });
    buffer.id = "temp-buffer";
    const { combatState, combatRunner } = setupCombat([buffer]);

    runUntil(
      combatRunner,
      combatState,
      (logs) => filterLogs(logs, "increase_power").length >= 1,
    );

    const csBuffer = combatState.unitById.get("temp-buffer")!;
    expect(csBuffer.power).toBe(15);
    expect(csBuffer.bonusPower).toBe(0);

    Unit.resetUnitStats(csBuffer);
    expect(csBuffer.power).toBe(10);
  });
});
