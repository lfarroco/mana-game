/// <reference types="jest" />

/**
 * CUB-G3 — the Void Crystal `void`-theme identity orbs
 * (docs/core-unit-onboarding.md §9).
 *
 * The void identity is disruption / power theft:
 * - void_leech: when an ENEMY heals, shield your crystal (cross-force, mirrors
 *   the A3 "Living Bloodstone" pattern).
 * - void_power_drain: each cast absorbs 25% of the strongest enemy's power.
 * - void_dispel: each cast strips the strongest enemy's statuses (D2).
 * - void_weakness: whenever an ally casts a basic ability, the strongest enemy
 *   loses 5 power.
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
import {
  absorbPower,
  damage,
  decreasePower,
  dispel,
  heal,
  strongestEnemy,
} from "../data/effectBuilders";
import { CORE_UPGRADE_DEFINITIONS } from "../content/coreUpgradeOrbs";

beforeAll(registerBaseCollection);
afterAll(resetCardRegistry);

function makeCore(force: string, id: string, life: number): Models.Unit {
  const core = makeTestUnit({
    effects: [],
    isCore: true,
    cooldown: 99999,
    life,
    power: 1,
    position: force === Constants.FORCE_ID_PLAYER ? [1, 1] : [0, 2],
  });
  core.force = force;
  core.id = id;
  return core;
}

/**
 * A void_crystal core. By default it carries the baseline damage +
 * decrease_power cast and is reaction-only (never casts) — pass
 * `extraEffects` for the effect orbs (power_drain / dispel) and a working
 * `cooldown` so it actually casts.
 */
function makeVoidCore(opts: {
  orbId?: keyof typeof CORE_UPGRADE_DEFINITIONS;
  extraEffects?: Models.Effect[];
  cooldown?: number;
}): Models.Unit {
  const orb =
    opts.orbId === undefined ? undefined : CORE_UPGRADE_DEFINITIONS[opts.orbId];
  if (orb !== undefined) {
    expect(orb.reaction).toBeDefined();
  }

  const core = makeTestUnit({
    effects: [
      damage,
      decreasePower(10, strongestEnemy),
      ...(opts.extraEffects ?? []),
    ],
    isCore: true,
    reactions: orb !== undefined ? [structuredClone(orb.reaction!)] : [],
    power: 40,
    cooldown: opts.cooldown ?? 99999,
    life: 1000,
    position: [1, 1],
  });
  core.id = "void-core";
  return core;
}

function makeEnemyTeam(
  opts: {
    attackerPower?: number;
    withHealer?: boolean;
  } = {},
): Models.Unit[] {
  const enemyCore = makeCore(Constants.FORCE_ID_CPU, "enemy-core", 5000);
  const units: Models.Unit[] = [enemyCore];

  if (opts.attackerPower) {
    const attacker = makeTestUnit({
      effects: [damage],
      power: opts.attackerPower,
      cooldown: 500,
      position: [0, 0],
    });
    attacker.force = Constants.FORCE_ID_CPU;
    attacker.id = "enemy-attacker";
    units.push(attacker);
  }

  if (opts.withHealer) {
    const healer = makeTestUnit({
      effects: [heal],
      power: 20,
      cooldown: 500,
      position: [0, 1],
    });
    healer.force = Constants.FORCE_ID_CPU;
    healer.id = "enemy-healer";
    units.push(healer);
  }

  return units;
}

function setupCombat(playerUnits: Models.Unit[], enemyUnits: Models.Unit[]) {
  const session: Models.SessionData = {
    id: "void-test-session",
    player_id: "p1",
    phase: "combat",
    session_type: { type: "singleplayer" },
    round: 1,
    step: 0,
    seed: "void-seed",
    initial_seed: "void-seed",
    options: [],
    team: { units: playerUnits },
    wins: 0,
    losses: 0,
    action_log: [],
    encounter_history: [],
  };
  const combatState = CombatSimulation.createCombatState(session, enemyUnits);
  const combatRunner = CombatRunner.runCombat(session, combatState);
  return { combatRunner, combatState };
}

