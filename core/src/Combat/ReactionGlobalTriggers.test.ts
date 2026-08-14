/**
 * Reaction integration tests for global triggers and edge cases.
 * Split out of ReactionIntegration.test.ts.
 */
/// <reference types="jest" />

import {
  registerBaseCollection,
  resetCardRegistry,
  makeTestUnit,
  setupCombat,
  runFrames,
} from "../__test_utils__/combatHarness";

beforeAll(registerBaseCollection);
afterAll(resetCardRegistry);

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
