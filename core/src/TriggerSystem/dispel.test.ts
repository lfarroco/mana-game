/// <reference types="jest" />

/**
 * D2 — `dispel` (docs/wacky-content-plan.md).
 *
 * Strips every status from a target: poison/regen stacks (force-keyed) plus
 * the unit's haste, slow, charge, shield, and silence counters. Ally- or
 * enemy-targetable.
 */

import {
  registerBaseCollection,
  resetCardRegistry,
  makeTestUnit,
  filterLogs,
  runUntil,
} from "../__test_utils__/combatHarness";
import * as CombatSimulation from "../Combat/CombatSimulation";
import * as CombatRunner from "../Combat/CombatRunner";
import * as Constants from "../math/Constants";
import * as Models from "../Models";
import * as PoisonSystem from "../Combat/PoisonDamageSystem";
import * as RegenSystem from "../Combat/RegenSystem";
import { dispel, strongestEnemy } from "../data/effectBuilders";

beforeAll(registerBaseCollection);
afterAll(resetCardRegistry);

function makeCore(force: string, id: string): Models.Unit {
  const core = makeTestUnit({
    effects: [],
    isCore: true,
    power: 1,
    cooldown: 99999,
    life: 5000,
    position: force === Constants.FORCE_ID_PLAYER ? [1, 1] : [0, 2],
  });
  core.force = force;
  core.id = id;
  return core;
}

describe("dispel (D2)", () => {
  it("strips every status type from the target", () => {
    const playerCore = makeCore(Constants.FORCE_ID_PLAYER, "player-core");
    const dispeller = makeTestUnit({
      effects: [dispel(strongestEnemy)],
      power: 1,
      cooldown: 1000,
      position: [0, 0],
    });
    dispeller.force = Constants.FORCE_ID_PLAYER;
    dispeller.id = "dispeller";

    const enemyCore = makeCore(Constants.FORCE_ID_CPU, "enemy-core");
    const target = makeTestUnit({
      effects: [],
      power: 20,
      cooldown: 99999, // never performs on its own — statuses must come from dispel
      position: [0, 1],
    });
    target.force = Constants.FORCE_ID_CPU;
    target.id = "target";
    // Pre-load every status so the test can prove dispel cleared them all
    // (long durations so ticking alone would not zero them).
    target.hasted = 100000;
    target.slowed = 100000;
    target.silenced = 100000;
    target.charge = 300;
    target.shield = 50;

    const session: Models.SessionData = {
      id: "dispel-test-session",
      player_id: "p1",
      phase: "combat",
      session_type: { type: "singleplayer" },
      round: 1,
      step: 0,
      seed: "dispel-seed",
      initial_seed: "dispel-seed",
      options: [],
      team: { units: [playerCore, dispeller] },
      wins: 0,
      losses: 0,
      action_log: [],
      encounter_history: [],
    };
    const combatState = CombatSimulation.createCombatState(session, [
      enemyCore,
      target,
    ]);
    const combatRunner = CombatRunner.runCombat(session, combatState);
    const env = combatRunner.getEnv();
    // Poison/regen are force-keyed — stack them on the CPU force.
    env.combatStates.poisonSystemState = PoisonSystem.applyPoison(
      env.combatStates.poisonSystemState,
      Constants.FORCE_ID_CPU,
      25,
    );
    env.combatStates.regenSystemState = RegenSystem.applyRegen(
      env.combatStates.regenSystemState,
      Constants.FORCE_ID_CPU,
      25,
    );

    const logs = runUntil(combatRunner, combatState, (logs) =>
      filterLogs(logs, "dispel_hit").some((l) => l.targetId === "target"),
    );

    expect(filterLogs(logs, "dispel_hit").map((h) => h.targetId)).toContain(
      "target",
    );

    const cleared = combatState.units.find((u) => u.id === "target")!;
    expect(cleared.hasted).toBe(0);
    expect(cleared.slowed).toBe(0);
    expect(cleared.silenced).toBe(0);
    expect(cleared.shield).toBe(0);
    // Charge was 300 at the hit and only re-accumulates frame-by-frame after.
    expect(cleared.charge).toBeLessThan(200);
    expect(
      PoisonSystem.getPoisonRate(
        env.combatStates.poisonSystemState,
        Constants.FORCE_ID_CPU,
      ),
    ).toBe(0);
    expect(
      RegenSystem.getRegenRate(
        env.combatStates.regenSystemState,
        Constants.FORCE_ID_CPU,
      ),
    ).toBe(0);
  });
});
