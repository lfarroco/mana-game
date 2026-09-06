/**
 * Regression tests for the player-reported "charge infinite": threshold
 * reactions (every_X) granting board-wide charge/haste form a
 * self-reinforcing loop — stat → threshold → tempo → faster casts → more
 * stat — that only the runaway guard catches (scored as a loss). Per
 * docs/unit-balance.md §17 (extended to orbs), threshold triggers must never
 * grant charge or haste; tempo orbs key off a specific effect from a
 * directional ally instead.
 */
import {
  makeTestUnit,
  registerBaseCollection,
  runFrames,
  setupCombat,
  SIM_DELTA,
  filterLogs,
} from "../__test_utils__/combatHarness";
import { CORE_UPGRADE_DEFINITIONS } from "../content/coreUpgradeOrbs";
import { regen, damage } from "../data/effectBuilders";
import * as Models from "../Models";

registerBaseCollection();

function orbReaction(orbId: string): Models.EffectReaction {
  const def = CORE_UPGRADE_DEFINITIONS[orbId];
  if (def.kind !== "reaction" || !def.reaction) {
    throw new Error(`Not a reaction orb: ${orbId}`);
  }
  return def.reaction;
}

/**
 * The reported engine: regen units carrying a threshold-tempo orb plus the
 * power-growth half (every_10_regen → +power, the engine-card shape). Growth
 * is what ignites the loop: bigger regens → more crossings → more tempo →
 * faster casts → bigger regens. All slots except [1,1] are filled so the
 * harness can add its harmless core there.
 */
function buildTempoBoard(tempoOrbId: string) {
  const slots: [number, number][] = [
    [0, 0],
    [0, 1],
    [0, 2],
    [1, 0],
    [1, 2],
    [2, 0],
    [2, 1],
  ];
  const units = slots.map(([r, c], i) => {
    const u = makeTestUnit({
      effects: [regen],
      power: 60,
      cooldown: 3000,
      position: [r, c],
      reactions: [orbReaction(tempoOrbId), orbReaction("mana_regen_power")],
    });
    u.id = `regen${i}`;
    return u;
  });
  // Chip damage so the log also shows whether combat stays winnable.
  const dps = makeTestUnit({
    effects: [damage],
    power: 60,
    cooldown: 2000,
    position: [2, 2],
  });
  dps.id = "dps";
  units.push(dps);
  return setupCombat(units, 20000, `tempo-${tempoOrbId}`);
}

/** Simulate 60s and report runaway trips + total log volume. */
function simulate60s(tempoOrbId: string) {
  const { combatState, combatRunner } = buildTempoBoard(tempoOrbId);
  const logs = runFrames(
    combatRunner,
    combatState,
    Math.floor(60000 / SIM_DELTA),
  );
  return {
    runaways: filterLogs(logs, "runaway_combat").length,
    logCount: logs.length,
  };
}

describe("threshold tempo loop (player report)", () => {
  it("charge variant no longer ignites a board-wide infinite", () => {
    // Pre-fix (every_10_regen → charge random ally): ~17k logs and the
    // runaway guard tripped. Post-fix the same board is quiet.
    const { runaways, logCount } = simulate60s("mana_regen_charge");
    expect(runaways).toBe(0);
    expect(logCount).toBeLessThan(5000);
  });

  it("haste variant no longer ignites a board-wide infinite", () => {
    // Same shape via haste (pre-fix: ~20k logs + runaway trip).
    const { runaways, logCount } = simulate60s("mana_regen_haste");
    expect(runaways).toBe(0);
    expect(logCount).toBeLessThan(5000);
  });

  it("no threshold (every_*) reaction grants charge or haste", () => {
    // Catalog-wide lock on the design rule: threshold counters must never
    // feed back into cast speed, in this catalog or any future orb.
    const violations: string[] = [];
    for (const [id, def] of Object.entries(CORE_UPGRADE_DEFINITIONS)) {
      if (def.kind !== "reaction" || !def.reaction) continue;
      const trigger = def.reaction.effectId;
      if (!trigger.startsWith("every_")) continue;
      for (const effect of def.reaction.effects) {
        if (effect.id === "charge" || effect.id === "haste") {
          violations.push(`${id}: ${trigger} → ${effect.id}`);
        }
      }
    }
    expect(violations).toEqual([]);
  });
});
