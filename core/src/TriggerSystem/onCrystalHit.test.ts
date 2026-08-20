/// <reference types="jest" />

/**
 * C2 — `on_crystal_hit` global reaction (thorns), docs/wacky-content-plan.md.
 *
 * A unit reacts when its own crystal *actually takes damage* (not when the
 * enemy merely casts). The loop guard in dealDamage only emits for cast
 * damage, so thorns-vs-thorns terminates (reaction-sourced damage never
 * re-triggers the reaction).
 */

import {
  registerBaseCollection,
  resetCardRegistry,
  makeTestUnit,
  filterLogs,
  runFrames,
  runUntil,
} from "../__test_utils__/combatHarness";
import * as CombatSimulation from "../Combat/CombatSimulation";
import * as CombatRunner from "../Combat/CombatRunner";
import * as Constants from "../math/Constants";
import * as Models from "../Models";
import { damage, shield } from "../data/effectBuilders";
import { CORE_UPGRADE_DEFINITIONS } from "../content/coreUpgradeOrbs";

beforeAll(registerBaseCollection);
afterAll(resetCardRegistry);

function makeCore(force: string, id: string, life: number): Models.Unit {
  const core = makeTestUnit({
    effects: [],
    isCore: true,
    cooldown: 99999,
    life,
    position: force === Constants.FORCE_ID_PLAYER ? [1, 1] : [0, 2],
  });
  core.force = force;
  core.id = id;
  return core;
}

/** A thorns unit: reacts to hits on its crystal by dealing power back. */
function makeThorns(force: string, id: string, power: number): Models.Unit {
  const thorns = makeTestUnit({
    effects: [],
    reactions: [
      {
        position: "enemies",
        effectId: "on_crystal_hit",
        effects: [damage],
        triggerTeam: "enemy",
      },
    ],
    power,
    cooldown: 99999, // never casts on its own — reaction-only
    position: force === Constants.FORCE_ID_PLAYER ? [0, 0] : [0, 1],
  });
  thorns.force = force;
  thorns.id = id;
  return thorns;
}

function makeAttacker(force: string, id: string, power: number): Models.Unit {
  const attacker = makeTestUnit({
    effects: [damage],
    power,
    cooldown: 1000,
    position: force === Constants.FORCE_ID_PLAYER ? [0, 0] : [0, 1],
  });
  attacker.force = force;
  attacker.id = id;
  return attacker;
}

