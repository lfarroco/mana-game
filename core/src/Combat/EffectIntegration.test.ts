/**
 * Integration tests for each effect type in the combat simulation.
 * Validates that each effect produces correct combat logs.
 */
/// <reference types="jest" />

import {
  registerBaseCollection,
  resetCardRegistry,
  makeTestUnit,
  setupCombat,
  runFrames,
  runUntil,
  filterLogs,
} from "../__test_utils__/combatHarness";
import * as Constants from "../Constants";

beforeAll(registerBaseCollection);
afterAll(resetCardRegistry);

describe("Effect integration — damage", () => {
  it("produces damage_cast and damage_hit logs with correct amounts", () => {
    const unit = makeTestUnit({
      effects: [{ id: "damage" }],
      power: 25,
      cooldown: 500,
    });
    unit.id = "damage-unit";
    const { combatState, combatRunner } = setupCombat([unit]);

    const logs = runFrames(combatRunner, combatState, 200);

    const castLogs = logs.filter((l) => l.type === "damage_cast");
    const hitLogs = logs.filter((l) => l.type === "damage_hit");
    expect(castLogs.length).toBeGreaterThanOrEqual(1);
    for (const cast of castLogs) {
      expect(cast.amount).toBe(25);
    }
    for (const hit of hitLogs) {
      expect(hit.amount).toBe(25);
    }
  });

  it("kills the enemy core with enough damage and logs player_won", () => {
    const unit = makeTestUnit({
      effects: [{ id: "damage" }],
      power: 40,
      cooldown: 300,
    });
    unit.id = "damage-killer";
    const { combatState, combatRunner } = setupCombat([unit], 200);

    const logs = runFrames(combatRunner, combatState, 1000);

    const outcomeLogs = filterLogs(logs, "outcome");
    expect(outcomeLogs.length).toBe(1);
    expect(outcomeLogs[0].result).toBe("player_won");

    const hitLogs = logs.filter((l) => l.type === "damage_hit");
    const totalDamage = hitLogs.reduce((sum, h) => sum + h.amount, 0);
    expect(totalDamage).toBeGreaterThanOrEqual(200);
  });

  it("is fully absorbed by shield: shieldDelta < 0 and lifeDelta = 0", () => {
    const unit = makeTestUnit({
      effects: [{ id: "damage" }],
      power: 25,
      cooldown: 500,
    });
    unit.id = "shielded-damage-unit";
    const { combatState, combatRunner } = setupCombat([unit]);
    combatState.cpuCore.shield = 100;

    const logs = runUntil(
      combatRunner,
      combatState,
      (logs) => filterLogs(logs, "damage_hit").length >= 1,
    );

    const hit = filterLogs(logs, "damage_hit")[0];
    expect(hit.amount).toBe(25);
    expect(hit.shieldDelta).toBe(-25);
    expect(hit.lifeDelta).toBe(0);
    expect(hit.newShield).toBe(75);
    expect(hit.newLife).toBe(combatState.cpuCore.maxLife);
  });

  it("overflow damage spills into life after depleting shield", () => {
    const unit = makeTestUnit({
      effects: [{ id: "damage" }],
      power: 25,
      cooldown: 500,
    });
    unit.id = "shield-overflow-unit";
    const { combatState, combatRunner } = setupCombat([unit]);
    combatState.cpuCore.shield = 10;
    const cpuLife = combatState.cpuCore.life;

    const logs = runUntil(
      combatRunner,
      combatState,
      (logs) => filterLogs(logs, "damage_hit").length >= 1,
    );

    const hit = filterLogs(logs, "damage_hit")[0];
    expect(hit.shieldDelta).toBe(-10);
    expect(hit.lifeDelta).toBe(-15);
    expect(hit.newShield).toBe(0);
    expect(hit.newLife).toBe(cpuLife - 15);
  });
});

describe("Effect integration — heal", () => {
  it("produces heal_cast and heal_hit logs with lifeDelta > 0", () => {
    const unit = makeTestUnit({
      effects: [{ id: "heal" }],
      power: 20,
      cooldown: 500,
    });
    unit.id = "heal-unit";
    const { combatState, combatRunner } = setupCombat([unit]);

    // Damage the player core so there is life to restore
    const playerCore = combatState.playerCore;
    playerCore.life = Math.floor(playerCore.maxLife / 2);

    const logs = runFrames(combatRunner, combatState, 200);

    const castLogs = logs.filter((l) => l.type === "heal_cast");
    const hitLogs = logs.filter((l) => l.type === "heal_hit");
    expect(castLogs.length).toBeGreaterThanOrEqual(1);
    expect(castLogs[0].amount).toBe(20);
    expect(hitLogs.length).toBeGreaterThanOrEqual(1);
    expect(hitLogs[0].lifeDelta).toBeGreaterThan(0);
  });
});

describe("Effect integration — shield", () => {
  it("produces shield_cast and shield_hit logs with shieldDelta > 0", () => {
    const unit = makeTestUnit({
      effects: [{ id: "shield" }],
      power: 15,
      cooldown: 500,
    });
    unit.id = "shield-unit";
    const { combatState, combatRunner } = setupCombat([unit]);

    const logs = runFrames(combatRunner, combatState, 200);

    const castLogs = logs.filter((l) => l.type === "shield_cast");
    const hitLogs = logs.filter((l) => l.type === "shield_hit");
    expect(castLogs.length).toBeGreaterThanOrEqual(1);
    expect(castLogs[0].amount).toBe(15);
    expect(hitLogs.length).toBeGreaterThanOrEqual(1);
    expect(hitLogs[0].shieldDelta).toBeGreaterThan(0);
  });
});

describe("Effect integration — poison", () => {
  it("produces poison_cast with amount = power * 0.1 and poison_tick on CPU", () => {
    const unit = makeTestUnit({
      effects: [{ id: "poison" }],
      power: 40,
      cooldown: 500,
    });
    unit.id = "poison-unit";
    const { combatState, combatRunner } = setupCombat([unit]);

    const logs = runFrames(combatRunner, combatState, 300);

    const castLogs = logs.filter((l) => l.type === "poison_cast");
    expect(castLogs.length).toBeGreaterThanOrEqual(1);
    expect(castLogs[0].amount).toBe(4);

    const tickLogs = logs.filter((l) => l.type === "poison_tick");
    expect(tickLogs.length).toBeGreaterThanOrEqual(1);
    for (const tick of tickLogs) {
      expect(tick.force).toBe(Constants.FORCE_ID_CPU);
    }
  });
});

describe("Effect integration — regen", () => {
  it("produces regen_cast with amount = power * 0.1 and regen_tick on PLAYER", () => {
    const unit = makeTestUnit({
      effects: [{ id: "regen" }],
      power: 40,
      cooldown: 500,
    });
    unit.id = "regen-unit";
    const { combatState, combatRunner } = setupCombat([unit]);

    // Damage the player core so regen has something to heal
    const playerCore = combatState.playerCore;
    playerCore.life = Math.floor(playerCore.maxLife / 2);

    const logs = runFrames(combatRunner, combatState, 300);

    const castLogs = logs.filter((l) => l.type === "regen_cast");
    expect(castLogs.length).toBeGreaterThanOrEqual(1);
    expect(castLogs[0].amount).toBe(4);

    const tickLogs = logs.filter((l) => l.type === "regen_tick");
    expect(tickLogs.length).toBeGreaterThanOrEqual(1);
    for (const tick of tickLogs) {
      expect(tick.force).toBe(Constants.FORCE_ID_PLAYER);
    }
  });
});