describe("Void identity orbs (CUB-G3)", () => {
  it("void_leech shields the crystal when an enemy heals", () => {
    const core = makeVoidCore({ orbId: "void_leech" });
    const { combatRunner, combatState } = setupCombat(
      [core],
      makeEnemyTeam({ withHealer: true }),
    );

    const playerCore = combatState.playerCore;
    const initialShield = playerCore.shield;

    // The shield lands via a deferred event 200ms after the reaction fires —
    // wait for the actual shield hit on the player core.
    const logs = runUntil(combatRunner, combatState, (logs) =>
      filterLogs(logs, "shield_hit").some((h) => h.targetId === playerCore.id),
    );

    // The reaction fired from the void core and the shield landed on the
    // PLAYER core — the enemy heal granted OUR crystal shield.
    expect(playerCore.shield).toBeGreaterThan(initialShield);
    const reactions = filterLogs(logs, "reaction");
    expect(reactions.some((r) => r.unitId === "void-core")).toBe(true);
  });

  it("void_power_drain absorbs the strongest enemy's power each cast", () => {
    const core = makeVoidCore({
      extraEffects: [absorbPower(strongestEnemy)],
      cooldown: 500,
    });
    const { combatRunner, combatState } = setupCombat(
      [core],
      makeEnemyTeam({ attackerPower: 100 }),
    );

    const playerCore = combatState.playerCore;
    const attacker = combatState.units.find((u) => u.id === "enemy-attacker")!;
    const initialCorePower = playerCore.power;
    const initialAttackerPower = attacker.power;

    runUntil(combatRunner, combatState, (logs) =>
      filterLogs(logs, "decrease_power").some(
        (l) => l.targetId === "enemy-attacker",
      ),
    );

    // The baseline decrease_power AND the absorb stole from the attacker; the
    // absorbed 25% went to the void core.
    expect(attacker.power).toBeLessThan(initialAttackerPower);
    expect(playerCore.power).toBeGreaterThan(initialCorePower);
  });

  it("void_dispel strips the strongest enemy's statuses", () => {
    const core = makeVoidCore({
      extraEffects: [dispel(strongestEnemy)],
      cooldown: 500,
    });
    const { combatRunner, combatState } = setupCombat(
      [core],
      makeEnemyTeam({ attackerPower: 100 }),
    );

    const attacker = combatState.units.find((u) => u.id === "enemy-attacker")!;
    attacker.hasted = 1000;
    attacker.shield = 500;

    runUntil(
      combatRunner,
      combatState,
      (logs) => filterLogs(logs, "dispel_hit").length > 0,
    );

    // Dispel cleared the target's haste and shield (D2).
    expect(attacker.hasted).toBe(0);
    expect(attacker.shield).toBe(0);
  });

  it("void_weakness saps the strongest enemy when an ally casts a basic ability", () => {
    const core = makeVoidCore({ orbId: "void_weakness" });
    const ally = makeTestUnit({
      effects: [damage],
      power: 5,
      cooldown: 500,
      position: [0, 1],
    });
    ally.id = "player-ally";

    const { combatRunner, combatState } = setupCombat(
      [core, ally],
      makeEnemyTeam({ attackerPower: 100 }),
    );

    const attacker = combatState.units.find((u) => u.id === "enemy-attacker")!;
    const initialAttackerPower = attacker.power;

    const logs = runUntil(combatRunner, combatState, (logs) =>
      filterLogs(logs, "decrease_power").some(
        (l) => l.sourceId === "void-core",
      ),
    );

    // The ally's cast triggered the void core's reaction, which sapped the
    // strongest enemy's power.
    const reactions = filterLogs(logs, "reaction");
    expect(reactions.some((r) => r.unitId === "void-core")).toBe(true);
    expect(attacker.power).toBeLessThan(initialAttackerPower);
  });
});
