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
import * as Card from "../Entities/Card";
import * as Constants from "../Constants";
import { damage, increasePower, reaction, self } from "../data/effectBuilders";
import { CORE_UPGRADE_DEFINITIONS } from "../content/coreUpgradeOrbs";

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

describe("Radiant overflow identity orbs (CUB-G1)", () => {
  /**
   * The player team is the radiant_crystal core (holding one overflow identity
   * reaction from the catalog) plus a cheap healer ally. Every heal overheals
   * the near-full crystal, so the on_over_heal identity fires on each cast.
   */
  function makeRadiantTeam(orbId: string): {
    core: ReturnType<typeof Card.makeUnit>;
    healer: ReturnType<typeof makeTestUnit>;
  } {
    const def = CORE_UPGRADE_DEFINITIONS[orbId];
    expect(def.reaction).toBeDefined();

    const core = Card.makeUnit(
      Constants.FORCE_ID_PLAYER,
      "radiant_crystal",
      [0, 0],
    );
    core.id = "radiant-core";
    core.power = 20;
    core.reactions = [structuredClone(def.reaction!)];
    core.life = core.maxLife - 5;

    const healer = makeTestUnit({
      effects: [{ id: "heal" }],
      power: 20,
      cooldown: 500,
      position: [1, 0],
    });
    healer.id = "overflow-healer";

    return { core, healer };
  }

  it("overflow_burst deals the crystal's power to the enemy core when an ally overheals", () => {
    const { core, healer } = makeRadiantTeam("radiant_overflow_burst");
    const { combatState, combatRunner } = setupCombat([core, healer]);

    const enemyCore = combatState.cpuCore;
    const initialLife = enemyCore.life;

    const logs = runFrames(combatRunner, combatState, 200);

    // The enemy core never attacks (cooldown 99999 in the harness) — any life
    // loss must come from the overflow burst reaction.
    expect(enemyCore.life).toBeLessThan(initialLife);
    expect(filterLogs(logs, "damage_hit").length).toBeGreaterThanOrEqual(1);
  });

  it("overflow_shield shields the crystal when an ally overheals", () => {
    const { core, healer } = makeRadiantTeam("radiant_overflow_shield");
    const { combatState, combatRunner } = setupCombat([core, healer]);

    const playerCore = combatState.playerCore;
    const initialShield = playerCore.shield;

    runFrames(combatRunner, combatState, 200);

    expect(playerCore.shield).toBeGreaterThan(initialShield);
  });

  it("saturation grants power every 100 ally heal", () => {
    const { core, healer } = makeRadiantTeam("radiant_saturation");
    const { combatState, combatRunner } = setupCombat([core, healer]);

    // Drain the crystal so heals land fully — every_100_heal counts *actual*
    // healing, so the crystal must have room (mirrors the existing threshold
    // test, which sets playerCore.life = 1).
    const playerCore = combatState.playerCore;
    playerCore.life = 1;

    const initialPower = playerCore.power;

    runFrames(combatRunner, combatState, 500);

    // The healer casts 20-power heals: after 100 total heal the threshold
    // fires and Saturation returns +5 power on the crystal (the reactor).
    expect(playerCore.power).toBeGreaterThan(initialPower);
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
