/// <reference types="jest" />

import {
  getLogHandlerGroup,
  LOG_HANDLER_GROUPS,
  NO_FX_LOG_TYPES,
  type LogHandlerGroup,
} from "./logDispatch";

/**
 * Every type in the CombatLogInput union (see CombatLogger.ts). If the union
 * grows, this list and the Record in logDispatch.ts must both be updated —
 * the Record's type annotation makes a missing entry a compile error.
 */
const ALL_LOG_TYPES = [
  "damage_cast",
  "damage_hit",
  "heal_cast",
  "heal_hit",
  "shield_cast",
  "shield_hit",
  "poison_cast",
  "poison_hit",
  "regen_cast",
  "regen_hit",
  "haste_cast",
  "haste_hit",
  "slow_cast",
  "slow_hit",
  "silence_cast",
  "silence_hit",
  "dispel_cast",
  "dispel_hit",
  "charge_cast",
  "charge_hit",
  "haste_end",
  "slow_end",
  "silence_end",
  "silence_skip",
  "increase_power",
  "decrease_power",
  "increase_critical",
  "poison_tick",
  "regen_tick",
  "timeout_damage_cast",
  "timeout_damage_hit",
  "storm_start",
  "combat_stats",
  "outcome",
  "runaway_combat",
  "reaction",
] as const;

describe("log dispatch (B4)", () => {
  it("classifies every CombatLogEntry type", () => {
    expect(Object.keys(LOG_HANDLER_GROUPS).sort()).toEqual(
      [...ALL_LOG_TYPES].sort(),
    );
  });

  it("classifies cast/hit families consistently", () => {
    const castHitPairs: [string, string, LogHandlerGroup, LogHandlerGroup][] = [
      ["damage_cast", "damage_hit", "projectile_cast", "projectile_hit"],
      ["heal_cast", "heal_hit", "projectile_cast", "projectile_hit"],
      ["shield_cast", "shield_hit", "projectile_cast", "projectile_hit"],
      ["poison_cast", "poison_hit", "projectile_cast", "projectile_hit"],
      [
        "timeout_damage_cast",
        "timeout_damage_hit",
        "projectile_cast",
        "projectile_hit",
      ],
      ["regen_cast", "regen_hit", "status_cast", "status_hit"],
      ["haste_cast", "haste_hit", "status_cast", "status_hit"],
      ["slow_cast", "slow_hit", "status_cast", "status_hit"],
      ["charge_cast", "charge_hit", "status_cast", "status_hit"],
      ["silence_cast", "silence_hit", "status_cast", "status_hit"],
      ["dispel_cast", "dispel_hit", "status_cast", "status_hit"],
    ];
    for (const [cast, hit, castGroup, hitGroup] of castHitPairs) {
      expect(LOG_HANDLER_GROUPS[cast as keyof typeof LOG_HANDLER_GROUPS]).toBe(
        castGroup,
      );
      expect(LOG_HANDLER_GROUPS[hit as keyof typeof LOG_HANDLER_GROUPS]).toBe(
        hitGroup,
      );
    }
  });

  it("classifies ends, ticks, power, reactions and stats", () => {
    expect(LOG_HANDLER_GROUPS.haste_end).toBe("status_end");
    expect(LOG_HANDLER_GROUPS.slow_end).toBe("status_end");
    expect(LOG_HANDLER_GROUPS.silence_end).toBe("status_end");
    expect(LOG_HANDLER_GROUPS.silence_skip).toBe("status_end");
    expect(LOG_HANDLER_GROUPS.poison_tick).toBe("tick");
    expect(LOG_HANDLER_GROUPS.regen_tick).toBe("tick");
    expect(LOG_HANDLER_GROUPS.increase_power).toBe("power");
    expect(LOG_HANDLER_GROUPS.decrease_power).toBe("power");
    expect(LOG_HANDLER_GROUPS.reaction).toBe("reaction");
    expect(LOG_HANDLER_GROUPS.combat_stats).toBe("stats");
  });

  it("marks exactly the meta entries as no-FX", () => {
    expect(LOG_HANDLER_GROUPS.increase_critical).toBe("none");
    expect(LOG_HANDLER_GROUPS.storm_start).toBe("none");
    expect(LOG_HANDLER_GROUPS.outcome).toBe("none");
    expect(LOG_HANDLER_GROUPS.runaway_combat).toBe("none");

    expect([...NO_FX_LOG_TYPES].sort()).toEqual([
      "increase_critical",
      "outcome",
      "runaway_combat",
      "storm_start",
    ]);
  });

  it("getLogHandlerGroup returns the mapping for an entry", () => {
    expect(
      getLogHandlerGroup({
        type: "silence_hit",
        sourceId: "s",
        targetId: "t",
        effectDuration: 1,
        timeMs: 0,
      }),
    ).toBe("status_hit");
    expect(
      getLogHandlerGroup({
        type: "damage_cast",
        sourceId: "s",
        targetId: "t",
        amount: 1,
        travelTime: 1,
        timeMs: 0,
      }),
    ).toBe("projectile_cast");
  });
});
