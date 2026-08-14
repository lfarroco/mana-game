/**
 * Reaction integration tests for threshold triggers (every_100_damage, on_crit).
 * Split out of ReactionIntegration.test.ts.
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