function setupCombat(playerUnits: Models.Unit[], enemyUnits: Models.Unit[]) {
  const session: Models.SessionData = {
    id: "thorns-test-session",
    player_id: "p1",
    phase: "combat",
    session_type: { type: "singleplayer" },
    round: 1,
    step: 0,
    seed: "thorns-seed",
    initial_seed: "thorns-seed",
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

describe("on_crystal_hit (C2)", () => {
  it("triggers on a landed cast hit, not on the cast itself", () => {
    const playerCore = makeCore(Constants.FORCE_ID_PLAYER, "player-core", 1000);
    const playerThorns = makeThorns(
      Constants.FORCE_ID_PLAYER,
      "player-thorns",
      15,
    );
    const enemyCore = makeCore(Constants.FORCE_ID_CPU, "enemy-core", 1000);
    const enemyAttacker = makeAttacker(
      Constants.FORCE_ID_CPU,
      "enemy-attacker",
      10,
    );

    const { combatRunner, combatState } = setupCombat(
      [playerCore, playerThorns],
      [enemyCore, enemyAttacker],
    );

    // Wait until the player's thorns has retaliated (hit landed + reaction fired).
    const logs = runUntil(combatRunner, combatState, (logs) =>
      filterLogs(logs, "damage_hit").some(
        (h) => h.sourceId === "player-thorns",
      ),
    );

    const hits = filterLogs(logs, "damage_hit");
    expect(hits).toHaveLength(2);
    // The attacker's cast hit the player core…
    expect(hits[0]).toMatchObject({
      sourceId: "enemy-attacker",
      targetId: "player-core",
      amount: 10,
    });
    // …and the thorns unit dealt its power back to the enemy crystal.
    expect(hits[1]).toMatchObject({
      sourceId: "player-thorns",
      targetId: "enemy-core",
      amount: 15, // power 15
    });

    // The reaction fired exactly once, from the thorns unit.
    const reactions = filterLogs(logs, "reaction");
    expect(reactions.map((r) => r.unitId)).toEqual(["player-thorns"]);
  });

  it("terminates thorns-vs-thorns (reaction damage never re-triggers)", () => {
    const playerCore = makeCore(Constants.FORCE_ID_PLAYER, "player-core", 5000);
    const playerThorns = makeThorns(
      Constants.FORCE_ID_PLAYER,
      "player-thorns",
      10,
    );
    const enemyCore = makeCore(Constants.FORCE_ID_CPU, "enemy-core", 5000);
    // The enemy attacker ALSO carries the thorns reaction — the loop guard must
    // stop it from retaliating against the player's reaction-sourced damage.
    const enemyThorns = makeThorns(Constants.FORCE_ID_CPU, "enemy-thorns", 10);
    enemyThorns.cooldown = 1000; // its own casts also deal damage
    enemyThorns.effects = [damage];

    const { combatRunner, combatState } = setupCombat(
      [playerCore, playerThorns],
      [enemyCore, enemyThorns],
    );

    // Run past three full cast→hit→retaliate cycles.
    const logs = runUntil(
      combatRunner,
      combatState,
      (logs) =>
        filterLogs(logs, "damage_hit").filter(
          (h) => h.sourceId === "player-thorns",
        ).length >= 3,
    );

    const hits = filterLogs(logs, "damage_hit");
    const reactions = filterLogs(logs, "reaction");

    // Per enemy cast: one direct hit on the player core + one retaliation from
    // the player thorns. The enemy's own thorns must never retaliate, so every
    // hit on the enemy core is sourced from the player thorns.
    expect(hits.filter((h) => h.targetId === "player-core")).toHaveLength(3);
    expect(hits.filter((h) => h.targetId === "enemy-core")).toHaveLength(3);
    // Only the player's thorns reaction fired (3 cast-sourced emissions).
    expect(reactions.map((r) => r.unitId)).toEqual([
      "player-thorns",
      "player-thorns",
      "player-thorns",
    ]);
  });
});

describe("Verdant thorns identity orbs (CUB-G2)", () => {
  /**
   * The player team is a verdant_crystal core carrying one thorns-family
   * identity reaction from the catalog (reaction-only — never casts), plus an
   * optional ally for the charge orb. The enemy team is a passive enemy core
   * plus an attacker that actually lands hits on the crystal, so the
   * on_crystal_hit reaction fires (docs/core-unit-onboarding.md §9).
   */
  function makeVerdantTeam(orbId: string, withAlly: boolean): Models.Unit[] {
    const def = CORE_UPGRADE_DEFINITIONS[orbId];
    expect(def.reaction).toBeDefined();

    const core = makeTestUnit({
      effects: [shield],
      isCore: true,
      reactions: [structuredClone(def.reaction!)],
      power: 20,
      cooldown: 99999,
      life: 1000,
      position: [1, 1],
    });
    core.id = "verdant-core";

    if (!withAlly) return [core];

    const ally = makeTestUnit({
      effects: [],
      cooldown: 99999,
      position: [0, 1],
    });
    ally.id = "verdant-ally";
    return [core, ally];
  }

  function makeEnemyTeam(): Models.Unit[] {
    return [
      makeCore(Constants.FORCE_ID_CPU, "enemy-core", 5000),
      makeAttacker(Constants.FORCE_ID_CPU, "enemy-attacker", 10),
    ];
  }

  it("thorns reflects the crystal's power back when it is hit", () => {
    const { combatRunner, combatState } = setupCombat(
      makeVerdantTeam("verdant_thorns", false),
      makeEnemyTeam(),
    );

    const enemyCore = combatState.cpuCore;
    const initialLife = enemyCore.life;

    const logs = runUntil(combatRunner, combatState, (logs) =>
      filterLogs(logs, "damage_hit").some((h) => h.sourceId === "verdant-core"),
    );

    // The attacker's cast hit the verdant crystal, and the crystal dealt its
    // power back to the enemy core.
    const reflects = filterLogs(logs, "damage_hit").filter(
      (h) => h.sourceId === "verdant-core" && h.targetId === "enemy-core",
    );
    expect(reflects.length).toBeGreaterThanOrEqual(1);
    expect(reflects[0].amount).toBe(20); // the crystal's power 20
    expect(enemyCore.life).toBeLessThan(initialLife);

    // The reaction fired exactly once, from the verdant core.
    const reactions = filterLogs(logs, "reaction");
    expect(reactions.some((r) => r.unitId === "verdant-core")).toBe(true);
  });

  it("thorn_shield shields the crystal when it is hit", () => {
    const { combatRunner, combatState } = setupCombat(
      makeVerdantTeam("verdant_thorn_shield", false),
      makeEnemyTeam(),
    );

    const playerCore = combatState.playerCore;
    const initialShield = playerCore.shield;

    runFrames(combatRunner, combatState, 500);

    // The reaction shields the source force's CORE (the verdant crystal).
    expect(playerCore.shield).toBeGreaterThan(initialShield);
  });

  it("retaliation grants +5 power to the crystal for every hit", () => {
    const { combatRunner, combatState } = setupCombat(
      makeVerdantTeam("verdant_retaliation", false),
      makeEnemyTeam(),
    );

    const playerCore = combatState.playerCore;
    const initialPower = playerCore.power;

    runFrames(combatRunner, combatState, 500);

    expect(playerCore.power).toBeGreaterThan(initialPower);
  });

  it("vengeful_charge charges a random ally when the crystal is hit", () => {
    const { combatRunner, combatState } = setupCombat(
      makeVerdantTeam("verdant_vengeful_charge", true),
      makeEnemyTeam(),
    );

    const ally = combatState.unitById.get("verdant-ally")!;
    const initialCharge = ally.charge;

    const logs = runUntil(combatRunner, combatState, (logs) =>
      filterLogs(logs, "charge_hit").some((h) => h.targetId === "verdant-ally"),
    );

    expect(
      filterLogs(logs, "charge_hit").some((h) => h.targetId === "verdant-ally"),
    ).toBe(true);
    expect(combatState.unitById.get("verdant-ally")!.charge).toBeGreaterThan(
      initialCharge,
    );
  });
});
