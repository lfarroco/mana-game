/// <reference types="jest" />

/**
 * Grant ledger — orb/encounter-granted abilities survive rank upgrades.
 *
 * Regression tests for the void-crystal class bug: rank upgrades rebuilt a
 * unit's effects/reactions from the card definition, silently discarding
 * everything an orb had granted (e.g. void_dispel, "on cast dispel the
 * strongest enemy") and dropping granted reactions whose trigger collided
 * with a base reaction. Grants are now ledgered pristine
 * (`grantedEffects`/`grantedReactions`) and re-appended after the reset.
 */
import * as UnitEnt from "./Unit";
import * as OrbUpgrades from "../Actions/OrbAndCoreUpgrades";
import * as Card from "./Card";
import * as Constants from "../Constants";
import { CARDS_BY_ID } from "../data/BaseCollection";
import type { Unit } from "../Models";

beforeAll(() => Card.setCardsMap(CARDS_BY_ID));
afterAll(() => Card.resetCardsMap());

function voidCrystal(): Unit {
  return Card.makeUnit(Constants.FORCE_ID_PLAYER, "void_crystal", [1, 1]);
}

describe("grant ledger", () => {
  it("void_dispel (orb-granted effect) survives a rank upgrade", () => {
    const unit = voidCrystal();
    OrbUpgrades.applyCoreUpgrade(unit, "void_dispel", 3);
    expect(unit.effects.some((e) => e.id === "dispel")).toBe(true);

    UnitEnt.upgradeUnitData(unit);

    const dispels = unit.effects.filter((e) => e.id === "dispel");
    expect(dispels).toHaveLength(1);
    // Base kit intact alongside the grant.
    expect(unit.effects.some((e) => e.id === "damage")).toBe(true);
    expect(unit.effects.some((e) => e.id === "decrease_power")).toBe(true);
  });

  it("orb-granted reaction survives even when its trigger collides with a base reaction", () => {
    // echo_of_the_mask already reacts on "all" — the granted dispel shares
    // that trigger and used to be filtered out on rank-up.
    const unit = Card.makeUnit(
      Constants.FORCE_ID_PLAYER,
      "echo_of_the_mask",
      [0, 0],
    );
    const granted = {
      position: "allies",
      effectId: "all",
      effects: [{ id: "dispel", targets: { id: "strongest_enemy" } }],
    } as const;
    unit.reactions = [
      ...unit.reactions,
      structuredClone(granted) as unknown as Unit["reactions"][number],
    ];
    UnitEnt.recordGrantedReaction(
      unit,
      structuredClone(granted) as unknown as Unit["reactions"][number],
    );

    UnitEnt.upgradeUnitData(unit);

    expect(unit.reactions).toHaveLength(2);
    expect(
      unit.reactions.some((r) => r.effects.some((e) => e.id === "dispel")),
    ).toBe(true);
    // Base reaction still present (scaled, not duplicated).
    expect(
      unit.reactions.filter((r) =>
        r.effects.some((e) => e.id === "increase_power"),
      ),
    ).toHaveLength(1);
  });

  it("grants re-scale from pristine shapes without compounding across ranks", () => {
    const unit = voidCrystal();
    OrbUpgrades.applyCoreUpgrade(unit, "void_weakness", 3);
    // void_weakness grants decrease_power(5) — rank 1, unscaled.
    expect(unit.effects).toHaveLength(2);

    UnitEnt.upgradeUnitData(unit); // rank 1 → 2
    const afterFirst = unit.reactions.find((r) =>
      r.effects.some((e) => e.id === "decrease_power"),
    )!;
    const firstAmount = (
      afterFirst.effects.find((e) => e.id === "decrease_power") as {
        amount: number;
      }
    ).amount;

    UnitEnt.upgradeUnitData(unit); // rank 2 → 3
    const weakReactions = unit.reactions.filter((r) =>
      r.effects.some((e) => e.id === "decrease_power"),
    );
    // Still exactly one copy — no duplication from the ledger.
    expect(weakReactions).toHaveLength(1);
    const secondAmount = (
      weakReactions[0].effects.find((e) => e.id === "decrease_power") as {
        amount: number;
      }
    ).amount;
    // Scales with rank (5 × 3 = 15 at rank 3), not compounded (5 × 2 × 3).
    expect(secondAmount).toBeGreaterThan(firstAmount);
    expect(secondAmount).toBe(15);
  });

  it("a sacrificed grant stays gone after a rank-up (no resurrection)", () => {
    const unit = voidCrystal();
    OrbUpgrades.applyCoreUpgrade(unit, "void_dispel", 3);
    const dispel = unit.effects.find((e) => e.id === "dispel")!;
    UnitEnt.removeUnitEffect(unit, dispel);
    expect(unit.effects.some((e) => e.id === "dispel")).toBe(false);

    UnitEnt.upgradeUnitData(unit);

    expect(unit.effects.some((e) => e.id === "dispel")).toBe(false);
  });

  it("sacrificing a base ability leaves a same-lineage grant intact", () => {
    const unit = voidCrystal();
    // Grant a second decrease_power alongside the base one.
    OrbUpgrades.applyCoreUpgrade(unit, "void_power_sap", 3);
    expect(unit.effects.filter((e) => e.id === "decrease_power")).toHaveLength(
      2,
    );

    // Sacrifice the BASE copy (pristine base shape at rank 1).
    const base = unit.effects.find(
      (e) =>
        e.id === "decrease_power" && (e as { amount?: number }).amount === 10,
    )!;
    UnitEnt.removeUnitEffect(unit, base);

    UnitEnt.upgradeUnitData(unit);

    // Base restored by the reset; the grant survived the sacrifice.
    const decreases = unit.effects.filter((e) => e.id === "decrease_power");
    expect(decreases).toHaveLength(2);
  });
});
