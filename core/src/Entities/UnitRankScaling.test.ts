/// <reference types="jest" />

/**
 * Rank scaling of effects (`upgradeUnitData` → `upgradeUnitEffects`).
 *
 * Player report: "the shield core's give +x permanent to y allies ... getting
 * +1 target per level makes it insanely much stronger than the +x to lowest
 * power ally, despite being basically two flavors of the same effect."
 *
 * Cause: the rank multiplier used to be ASSIGNED to the targeting count
 * (`eff.targets.count = rankMultiplier`), which both discarded the authored
 * count and squared the per-cast output of multi-target buffs (`amount × rank`,
 * dealt to `rank` targets) while single-target effects grew linearly.
 *
 * Rule now: effect magnitudes scale with the rank multiplier, targeting counts
 * are structural and never scale.
 */
import * as Unit from "./Unit";
import * as Card from "./Card";
import { CARDS_BY_ID } from "../data/BaseCollection";
import * as Constants from "../Constants";
import type { Effect, Unit as UnitType } from "../Models";

beforeAll(() => Card.setCardsMap(CARDS_BY_ID));
afterAll(() => Card.resetCardsMap());

const make = (cardId: string): UnitType =>
  Card.makeUnit(Constants.FORCE_ID_PLAYER, cardId, [1, 1]);

const effectWithTargets = (unit: UnitType, id: string): Effect | undefined =>
  unit.effects.find((e) => e.id === id && "targets" in e);

describe("rank scaling — effect magnitudes vs targeting counts", () => {
  it("scales the power amount with rank but keeps the authored target count", () => {
    // timebender: `increasePower(2, randomAlly(1), true)` — the reported orb.
    const unit = make("timebender");
    const base = effectWithTargets(unit, "increase_power")!;
    expect(base).toMatchObject({
      amount: 2,
      targets: { id: "random_ally", count: 1 },
    });

    Unit.upgradeUnitData(unit); // bronze → silver (rankMultiplier 2)
    const silver = effectWithTargets(unit, "increase_power")!;
    expect(silver).toMatchObject({
      amount: 4,
      targets: { id: "random_ally", count: 1 },
    });

    Unit.upgradeUnitData(unit); // silver → gold (rankMultiplier 3)
    Unit.upgradeUnitData(unit); // gold → platinum (rankMultiplier 4)
    const platinum = effectWithTargets(unit, "increase_power")!;

    // Magnitude grew linearly (2 → 8); the width stayed 1, so per-cast output
    // is 8 instead of the old 8 × 4 targets = 32.
    expect(platinum).toMatchObject({
      amount: 8,
      targets: { id: "random_ally", count: 1 },
    });
  });

  it("preserves a multi-target count authored above 1 at every rank", () => {
    // spellbreaker: `haste(1000, randomAlly(2))` — the old rule clobbered the
    // authored 2 with the rank multiplier (1 at its base rank).
    const unit = make("spellbreaker");
    const hasteOf = (u: UnitType) =>
      u.effects.find((e) => e.id === "haste") as Effect & {
        targets: { count: number };
      };

    expect(hasteOf(unit).targets.count).toBe(2);

    Unit.upgradeUnitData(unit); // rank 2
    expect(hasteOf(unit).targets.count).toBe(2);

    Unit.upgradeUnitData(unit);
    Unit.upgradeUnitData(unit); // platinum
    expect(hasteOf(unit).targets.count).toBe(2);
  });

  it("keeps authored counts on reactions too", () => {
    // gambler: reaction "all" → `increaseCritical(5, column)`; the counted
    // target lives on its base effect. Pick a card with a counted reaction
    // target to prove the reaction path is covered as well.
    const unit = make("gambler");
    const effect = effectWithTargets(unit, "increase_critical")!;
    expect(effect).toMatchObject({
      amount: 10,
      targets: { id: "random_ally", count: 1 },
    });

    Unit.upgradeUnitData(unit);
    expect(effectWithTargets(unit, "increase_critical")).toMatchObject({
      amount: 20,
      targets: { id: "random_ally", count: 1 },
    });
  });
});
