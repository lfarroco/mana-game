/**
 * Combat invariants as a seed sweep (P4.3).
 *
 * Runs full simulateCombat over ~50 fixed seeds against a team exercising
 * damage, crits, poison, heal, regen, shield, haste, slow, and threshold
 * reactions, then asserts structural invariants on the logs:
 *
 *  1. Life accounting: Σ lifeDelta across all life-affecting logs equals the
 *     core's actual life change (per force).
 *  2. Damage-only conservation: every damage_hit corresponds to a damage_cast
 *     of equal amount; at most one projectile per damage unit is in flight
 *     when combat ends.
 *  3. Threshold reactions fire exactly floor(totalStat / threshold) times.
 *  4. haste_end / slow_end appear iff the status was applied and had time to
 *     decay to zero before combat ended.
 *
 * Deterministic (fixed seeds, no new dependencies) and doubles as a
 * replay-determinism check: the same seed produces identical logs.
 */
/// <reference types="jest" />

import { jest } from "@jest/globals";
import {
  registerBaseCollection,
  resetCardRegistry,
  makeTestUnit,
  setupCombat,
  filterLogs,
} from "../__test_utils__/combatHarness";
import * as Models from "../Models";
import * as Constants from "../Constants";
import * as CombatSimulation from "./CombatSimulation";
import * as CombatLogger from "./CombatLogger";
import {
  damage, poison, heal, regen, shield,
  haste, slow, randomAlly, randomEnemy,
  increasePower, reaction, self,
} from "../data/effectBuilders";

beforeAll(registerBaseCollection);
afterAll(resetCardRegistry);

jest.setTimeout(120_000);

const PLAYER_CORE_LIFE = 400;
const CPU_CORE_LIFE = 2000;
const DAMAGE_UNIT_COUNT = 3; // dmg-1, dmg-2, cpu-dmg

type ScenarioResult = {
  combatState: Models.CombatState;
  logs: CombatLogger.CombatLogEntry[];
};

function runScenario(seed: string): ScenarioResult {
  const playerCore = makeTestUnit({ effects: [], isCore: true, life: PLAYER_CORE_LIFE, position: [2, 2] });
  playerCore.id = "player-core";

  const dmg1 = makeTestUnit({ effects: [damage], power: 30, cooldown: 500, critical: 25, position: [0, 0] });
  dmg1.id = "dmg-1";
  const dmg2 = makeTestUnit({ effects: [damage], power: 20, cooldown: 700, position: [1, 0] });
  dmg2.id = "dmg-2";
  const poisoner = makeTestUnit({ effects: [poison], power: 40, cooldown: 900, position: [2, 0] });
  poisoner.id = "poison-1";
  const healer = makeTestUnit({ effects: [heal], power: 25, cooldown: 600, position: [0, 1] });
  healer.id = "heal-1";
  const regener = makeTestUnit({ effects: [regen], power: 20, cooldown: 800, position: [1, 1] });
  regener.id = "regen-1";
  const shielder = makeTestUnit({ effects: [shield], power: 15, cooldown: 650, position: [2, 1] });
  shielder.id = "shield-1";
  const haster = makeTestUnit({ effects: [haste(600, randomAlly(1))], power: 10, cooldown: 1100, position: [0, 2] });
  haster.id = "haste-1";
  const slower = makeTestUnit({ effects: [slow(500, randomEnemy(1))], power: 10, cooldown: 1300, position: [1, 2] });
  slower.id = "slow-1";
  const reactor = makeTestUnit({
    effects: [],
    reactions: [{
      ...reaction("every_100_damage", "allies", increasePower(3, self)),
      triggerTeam: "own" as const,
    }],
    cooldown: 99999,
    position: [1, 1],
  });
  reactor.id = "threshold-reactor";

  const { session, combatState } = setupCombat(
    [playerCore, dmg1, dmg2, poisoner, healer, regener, shielder, haster, slower, reactor],
    CPU_CORE_LIFE,
    seed,
  );

  // CPU attacker — gives the player core incoming damage so heal/shield/regen
  // engage. Positioned off the CPU core's row so the crystal's own
  // row_allies reaction never fires.
  const cpuDmg = makeTestUnit({ effects: [damage], power: 8, cooldown: 900, position: [1, 1] });
  cpuDmg.id = "cpu-dmg";
  cpuDmg.force = Constants.FORCE_ID_CPU;
  combatState.units.push(cpuDmg);
  combatState.cpuUnits.push(cpuDmg);
  combatState.unitById.set(cpuDmg.id, cpuDmg);

  // Pin the CPU core id: the harness generates it via uuid, which is not part
  // of the seeded RNG — fixing it keeps log comparisons deterministic.
  const cpuCore = combatState.cpuCore;
  combatState.unitById.delete(cpuCore.id);
  cpuCore.id = "cpu-core";
  combatState.unitById.set(cpuCore.id, cpuCore);

  CombatSimulation.simulateCombat(session, combatState);

  return { combatState, logs: combatState.logs };
}

const SEEDS = Array.from({ length: 50 }, (_, i) => `invariant-seed-${i}`);
const runs: ScenarioResult[] = [];

beforeAll(() => {
  for (const seed of SEEDS) {
    runs.push(runScenario(seed));
  }
});

