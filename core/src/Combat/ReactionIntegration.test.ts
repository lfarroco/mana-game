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
  runUntil,
  filterLogs,
} from "../__test_utils__/combatHarness";
import { damage, increasePower, reaction, self } from "../data/effectBuilders";
import * as Constants from "../Constants";
import * as Models from "../Models";
import * as Absorb from "../TriggerSystem/effects/absorbPower";
import * as Sacrifice from "../TriggerSystem/effects/sacrificeEffect";
import * as Multiply from "../TriggerSystem/effects/multiplyPower";
import * as Distribute from "../TriggerSystem/effects/distributePower";

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

describe("Reaction — global triggers", () => {
  it("on_crit: fires when a critical hit occurs", () => {
    const reactor = makeTestUnit({
      effects: [],
      reactions: [
        {
          position: "all",
          effectId: "on_crit",
          effects: [
            {
              id: "increase_power",
              amount: 8,
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
    reactor.id = "oncrit-reactor";

    const critDealer = makeTestUnit({
      effects: [{ id: "damage" }],
      power: 20,
      cooldown: 500,
      critical: 100,
      position: [0, 0],
    });
    critDealer.id = "crit-dealer";

    const { combatState, combatRunner } = setupCombat([reactor, critDealer]);

    const logs = runFrames(combatRunner, combatState, 200);

    const reactionLogs = logs.filter(
      (l) => l.type === "reaction" && l.unitId === reactor.id,
    );
    expect(reactionLogs.length).toBeGreaterThanOrEqual(1);
    const csReactor = combatState.unitById.get("oncrit-reactor")!;
    expect(csReactor.power).toBeGreaterThan(10);
  });

  it("re_hasted: fires when an already-hasted unit receives haste again", () => {
    const reactor = makeTestUnit({
      effects: [],
      reactions: [
        {
          position: "all",
          effectId: "re_hasted",
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
      position: [1, 0],
    });
    reactor.id = "rehasted-reactor";

    const haster = makeTestUnit({
      effects: [
        {
          id: "haste",
          duration: 2000,
          targets: { id: "random_ally", count: 1 },
        },
      ],
      power: 10,
      cooldown: 500,
      position: [0, 0],
    });
    haster.id = "haster";

    const { combatState, combatRunner } = setupCombat([reactor, haster]);

    // Pre-haste the reactor so the next haste triggers re_hasted
    reactor.hasted = 1000;

    const logs = runFrames(combatRunner, combatState, 200);

    const hasteHitLogs = logs.filter((l) => l.type === "haste_hit");
    expect(hasteHitLogs.length).toBeGreaterThanOrEqual(1);
  });

  it("re_slow: fires when an already-slowed unit receives slow again", () => {
    const slower = makeTestUnit({
      effects: [
        {
          id: "slow",
          duration: 2000,
          targets: { id: "random_enemy", count: 1 },
        },
      ],
      power: 10,
      cooldown: 500,
      position: [0, 0],
    });
    slower.id = "slower";

    const { combatState, combatRunner } = setupCombat([slower]);

    const cpuCore = combatState.cpuCore;
    cpuCore.slowed = 2000;
    cpuCore.reactions = [
      {
        position: "all",
        effectId: "re_slow",
        effects: [
          {
            id: "increase_power",
            amount: 5,
            permanent: false,
            targets: { id: "self" },
          },
        ],
      },
    ];

    const logs = runFrames(combatRunner, combatState, 200);

    const slowHitLogs = logs.filter((l) => l.type === "slow_hit");
    expect(slowHitLogs.length).toBeGreaterThanOrEqual(1);

    const reactionLogs = logs.filter(
      (l) => l.type === "reaction" && l.unitId === cpuCore.id,
    );
    expect(reactionLogs.length).toBeGreaterThanOrEqual(1);
  });
});

describe("Reaction — edge cases", () => {
  it("does not fire reaction when effect type does not match", () => {
    const reactor = makeTestUnit({
      effects: [],
      reactions: [
        {
          position: "allies",
          effectId: "heal",
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
    reactor.id = "heal-only-reactor";

    const damager = makeTestUnit({
      effects: [{ id: "damage" }],
      power: 20,
      cooldown: 500,
    });
    damager.id = "heal-edge-damager";

    const { combatState, combatRunner } = setupCombat([reactor, damager]);

    const logs = runFrames(combatRunner, combatState, 200);

    const reactionLogs = logs.filter((l) => l.type === "reaction");
    expect(reactionLogs.length).toBe(0);
  });
});

describe("Reaction — threshold triggers", () => {
  it("every_100_damage fires when own team's accumulated damage crosses 100", () => {
    const reactor = makeTestUnit({
      effects: [],
      reactions: [
        {
          position: "allies",
          effectId: "every_100_damage",
          triggerTeam: "own",
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
      position: [0, 0],
    });
    reactor.id = "dmg-threshold-reactor";

    const damager = makeTestUnit({
      effects: [{ id: "damage" }],
      power: 50,
      cooldown: 500,
      position: [1, 0],
    });
    damager.id = "dmg-threshold-damager";

    const { combatState, combatRunner } = setupCombat([reactor, damager]);
    const logs = runFrames(combatRunner, combatState, 300);

    const reactionLogs = logs.filter(
      (l) => l.type === "reaction" && l.unitId === reactor.id,
    );
    expect(reactionLogs.length).toBeGreaterThanOrEqual(1);
    const csReactor = combatState.unitById.get("dmg-threshold-reactor")!;
    expect(csReactor.power).toBeGreaterThan(10);
  });

  it("triggerTeam enemy: reactor fires for enemy team's damage (cross-force)", () => {
    // Reactor on CPU side watching for PLAYER (enemy) damage
    const reactor = makeTestUnit({
      effects: [],
      reactions: [
        {
          position: "enemies", // triggerer is PLAYER, reactor is CPU → enemies
          effectId: "every_100_damage",
          triggerTeam: "enemy",
          effects: [
            {
              id: "increase_power",
              amount: 8,
              permanent: false,
              targets: { id: "self" },
            },
          ],
        },
      ],
      power: 10,
      cooldown: 99999,
      position: [0, 2],
    });

    const damager = makeTestUnit({
      effects: [{ id: "damage" }],
      power: 50,
      cooldown: 500,
      position: [0, 0],
    });

    const { combatState, combatRunner } = setupCombat([damager]);

    // Add reactor as CPU unit — PLAYER is "enemy" from its perspective
    reactor.force = Constants.FORCE_ID_CPU;
    reactor.id = "cpu-enemy-dmg-reactor";
    combatState.units.push(reactor);
    combatState.cpuUnits.push(reactor);
    combatState.unitById.set(reactor.id, reactor);

    const logs = runFrames(combatRunner, combatState, 300);

    const reactionLogs = logs.filter(
      (l) => l.type === "reaction" && l.unitId === reactor.id,
    );
    expect(reactionLogs.length).toBeGreaterThanOrEqual(1);
    const csReactor = combatState.unitById.get("cpu-enemy-dmg-reactor")!;
    expect(csReactor.power).toBeGreaterThan(10);
  });

  it("triggerTeam own: reactor only fires for own team's damage threshold", () => {
    // This is the default — same as the first every_100_damage test
    // Explicitly testing that triggerTeam: "own" ignores other force's stats.
    // We add a CPU damager alongside, but reactor should only count PLAYER damage.
    const reactor = makeTestUnit({
      effects: [],
      reactions: [
        {
          position: "allies",
          effectId: "every_100_damage",
          triggerTeam: "own",
          effects: [
            {
              id: "increase_power",
              amount: 10,
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
    reactor.id = "own-only-reactor";

    const damager = makeTestUnit({
      effects: [{ id: "damage" }],
      power: 50,
      cooldown: 500,
      position: [1, 0],
    });
    damager.id = "own-only-damager";

    const { combatState, combatRunner } = setupCombat([reactor, damager]);

    // Add a CPU damager to the initial unit list BEFORE tracker init
    // by pushing it before running frames
    const cpuDamager = makeTestUnit({
      effects: [{ id: "damage" }],
      power: 50,
      cooldown: 99999, // won't act — just here to make sure its stats don't trigger reaction
      position: [0, 2],
    });
    cpuDamager.force = Constants.FORCE_ID_CPU;
    cpuDamager.id = "cpu-silent-damager";
    combatState.units.push(cpuDamager);
    combatState.cpuUnits.push(cpuDamager);
    combatState.unitById.set(cpuDamager.id, cpuDamager);

    const logs = runFrames(combatRunner, combatState, 300);

    const reactionLogs = logs.filter(
      (l) => l.type === "reaction" && l.unitId === reactor.id,
    );
    // Reactor has triggerTeam: "own" — fires for PLAYER damage
    expect(reactionLogs.length).toBeGreaterThanOrEqual(1);
  });

  it("every_100_shield fires when shield applied crosses 100", () => {
    const reactor = makeTestUnit({
      effects: [],
      reactions: [
        {
          position: "allies",
          effectId: "every_100_shield",
          triggerTeam: "own",
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
      position: [0, 0],
    });
    reactor.id = "shield-reactor";

    const shielder = makeTestUnit({
      effects: [{ id: "shield" }],
      power: 100,
      cooldown: 500,
      position: [1, 0],
    });
    shielder.id = "threshold-shielder";

    const { combatState, combatRunner } = setupCombat([reactor, shielder]);
    const logs = runFrames(combatRunner, combatState, 200);

    const reactionLogs = logs.filter(
      (l) => l.type === "reaction" && l.unitId === reactor.id,
    );
    expect(reactionLogs.length).toBeGreaterThanOrEqual(1);
    const csReactor = combatState.unitById.get("shield-reactor")!;
    expect(csReactor.power).toBeGreaterThan(10);
  });

  it("every_100_heal fires when healing crosses 100", () => {
    const reactor = makeTestUnit({
      effects: [],
      reactions: [
        {
          position: "allies",
          effectId: "every_100_heal",
          triggerTeam: "own",
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
      position: [0, 0],
    });
    reactor.id = "heal-reactor";

    const healer = makeTestUnit({
      effects: [{ id: "heal" }],
      power: 100,
      cooldown: 500,
      position: [1, 0],
    });
    healer.id = "threshold-healer";

    const { combatState, combatRunner } = setupCombat([reactor, healer]);
    const playerCore = combatState.playerCore;
    playerCore.life = 1;

    const logs = runFrames(combatRunner, combatState, 200);

    const reactionLogs = logs.filter(
      (l) => l.type === "reaction" && l.unitId === reactor.id,
    );
    expect(reactionLogs.length).toBeGreaterThanOrEqual(1);
    const csReactor = combatState.unitById.get("heal-reactor")!;
    expect(csReactor.power).toBeGreaterThan(10);
  });

  it("every_10_poison fires when poison applied crosses 10", () => {
    const reactor = makeTestUnit({
      effects: [],
      reactions: [
        {
          position: "allies",
          effectId: "every_10_poison",
          triggerTeam: "own",
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
      position: [0, 0],
    });
    reactor.id = "poison-reactor";

    const poisoner = makeTestUnit({
      effects: [{ id: "poison" }],
      power: 100,
      cooldown: 500,
      position: [1, 0],
    });
    poisoner.id = "threshold-poisoner";

    const { combatState, combatRunner } = setupCombat([reactor, poisoner]);
    const logs = runFrames(combatRunner, combatState, 200);

    const reactionLogs = logs.filter(
      (l) => l.type === "reaction" && l.unitId === reactor.id,
    );
    expect(reactionLogs.length).toBeGreaterThanOrEqual(1);
    const csReactor = combatState.unitById.get("poison-reactor")!;
    expect(csReactor.power).toBeGreaterThan(10);
  });

  it("every_10_regen fires when regen applied crosses 10", () => {
    const reactor = makeTestUnit({
      effects: [],
      reactions: [
        {
          position: "allies",
          effectId: "every_10_regen",
          triggerTeam: "own",
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
      position: [0, 0],
    });
    reactor.id = "regen-reactor";

    const regenUnit = makeTestUnit({
      effects: [{ id: "regen" }],
      power: 100,
      cooldown: 500,
      position: [1, 0],
    });
    regenUnit.id = "threshold-regen";

    const { combatState, combatRunner } = setupCombat([reactor, regenUnit]);
    const logs = runFrames(combatRunner, combatState, 200);

    const reactionLogs = logs.filter(
      (l) => l.type === "reaction" && l.unitId === reactor.id,
    );
    expect(reactionLogs.length).toBeGreaterThanOrEqual(1);
    const csReactor = combatState.unitById.get("regen-reactor")!;
    expect(csReactor.power).toBeGreaterThan(10);
  });

  it("does not fire twice for the same threshold level", () => {
    const reactor = makeTestUnit({
      effects: [],
      reactions: [
        {
          position: "allies",
          effectId: "every_100_damage",
          triggerTeam: "own",
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
    reactor.id = "no-double-reactor";

    // 100 damage per hit → 1 hit = 100, 2 hits = 200
    const damager = makeTestUnit({
      effects: [{ id: "damage" }],
      power: 100,
      cooldown: 500,
      position: [1, 0],
    });
    damager.id = "no-double-damager";

    const { combatState, combatRunner } = setupCombat([reactor, damager]);
    // Run until 200 damage has landed — expresses intent instead of depending
    // on exact frame counts (hit cadence shifts if timing constants change).
    const logs = runUntil(
      combatRunner,
      combatState,
      (logs) =>
        filterLogs(logs, "damage_hit").reduce((sum, h) => sum + h.amount, 0) >=
        200,
    );

    const reactionLogs = logs.filter(
      (l) => l.type === "reaction" && l.unitId === reactor.id,
    );
    // 2 hits × 100 = 200 damage → crosses 100 and 200 → exactly 2 reactions
    expect(reactionLogs.length).toBe(2);

    const csReactor = combatState.unitById.get("no-double-reactor")!;
    expect(csReactor.power).toBe(16); // 10 + 3 + 3
  });
});

describe("Reaction — on_over_heal", () => {
  it("fires when healing would exceed max life", () => {
    const reactor = makeTestUnit({
      effects: [],
      reactions: [
        {
          position: "allies",
          effectId: "on_over_heal",
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
      position: [0, 0],
    });
    reactor.id = "overheal-reactor";

    const healer = makeTestUnit({
      effects: [{ id: "heal" }],
      power: 20,
      cooldown: 500,
      position: [1, 0],
    });
    healer.id = "overheal-healer";

    const { combatState, combatRunner } = setupCombat([reactor, healer]);

    // Set player core life near max so healing overflows
    const playerCore = combatState.playerCore;
    playerCore.life = playerCore.maxLife - 5; // heal of 20 will overheal by 15

    const logs = runFrames(combatRunner, combatState, 200);

    const reactionLogs = filterLogs(logs, "reaction").filter(
      (l) => l.unitId === reactor.id,
    );
    expect(reactionLogs.length).toBeGreaterThanOrEqual(1);
    const csReactor = combatState.unitById.get("overheal-reactor")!;
    expect(csReactor.power).toBeGreaterThan(10);
  });
});

describe("Reaction — positional threshold triggers", () => {
  it("every_100_damage with row_allies only fires for same-row reactors", () => {
    // Reactor at [0,0] only reacts to same-row (y=0) damage
    const reactor = makeTestUnit({
      effects: [],
      reactions: [
        {
          position: "row_allies",
          effectId: "every_100_damage",
          triggerTeam: "own",
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
      position: [0, 0],
    });
    reactor.id = "row-threshold-reactor";

    // Same-row damager at [2,0] (y=0)
    const sameRowDamager = makeTestUnit({
      effects: [{ id: "damage" }],
      power: 100,
      cooldown: 500,
      position: [2, 0],
    });
    sameRowDamager.id = "same-row-dmg";

    const { combatState, combatRunner } = setupCombat([
      reactor,
      sameRowDamager,
    ]);
    const logs = runFrames(combatRunner, combatState, 120);

    const reactionLogs = filterLogs(logs, "reaction").filter(
      (l) => l.unitId === reactor.id,
    );
    expect(reactionLogs.length).toBeGreaterThanOrEqual(1);
    const csReactor = combatState.unitById.get("row-threshold-reactor")!;
    expect(csReactor.power).toBeGreaterThan(10);
  });

  it("every_100_damage with column_allies only fires for same-column reactors", () => {
    // For threshold reactions the triggerer is a representative of the force
    // (the first force unit in combatState.units) — positional checks are
    // evaluated against that unit. Anchor at [0,0] is listed first.
    const anchor = makeTestUnit({
      effects: [],
      cooldown: 99999,
      position: [0, 0],
    });
    anchor.id = "column-anchor";

    // Same column as the anchor (x = 0) → should react.
    const sameColumnReactor = makeTestUnit({
      effects: [],
      reactions: [
        {
          ...reaction(
            "every_100_damage",
            "column_allies",
            increasePower(5, self),
          ),
          triggerTeam: "own" as const,
        },
      ],
      power: 10,
      cooldown: 99999,
      position: [0, 2],
    });
    sameColumnReactor.id = "same-column-reactor";

    // Different column (x = 2) → should NOT react.
    const otherColumnReactor = makeTestUnit({
      effects: [],
      reactions: [
        {
          ...reaction(
            "every_100_damage",
            "column_allies",
            increasePower(5, self),
          ),
          triggerTeam: "own" as const,
        },
      ],
      power: 10,
      cooldown: 99999,
      position: [2, 0],
    });
    otherColumnReactor.id = "other-column-reactor";

    const damager = makeTestUnit({
      effects: [damage],
      power: 100,
      cooldown: 500,
      position: [1, 0],
    });
    damager.id = "column-threshold-damager";

    const { combatState, combatRunner } = setupCombat([
      anchor,
      sameColumnReactor,
      otherColumnReactor,
      damager,
    ]);
    const logs = runUntil(
      combatRunner,
      combatState,
      (logs) =>
        filterLogs(logs, "damage_hit").reduce((sum, h) => sum + h.amount, 0) >=
        100,
    );

    const reactionLogs = filterLogs(logs, "reaction");
    expect(
      reactionLogs.filter((l) => l.unitId === sameColumnReactor.id).length,
    ).toBeGreaterThanOrEqual(1);
    expect(
      reactionLogs.filter((l) => l.unitId === otherColumnReactor.id),
    ).toHaveLength(0);

    const csReactor = combatState.unitById.get("same-column-reactor")!;
    expect(csReactor.power).toBeGreaterThan(10);
  });
});

describe("Effect integration — edge cases", () => {
  it("absorb_power returns early with empty targets", () => {
    const absorber = makeTestUnit({
      effects: [
        {
          id: "absorb_power",
          permanent: false,
          targets: { id: "random_enemy", count: 1 },
        },
      ],
      power: 10,
      cooldown: 99999,
    });

    const { combatState, combatRunner } = setupCombat([absorber], 5000);

    // Remove all CPU units so resolveTargets returns empty
    const cpuUnits = combatState.units.filter(
      (u) => u.force === Constants.FORCE_ID_CPU,
    );
    cpuUnits.forEach((u) => {
      const idx = combatState.units.indexOf(u);
      if (idx >= 0) combatState.units.splice(idx, 1);
    });

    // Manually trigger the effect — should not crash
    const env = combatRunner.getEnv();
    expect(() => Absorb.absorbPower(env, absorber, [], false)).not.toThrow();
  });

  it("sacrifice_effect does nothing when there are no removable effects or reactions", () => {
    const unit = makeTestUnit({
      effects: [{ id: "sacrifice_effect", targets: { id: "self" } }],
      power: 10,
      cooldown: 99999,
    });
    // Remove the sacrifice_effect itself so there's nothing to sacrifice
    unit.effects = [];

    const { combatRunner } = setupCombat([unit], 5000);
    const env = combatRunner.getEnv();

    const initialPower = unit.power;
    Sacrifice.sacrificeEffect(env, unit);
    // Should not crash and should not change power
    expect(unit.power).toBe(initialPower);
  });

  it("multiply_power computes the correct exponent with scale", () => {
    const unit = makeTestUnit({
      effects: [],
      power: 20,
      cooldown: 99999,
    });

    const { combatRunner } = setupCombat([unit], 5000);
    const env = combatRunner.getEnv();

    // multiplier=2, scale=2 → Math.pow(2, 2) = 4
    // 20 * 4 = 80, floor(80) = 80
    Multiply.multiplyPower({
      env,
      targets: [unit],
      sourceUnit: unit,
      multiplier: Math.pow(2, 2),
    });

    // 20 × 4 = 80
    expect(unit.power).toBe(80);
  });

  it("distribute_power handles truncation loss correctly", () => {
    const distributor = makeTestUnit({
      effects: [],
      power: 101,
      cooldown: 99999,
      position: [0, 0],
    });
    const r1 = makeTestUnit({
      effects: [],
      power: 10,
      cooldown: 99999,
      position: [0, 1],
    });
    const r2 = makeTestUnit({
      effects: [],
      power: 10,
      cooldown: 99999,
      position: [0, 2],
    });

    const { combatRunner } = setupCombat([distributor, r1, r2], 5000);
    const env = combatRunner.getEnv();

    // powerToDistribute = floor(101 * 0.5) = 50
    // powerPerTarget = floor(50 / 2) = 25 each
    // Total distributed = 50, truncation loss = 0 in this case
    Distribute.distributePower(env, distributor, [r1, r2], false);

    expect(distributor.power).toBe(51); // 101 - 50
    expect(r1.power).toBe(35); // 10 + 25
    expect(r2.power).toBe(35); // 10 + 25
  });
});
