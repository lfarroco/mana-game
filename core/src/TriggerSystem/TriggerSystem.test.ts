/**
 * Unit tests for TriggerSystem.resolveTargets — focusing on the
 * all_allies + ofType filtering path (previously untested).
 */
/// <reference types="jest" />

import {
  registerBaseCollection,
  resetCardRegistry,
  makeTestUnit,
  setupCombat,
} from "../__test_utils__/combatHarness";
import * as TriggerSystem from "./TriggerSystem";
import { increasePower, allAlliesOfType, allAllies } from "../data/effectBuilders";
import * as Models from "../Models";

beforeAll(registerBaseCollection);
afterAll(resetCardRegistry);

/**
 * Build a combat with a controlled player team (including a custom inert core
 * so the auto-added critical_crystal doesn't pollute ofType results) and
 * return the combat-state copies of the units plus the env.
 */
function setupTargeting(units: Models.Unit[]) {
  const core = makeTestUnit({ effects: [], isCore: true, position: [2, 2] });
  core.id = "player-core";
  const { env } = setupCombat([...units, core]);
  const byId = (id: string) => env.combatState.units.find((u) => u.id === id)!;
  return { env, byId };
}

describe("resolveTargets — all_allies with ofType", () => {
  it("ofType 'shield' returns only allies that have a shield effect", () => {
    const source = makeTestUnit({ effects: [{ id: "damage" }], position: [0, 0] });
    source.id = "source";
    const shieldAlly = makeTestUnit({ effects: [{ id: "shield" }], position: [0, 1] });
    shieldAlly.id = "shield-ally";
    const damageAlly = makeTestUnit({ effects: [{ id: "damage" }], position: [1, 0] });
    damageAlly.id = "damage-ally";

    const { env, byId } = setupTargeting([source, shieldAlly, damageAlly]);

    const resolved = TriggerSystem.resolveTargets(
      env,
      byId("source"),
      increasePower(1, allAlliesOfType("shield")),
    );

    expect(resolved.map((u) => u.id)).toEqual(["shield-ally"]);
  });

  it("ofType 'any' returns all allies except the source unit", () => {
    const source = makeTestUnit({ effects: [{ id: "damage" }], position: [0, 0] });
    source.id = "source";
    const shieldAlly = makeTestUnit({ effects: [{ id: "shield" }], position: [0, 1] });
    shieldAlly.id = "shield-ally";

    const { env, byId } = setupTargeting([source, shieldAlly]);

    const resolved = TriggerSystem.resolveTargets(
      env,
      byId("source"),
      increasePower(1, allAllies),
    );

    // Core is an ally too; only the source itself is excluded.
    expect(resolved.map((u) => u.id)).toEqual(["shield-ally", "player-core"]);
  });

  it("ofType matching the source's own effect type includes the source", () => {
    // Unlike ofType "any", the typed branch does not exclude the source unit.
    const source = makeTestUnit({ effects: [{ id: "damage" }], position: [0, 0] });
    source.id = "source";
    const damageAlly = makeTestUnit({ effects: [{ id: "damage" }], position: [1, 0] });
    damageAlly.id = "damage-ally";
    const shieldAlly = makeTestUnit({ effects: [{ id: "shield" }], position: [0, 1] });
    shieldAlly.id = "shield-ally";

    const { env, byId } = setupTargeting([source, damageAlly, shieldAlly]);

    const resolved = TriggerSystem.resolveTargets(
      env,
      byId("source"),
      increasePower(1, allAlliesOfType("damage")),
    );

    expect(resolved.map((u) => u.id)).toEqual(["source", "damage-ally"]);
  });

  it("never returns enemy units, even if they match ofType", () => {
    const source = makeTestUnit({ effects: [{ id: "shield" }], position: [0, 0] });
    source.id = "source";

    const { env, byId } = setupTargeting([source]);

    // The CPU core is a critical_crystal (damage effect) — an enemy.
    // No ally has a damage effect, so the enemy core must yield an empty result.
    const resolved = TriggerSystem.resolveTargets(
      env,
      byId("source"),
      increasePower(1, allAlliesOfType("damage")),
    );

    expect(resolved).toHaveLength(0);
  });
});