describe("Combat invariants — seed sweep", () => {
  it("produces an outcome in every run", () => {
    for (const { logs } of runs) {
      expect(filterLogs(logs, "outcome")).toHaveLength(1);
    }
  });

  it("life accounting: Σ lifeDelta over all life logs equals the core life change", () => {
    for (const { combatState, logs } of runs) {
      for (const core of [combatState.playerCore, combatState.cpuCore]) {
        const initial = core.id === "player-core" ? PLAYER_CORE_LIFE : CPU_CORE_LIFE;
        const lifeDeltaSum =
          filterLogs(logs, "damage_hit").filter((l) => l.targetId === core.id).reduce((s, l) => s + l.lifeDelta, 0) +
          filterLogs(logs, "heal_hit").filter((l) => l.targetId === core.id).reduce((s, l) => s + l.lifeDelta, 0) +
          filterLogs(logs, "poison_tick").filter((l) => l.force === core.force).reduce((s, l) => s + l.lifeDelta, 0) +
          filterLogs(logs, "regen_tick").filter((l) => l.force === core.force).reduce((s, l) => s + l.lifeDelta, 0) +
          filterLogs(logs, "timeout_damage_hit").filter((l) => l.force === core.force).reduce((s, l) => s + l.lifeDelta, 0);

        expect(combatState.units.find((u) => u.id === core.id)!.life - initial).toBeCloseTo(lifeDeltaSum, 6);
      }
    }
  });

  it("damage conservation: hits match casts 1:1 in amount, ≤1 in flight per damage unit", () => {
    for (const { logs } of runs) {
      const casts = filterLogs(logs, "damage_cast");
      const hits = filterLogs(logs, "damage_hit");

      const castTotal = casts.reduce((s, l) => s + l.amount, 0);
      const hitTotal = hits.reduce((s, l) => s + l.amount, 0);
      expect(hitTotal).toBeLessThanOrEqual(castTotal);

      // Projectiles in flight when combat ended: at most one per damage unit
      // (cooldown + MIN_COOLDOWN refresh exceed the 200ms travel time).
      expect(casts.length - hits.length).toBeGreaterThanOrEqual(0);
      expect(casts.length - hits.length).toBeLessThanOrEqual(DAMAGE_UNIT_COUNT);

      // Every hit amount is accounted for by a distinct cast of equal amount.
      const castAmounts = casts.map((l) => l.amount);
      for (const hit of hits) {
        const idx = castAmounts.indexOf(hit.amount);
        expect(idx).toBeGreaterThanOrEqual(0);
        castAmounts.splice(idx, 1);
      }
    }
  });

  it("threshold reactions fire exactly floor(totalStat / threshold) times", () => {
    for (const { logs } of runs) {
      const statsEntry = filterLogs(logs, "combat_stats")[0];
      const forceStats = new Map(statsEntry.currentCombatStats);
      const playerDamage = forceStats.get(Constants.FORCE_ID_PLAYER)!.damageDealt;

      // Threshold reactions are checked in step 3.5 of the frame loop,
      // BEFORE the outcome check in step 5. No damage is ever "unchecked"
      // — all damage dealt by the time combat ends has been seen by the
      // threshold subsystem.
      const expectedReactions = Math.floor(playerDamage / 100);
      const actualReactions = filterLogs(logs, "reaction").filter((l) => l.unitId === "threshold-reactor").length;
      expect(actualReactions).toBe(expectedReactions);
    }
  });

  it("haste_end / slow_end appear iff the status was applied and had time to decay", () => {
    for (const { logs } of runs) {
      const outcome = filterLogs(logs, "outcome")[0];
      const combatEndMs = outcome.timeMs;
      // Frame-granularity slack: decay is applied per frame (16.67ms).
      const slack = 2 * 16.67;

      for (const [hitType, endType] of [["haste_hit", "haste_end"], ["slow_hit", "slow_end"]] as const) {
        type HitEntry = Extract<CombatLogger.CombatLogEntry, { type: typeof hitType }>;
        const hits = filterLogs(logs, hitType) as HitEntry[];
        const ends = filterLogs(logs, endType);

        const byUnit = new Map<string, HitEntry[]>();
        for (const hit of hits) {
          byUnit.set(hit.targetId, [...(byUnit.get(hit.targetId) ?? []), hit]);
        }

        for (const [unitId, unitHits] of byUnit) {
          const unitEnds = ends.filter((l) => l.unitId === unitId);
          // No spurious ends, and at most one end episode per hit.
          expect(unitEnds.length).toBeLessThanOrEqual(unitHits.length);

          // If combat outlived the total applied duration, the status must
          // have decayed to zero at least once → at least one end log.
          const firstHitMs = Math.min(...unitHits.map((h) => h.timeMs));
          const totalDuration = unitHits.reduce((s, h) => s + h.effectDuration, 0);
          if (combatEndMs > firstHitMs + totalDuration + slack) {
            expect(unitEnds.length).toBeGreaterThanOrEqual(1);
          }
        }

        // Ends never appear for units that were never hit.
        for (const end of ends) {
          expect(byUnit.has(end.unitId)).toBe(true);
        }
      }
    }
  });

  it("replay determinism: the same seed produces identical logs", () => {
    for (const seed of SEEDS.slice(0, 3)) {
      const rerun = runScenario(seed);
      const original = runs[SEEDS.indexOf(seed)];
      expect(JSON.stringify(rerun.logs)).toBe(JSON.stringify(original.logs));
    }
  });
});
