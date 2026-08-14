/**
 * Reaction integration tests for positional threshold triggers and on_over_heal.
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
import { damage, increasePower, reaction, self } from "../data/effectBuilders";

beforeAll(registerBaseCollection);
afterAll(resetCardRegistry);

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

