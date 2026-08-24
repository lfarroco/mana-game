/**
 * Integration tests for reactions in the combat simulation.
 * Validates that reactions fire based on triggers: on_battle_start,
 * by effect type, by position, enemies, and global triggers.
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
import * as Constants from "../Constants";
import * as Models from "../Models";
import * as Card from "../Entities/Card";

beforeAll(registerBaseCollection);
afterAll(resetCardRegistry);

describe("Reaction — on_battle_start", () => {
  it("fires on_battle_start reaction that increases own power", () => {
    const reactor = makeTestUnit({
      effects: [],
      reactions: [
        {
          position: "self",
          effectId: "on_battle_start",
          effects: [
            {
              id: "increase_power",
              amount: 5,
              permanent: false,
              targets: { id: "self" },
            },
          ],
        },
      ],
      power: 10,
      cooldown: 99999,
    });
    reactor.id = "battle-start-reactor";
    const { combatState, combatRunner } = setupCombat([reactor]);

    const logs = runFrames(combatRunner, combatState, 10);

    // on_battle_start reactions are processed during runCombat init
    const incLogs = logs.filter((l) => l.type === "increase_power");
    expect(incLogs.length).toBeGreaterThanOrEqual(1);
    expect(incLogs[0].amount).toBe(5);
    const csReactor = combatState.unitById.get("battle-start-reactor")!;
    expect(csReactor.power).toBe(15);
  });
});

describe("Reaction — by effect type", () => {
  it("fires when a specific effect type is triggered by another unit", () => {
    const reactor = makeTestUnit({
      effects: [],
      reactions: [
        {
          position: "allies",
          effectId: "damage",
          effects: [
            {
              id: "increase_power",
              amount: 3,
              permanent: false,
              targets: { id: "self" },
            },
          ],
        },
      ],
      power: 10,
      cooldown: 99999,
      position: [1, 0],
    });
    reactor.id = "effect-reactor";

    const damager = makeTestUnit({
      effects: [{ id: "damage" }],
      power: 20,
      cooldown: 500,
      position: [0, 0],
    });
    damager.id = "effect-damager";

    const { combatState, combatRunner } = setupCombat([reactor, damager]);

    const logs = runFrames(combatRunner, combatState, 200);

    const reactionLogs = logs.filter(
      (l) => l.type === "reaction" && l.unitId === reactor.id,
    );
    expect(reactionLogs.length).toBeGreaterThanOrEqual(2);

    const incLogs = logs.filter(
      (l) => l.type === "increase_power" && l.targetId === reactor.id,
    );
    expect(incLogs.length).toBeGreaterThanOrEqual(2);
    const csReactor = combatState.unitById.get("effect-reactor")!;
    expect(csReactor.power).toBeGreaterThan(10);
  });

  it("does NOT fire for unmatched effect types", () => {
    const reactor = makeTestUnit({
      effects: [],
      reactions: [
        {
          position: "allies",
          effectId: "shield",
          effects: [
            {
              id: "increase_power",
              amount: 5,
              permanent: false,
              targets: { id: "self" },
            },
          ],
        },
      ],
      power: 10,
      cooldown: 99999,
    });
    reactor.id = "unmatched-reactor";

    const damager = makeTestUnit({
      effects: [{ id: "damage" }],
      power: 20,
      cooldown: 500,
    });
    damager.id = "unmatched-damager";

    const { combatState, combatRunner } = setupCombat([reactor, damager]);

    const logs = runFrames(combatRunner, combatState, 200);

    const reactionLogs = logs.filter((l) => l.type === "reaction");
    expect(reactionLogs.length).toBe(0);
    expect(reactor.power).toBe(10);
  });
});

describe("Reaction — by position", () => {
  it("row_allies: fires for same-row ally triggering damage", () => {
    const reactor = makeTestUnit({
      effects: [],
      reactions: [
        {
          position: "row_allies",
          effectId: "damage",
          effects: [
            {
              id: "increase_power",
              amount: 3,
              permanent: false,
              targets: { id: "self" },
            },
          ],
        },
      ],
      power: 10,
      cooldown: 99999,
      position: [0, 1],
    });
    reactor.id = "row-reactor";

    const sameRowDamager = makeTestUnit({
      effects: [{ id: "damage" }],
      power: 20,
      cooldown: 500,
      position: [2, 1],
    });
    sameRowDamager.id = "same-row-damager";

    const diffRowDamager = makeTestUnit({
      effects: [{ id: "damage" }],
      power: 20,
      cooldown: 99999,
      position: [0, 0],
    });
    diffRowDamager.id = "diff-row-damager";

    const { combatState, combatRunner } = setupCombat([
      reactor,
      sameRowDamager,
      diffRowDamager,
    ]);

    const logs = runFrames(combatRunner, combatState, 200);

    const reactionLogs = logs.filter(
      (l) => l.type === "reaction" && l.unitId === reactor.id,
    );
    expect(reactionLogs.length).toBeGreaterThanOrEqual(1);
    const csReactor = combatState.unitById.get("row-reactor")!;
    expect(csReactor.power).toBeGreaterThan(10);
  });

  it("column_allies: fires for same-column ally triggering damage", () => {
    const reactor = makeTestUnit({
      effects: [],
      reactions: [
        {
          position: "column_allies",
          effectId: "damage",
          effects: [
            {
              id: "increase_power",
              amount: 3,
              permanent: false,
              targets: { id: "self" },
            },
          ],
        },
      ],
      power: 10,
      cooldown: 99999,
      position: [0, 0],
    });
    reactor.id = "col-reactor";

    const damager = makeTestUnit({
      effects: [{ id: "damage" }],
      power: 20,
      cooldown: 500,
      position: [0, 1],
    });
    damager.id = "col-damager";

    const { combatState, combatRunner } = setupCombat([reactor, damager]);

    const logs = runFrames(combatRunner, combatState, 200);

    const reactionLogs = logs.filter(
      (l) => l.type === "reaction" && l.unitId === reactor.id,
    );
    expect(reactionLogs.length).toBeGreaterThanOrEqual(1);
  });

  it("allies: fires for any ally triggering damage", () => {
    const reactor = makeTestUnit({
      effects: [],
      reactions: [
        {
          position: "allies",
          effectId: "damage",
          effects: [
            {
              id: "increase_power",
              amount: 3,
              permanent: false,
              targets: { id: "self" },
            },
          ],
        },
      ],
      power: 10,
      cooldown: 99999,
      position: [0, 0],
    });
    reactor.id = "allies-reactor";

    const damager = makeTestUnit({
      effects: [{ id: "damage" }],
      power: 20,
      cooldown: 500,
      position: [2, 2],
    });
    damager.id = "allies-damager";

    const { combatState, combatRunner } = setupCombat([reactor, damager]);

    const logs = runFrames(combatRunner, combatState, 200);

    const reactionLogs = logs.filter(
      (l) => l.type === "reaction" && l.unitId === reactor.id,
    );
    expect(reactionLogs.length).toBeGreaterThanOrEqual(1);
  });

  it("self: does not react to own effects (excluded for non-global)", () => {
    const unit = makeTestUnit({
      effects: [{ id: "damage" }],
      reactions: [
        {
          position: "self",
          effectId: "damage",
          effects: [
            {
              id: "increase_power",
              amount: 5,
              permanent: false,
              targets: { id: "self" },
            },
          ],
        },
      ],
      power: 10,
      cooldown: 500,
    });
    unit.id = "self-no-react";

    const { combatState, combatRunner } = setupCombat([unit]);

    const logs = runFrames(combatRunner, combatState, 200);

    const reactionLogs = logs.filter(
      (l) => l.type === "reaction" && l.unitId === unit.id,
    );
    expect(reactionLogs.length).toBe(0);
  });
});

describe("Reaction — enemies position", () => {
  it("fires when an enemy triggers the matched effect", () => {
    const damager = makeTestUnit({
      effects: [{ id: "damage" }],
      power: 20,
      cooldown: 500,
      position: [0, 0],
    });
    damager.id = "enemy-damager";

    const { combatState, combatRunner } = setupCombat([damager]);

    // Add a CPU-side reactor manually after setupCombat
    const cpuReactor: Models.Unit = {
      id: "cpu-reactor",
      cardId: "test-custom-unit",
      pic: "test",
      force: Constants.FORCE_ID_CPU,
      position: [1, 1],
      rank: 1,
      power: 10,
      bonusPower: 0,
      critical: 0,
      life: 100,
      maxLife: 100,
      shield: 0,
      cooldown: 99999,
      evade: 0,
      effects: [],
      reactions: [
        {
          position: "enemies",
          effectId: "damage",
          effects: [
            {
              id: "increase_power",
              amount: 5,
              permanent: false,
              targets: { id: "self" },
            },
          ],
        },
      ],
      charge: 0,
      refresh: 0,
      hasted: 0,
      slowed: 0,
      silenced: 0,
      isCore: false,
    };

    combatState.units.push(cpuReactor);
    combatState.unitById.set(cpuReactor.id, cpuReactor);
    combatState.cpuUnits.push(cpuReactor);

    const logs = runFrames(combatRunner, combatState, 200);

    const reactionLogs = logs.filter(
      (l) => l.type === "reaction" && l.unitId === cpuReactor.id,
    );
    expect(reactionLogs.length).toBeGreaterThanOrEqual(1);
    expect(cpuReactor.power).toBeGreaterThan(10);
  });
});

describe("Reaction — enemy heal triggers shield (cross-force)", () => {
  it("living_bloodstone: enemy heal grants YOUR crystal shield", () => {
    // Build the player-side reactor from the REAL card data. Cooldown is set to
    // 99999 so it never casts its own shield — any shield that lands must come
    // from the heal reaction.
    const bloodstone = Card.makeUnit(
      Constants.FORCE_ID_PLAYER,
      "living_bloodstone",
      [0, 0],
    );
    bloodstone.cooldown = 99999;
    bloodstone.id = "bloodstone-react";

    const { combatState, combatRunner } = setupCombat([bloodstone]);

    // Add a CPU-side healer (the auto CPU core sits at [0, 2], so [1, 2] is free).
    const enemyHealer = makeTestUnit({
      effects: [{ id: "heal" }],
      power: 30,
      cooldown: 500,
      position: [1, 2],
    });
    enemyHealer.force = Constants.FORCE_ID_CPU;
    enemyHealer.id = "enemy-healer";
    combatState.units.push(enemyHealer);
    combatState.cpuUnits.push(enemyHealer);
    combatState.unitById.set(enemyHealer.id, enemyHealer);

    const logs = runFrames(combatRunner, combatState, 300);

    // The Living Bloodstone's reaction fired when the enemy healed.
    const reactionLogs = filterLogs(logs, "reaction");
    expect(reactionLogs.some((l) => l.unitId === "bloodstone-react")).toBe(true);

    // The shield landed on the PLAYER core — the enemy heal granted OUR crystal shield.
    const playerCore = combatState.units.find(
      (u) => u.force === Constants.FORCE_ID_PLAYER && u.isCore,
    )!;
    const shieldHits = filterLogs(logs, "shield_hit");
    expect(shieldHits.some((h) => h.targetId === playerCore.id)).toBe(true);

    // Sanity: the player core is actually shielded by the end of the run.
    expect(playerCore.shield).toBeGreaterThan(0);
  });
});
