/// <reference types="jest" />

/**
 * Structural tests for the awaken-powers catalog.
 *
 * The awaken mechanic (docs/awaken.md): a bronze-origin unit promoted to gold
 * gains a player-chosen reaction from this catalog. The powers are runtime-only
 * grants (never card definitions), so they are not covered by the BaseCollection
 * balance suite — these tests enforce the same structural rules that suite
 * applies to static cards (no dead "self" reactions, "enemies" reactions set
 * triggerTeam, unique/known reactions).
 */

import { AWAKEN_POWER_LIST, validateAwakenPower } from "./awakenPowers";

describe("awakenPowers", () => {
  it("passes structural validation (no dead self reactions, enemies set triggerTeam)", () => {
    const issues = AWAKEN_POWER_LIST.flatMap((power) =>
      validateAwakenPower(power).map((issue) => `${power.id}: ${issue}`),
    );
    expect(issues).toEqual([]);
  });

  it("has unique ids and unique reactions", () => {
    const ids = AWAKEN_POWER_LIST.map((power) => power.id);
    expect(new Set(ids).size).toBe(ids.length);

    const reactions = AWAKEN_POWER_LIST.map((power) =>
      JSON.stringify(power.reaction),
    );
    expect(new Set(reactions).size).toBe(reactions.length);
  });

  it("offers at least 3 powers (a full awaken selection)", () => {
    expect(AWAKEN_POWER_LIST.length).toBeGreaterThanOrEqual(3);
  });

  it("every power carries a non-empty effect list and no unused 'self' position", () => {
    for (const power of AWAKEN_POWER_LIST) {
      expect(power.reaction.effects.length).toBeGreaterThan(0);
      expect(power.reaction.position).not.toBe("self");
      expect(power.icon).toMatch(/^ui\//);
      expect(power.nameKey).toMatch(/^awakenPowers\./);
      expect(power.tooltipKey).toMatch(/^awakenPowers\./);
    }
  });
});
