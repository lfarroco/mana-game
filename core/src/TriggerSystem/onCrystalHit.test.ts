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
  runUntil,
} from "../__test_utils__/combatHarness";
import * as CombatSimulation from "../Combat/CombatSimulation";
import * as CombatRunner from "../Combat/CombatRunner";
import * as Constants from "../math/Constants";
import * as Models from "../Models";
import { damage } from "../data/effectBuilders";

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
