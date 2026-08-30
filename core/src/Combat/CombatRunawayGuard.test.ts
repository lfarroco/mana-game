/**
 * Regression tests for the combat runaway guard (CombatRunner's work/log
 * budget + per-frame deferred-event/threshold caps).
 *
 * Bug: "every x regen charge y units for z seconds" + "every x regen give
 * core y power" (and friends) form a self-reinforcing loop — regen applied →
 * every_10_regen threshold → charge/haste/power → faster casts → more regen.
 * Power grows super-exponentially, a single regen application becomes worth
 * thousands of threshold crossings, and the simulation's per-frame work grew
 * without bound until the game froze / crashed (CPU melt / OOM).
 *
 * The guard caps per-frame work and bounds total work + log size; a runaway
 * board now ends gracefully as both_won with a runaway_combat log entry.
 */
import * as CombatSimulation from "./CombatSimulation";
import * as CombatRunner from "./CombatRunner";
import {
  makeTestUnit,
  registerBaseCollection,
  setupCombat,
  filterLogs,
  SIM_DELTA,
} from "../__test_utils__/combatHarness";
import {
  charge,
  damage,
  haste,
  heal,
  increasePower,
  randomAlly,
  reaction,
  regen,
  self,
  shield,
} from "../data/effectBuilders";

registerBaseCollection();

/**
 * The reported crash board: the mana (regen) core upgraded with the
 * every_10_regen charge/power/haste orbs plus the "when the unit to the left
 * deals damage, charge the core" orb, backed by a regen engine whose units
 * also gain power on every_10_regen (the bronze/silver regen-engine family).
 */
function buildRunawayBoard() {
  const core = makeTestUnit({
    effects: [regen],
    isCore: true,
    power: 35,
    cooldown: 5200,
    position: [1, 1],
    life: 500,
    reactions: [
      reaction("every_10_regen", "allies", charge(300, randomAlly(1))),
      reaction("every_10_regen", "allies", increasePower(5, self)),
      reaction("every_10_regen", "allies", haste(500, randomAlly(1))),
      reaction("damage", "left_ally", charge(200, self)),
    ],
  });
  core.cardId = "mana_crystal";
  core.id = "core";

  const dmgUnit = makeTestUnit({
    effects: [damage],
    power: 30,
    cooldown: 600,
    position: [0, 1],
  });
  dmgUnit.id = "dmg";

  const engine = (id: string, position: [number, number], power: number) => {
    const u = makeTestUnit({
      effects: [regen],
      power,
      cooldown: 700,
      position,
      reactions: [reaction("every_10_regen", "allies", increasePower(5, self))],
    });
    u.id = id;
    return u;
  };

  const playerUnits = [
    dmgUnit,
    core,
    engine("e1", [1, 0], 50),
    engine("e2", [1, 2], 50),
    engine("e3", [2, 0], 50),
    engine("e4", [2, 1], 50),
    engine("e5", [2, 2], 50),
    engine("e6", [0, 0], 50),
    engine("e7", [0, 2], 50),
  ];

  const { session, combatState } = setupCombat(playerUnits, 5000, "runaway");
  // The harness disables the core's cooldown; re-enable it so the core's own
  // (power-scaled) regen casts feed the loop like in the real game.
  combatState.units.find((u) => u.id === "core")!.cooldown = 5200;
  return { session, combatState };
}

/** A strong but legit team — high power, no self-reinforcing threshold loop. */
function buildLegitBoard() {
  const core = makeTestUnit({
    effects: [damage],
    isCore: true,
    power: 100,
    cooldown: 3000,
    position: [1, 1],
    life: 500,
    reactions: [reaction("every_100_damage", "allies", increasePower(5, self))],
  });
  core.id = "legit-core";
  core.cardId = "critical_crystal";

  const unit = (
    id: string,
    position: [number, number],
    power: number,
    effect: Parameters<typeof makeTestUnit>[0]["effects"][number],
    cooldown: number,
  ) => {
    const u = makeTestUnit({ effects: [effect], power, cooldown, position });
    u.id = id;
    return u;
  };

  const { session, combatState } = setupCombat(
    [
      core,
      unit("d1", [0, 0], 150, damage, 1200),
      unit("d2", [0, 1], 150, damage, 1200),
      unit("d3", [0, 2], 150, damage, 1200),
      unit("s1", [1, 0], 120, shield, 1000),
      unit("s2", [1, 2], 120, shield, 1000),
      unit("h1", [2, 0], 150, heal, 1500),
      unit("h2", [2, 1], 150, heal, 1500),
      unit("h3", [2, 2], 150, heal, 1500),
    ],
    5000,
    "legit",
  );
  return { session, combatState };
}

describe("combat runaway guard", () => {
  it("ends a self-reinforcing regen loop gracefully instead of melting", () => {
    const { session, combatState } = buildRunawayBoard();

    const final = CombatSimulation.simulateCombat(session, combatState);

    // The runaway board resolves as both_won (mirroring the 120s timeout),
    // with a runaway_combat marker, and never produces an unbounded log.
    expect(filterLogs(final.logs, "outcome")).toHaveLength(1);
    expect(filterLogs(final.logs, "outcome")[0].result).toBe("both_won");
    expect(filterLogs(final.logs, "runaway_combat")).toHaveLength(1);
    // Unbounded without the guard (the repro hit ~800k entries and was still
    // accelerating); the guard bounds it well below that.
    expect(final.logs.length).toBeLessThan(200_000);
  });

  it("keeps per-frame work bounded while a loop is spinning up", () => {
    const { session, combatState } = buildRunawayBoard();
    const combatRunner = CombatRunner.runCombat(session, combatState);

    let maxDeferredSeen = 0;
    let maxLogsAddedPerFrame = 0;
    let prevLen = 0;
    for (let f = 0; f < 10000; f++) {
      combatRunner.updateFrame(combatState, f * SIM_DELTA, SIM_DELTA);
      const env = combatRunner.getEnv();
      maxDeferredSeen = Math.max(maxDeferredSeen, env.deferredEvents.length);
      const added = env.logger.getLogs().length - prevLen;
      prevLen = env.logger.getLogs().length;
      maxLogsAddedPerFrame = Math.max(maxLogsAddedPerFrame, added);
      if (!combatRunner.isActive()) break;
    }

    // The deferred-event queue stays bounded (per-frame cap), and no single
    // frame floods the log (cap + budget) — the loop terminates instead of
    // spinning the CPU at 100% for minutes.
    expect(maxDeferredSeen).toBeLessThan(20_000);
    expect(maxLogsAddedPerFrame).toBeLessThan(20_000);
  });

  it("does not trip for a legit high-power board", () => {
    const { session, combatState } = buildLegitBoard();

    const final = CombatSimulation.simulateCombat(session, combatState);

    expect(filterLogs(final.logs, "runaway_combat")).toHaveLength(0);
    expect(filterLogs(final.logs, "outcome")[0].result).toBe("player_won");
  });
});
