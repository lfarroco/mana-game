/// <reference types="jest" />

import * as OrbAndCoreUpgrades from "./OrbAndCoreUpgrades";
import * as OrbDefinitions from "../Orbs/OrbDefinitions";
import { Unit, Effect } from "../Models";
import * as Card from "../Entities/Card";
import * as CoreUpgradeOrbs from "../content/coreUpgradeOrbs";

function makeUnit(overrides: Partial<Unit> = {}): Unit {
  return {
    id: "u1",
    cardId: "test_card",
    pic: "",
    force: "PLAYER",
    position: [0, 0],
    rank: 1,
    power: 100,
    bonusPower: 0,
    life: 200,
    maxLife: 200,
    shield: 0,
    cooldown: 5000,
    evade: 0,
    effects: [],
    reactions: [],
    charge: 0,
    refresh: 0,
    hasted: 0,
    slowed: 0,
    silenced: 0,
    isCore: false,
    ...overrides,
  };
}

const dummyRng = { seed: "test-seed" };

describe("OrbAndCoreUpgrades", () => {
  describe("applyOrb", () => {
    afterEach(() => Card.resetCardsMap());

    it("upgrade_orb ranks up via the unified linear model (power + effects scaled)", () => {
      Card.setCardsMap(
        new Map([
          [
            "test_card",
            {
              id: "test_card",
              pic: "",
              cooldown: 5000,
              power: 50,
              rank: 1,
              effects: [
                {
                  id: "increase_power",
                  amount: 5,
                  permanent: false,
                  targets: { id: "self" },
                },
              ],
              reactions: [],
            },
          ],
        ]),
      );
      const unit = makeUnit({ rank: 1, power: 100, maxLife: 200, life: 150 });
      OrbAndCoreUpgrades.applyOrb([unit], "u1", "upgrade_orb", dummyRng);
      expect(unit.rank).toBe(2);
      // power = base 50 × (2 − 1 + 1) = 100; maxLife × 1.5 = 300; life = maxLife
      expect(unit.power).toBe(100);
      expect(unit.maxLife).toBe(300);
      expect(unit.life).toBe(300);
      // effect magnitude scales with rank: 5 × 2 = 10
      expect((unit.effects[0] as { amount: number }).amount).toBe(10);
    });

    it("absorb_power_orb absorbs from same-row units", () => {
      const target = makeUnit({ id: "u1", position: [1, 0], power: 100 });
      const neighbor = makeUnit({ id: "u2", position: [0, 0], power: 200 });
      OrbAndCoreUpgrades.applyOrb(
        [target, neighbor],
        "u1",
        "absorb_power_orb",
        dummyRng,
      );
      // Absorbed 25% = 50 from neighbor
      expect(neighbor.power).toBeLessThan(200);
      expect(target.power).toBeGreaterThan(100);
    });

    it("distribute_power_orb gives 50% of power to same-row units", () => {
      const donor = makeUnit({ id: "donor", position: [0, 0], power: 100 });
      const receiver = makeUnit({ id: "recv", position: [1, 0], power: 50 });
      const other = makeUnit({ id: "other", position: [0, 1], power: 50 });
      OrbAndCoreUpgrades.applyOrb(
        [donor, receiver, other],
        "donor",
        "distribute_power_orb",
        dummyRng,
      );
      expect(donor.power).toBeLessThan(100); // Lost 50%
      expect(receiver.power).toBeGreaterThan(50); // Gained something
      expect(other.power).toBe(50); // Different row, unchanged
    });

    it("does nothing for non-existent unit", () => {
      const unit = makeUnit();
      OrbAndCoreUpgrades.applyOrb(
        [unit],
        "nonexistent",
        "upgrade_orb",
        dummyRng,
      );
      expect(unit.rank).toBe(1); // unchanged
    });

    it("returns advanced seed after applying a reaction orb", () => {
      const units = [makeUnit({ id: "u1" })];
      const rng = { seed: "reaction-test-seed" };
      const originalSeed = rng.seed;

      const seedAfter = OrbAndCoreUpgrades.applyOrb(
        units,
        "u1",
        "on_100_damage_effect",
        rng,
      );

      // Reaction orbs consume RNG via pickOneSeeded — the seed advances
      expect(seedAfter).not.toBe(originalSeed);
      expect(typeof seedAfter).toBe("string");
    });

    it("returns the same seed after applying a stat orb (no RNG consumed)", () => {
      const units = [makeUnit({ id: "u1", effects: [{ id: "damage" }] })];
      const rng = { seed: "stat-orb-test" };
      const originalSeed = rng.seed;

      const seedAfter = OrbAndCoreUpgrades.applyOrb(
        units,
        "u1",
        "increase_power_on_damage",
        rng,
      );

      // Stat orbs don't touch RNG — the seed stays the same
      expect(seedAfter).toBe(originalSeed);
    });

    it("applies a stat orb through the registry (no prefix parsing)", () => {
      const unit = makeUnit({
        id: "u1",
        power: 100,
        effects: [{ id: "damage" } as Effect],
      });

      OrbAndCoreUpgrades.applyOrb([unit], "u1", "increase_power_on_damage", {
        seed: "stat-dispatch",
      });

      // The stat dispatch must actually call the increase-power helper.
      expect(unit.power).toBeGreaterThan(100);
    });

    it("dispatches every registered orb id without throwing", () => {
      const ids = Object.keys(OrbDefinitions.ORB_DEFINITIONS);
      expect(ids.length).toBeGreaterThan(0);

      for (const id of ids) {
        // Fresh unit per id: stat orbs need every basic effect type to land,
        // and sacrifice_unit/scrap_salvage can splice the target out.
        const unit = makeUnit({
          id: "u1",
          effects: [
            { id: "damage" },
            { id: "heal" },
            { id: "shield" },
            { id: "poison" },
            { id: "regen" },
            { id: "haste" },
            { id: "slow" },
            { id: "charge" },
          ] as Effect[],
        });

        const seedAfter = OrbAndCoreUpgrades.applyOrb([unit], "u1", id, {
          seed: "dispatch-test",
        });
        expect(typeof seedAfter).toBe("string");
      }
    });

    it("warns and no-ops on an unknown orb id (seed unchanged)", () => {
      const unit = makeUnit({ id: "u1" });
      const rng = { seed: "unknown" };

      const seedAfter = OrbAndCoreUpgrades.applyOrb(
        [unit],
        "u1",
        "not_an_orb",
        rng,
      );

      expect(seedAfter).toBe("unknown");
      expect(unit.effects).toHaveLength(0);
      expect(unit.reactions).toHaveLength(0);
    });

    it("consecutive reaction orbs advance the seed progressively", () => {
      const units = [makeUnit({ id: "u1" })];

      // Apply first reaction orb
      const seed1 = OrbAndCoreUpgrades.applyOrb(
        units,
        "u1",
        "on_100_damage_effect",
        { seed: "base" },
      );
      const reaction1 = units[0].reactions![0];

      // Apply second reaction orb — use the seed returned from the first call
      const seed2 = OrbAndCoreUpgrades.applyOrb(
        units,
        "u1",
        "on_100_damage_effect",
        { seed: seed1 },
      );
      const reaction2 = units[0].reactions![1];

      // Seed advanced on each call
      expect(seed1).not.toBe("base");
      expect(seed2).not.toBe(seed1);

      // Both reactions are valid EffectReaction objects
      expect(reaction1.effectId).toBe("every_100_damage");
      expect(reaction2.effectId).toBe("every_100_damage");
    });

    it("sacrifice_effect_orb removes a random effect and boosts power", () => {
      const unit = makeUnit({
        id: "u1",
        power: 100,
        effects: [{ id: "damage" } as Effect, { id: "heal" } as Effect],
      });
      const rng = { seed: "sacrifice-test" };
      const seedBefore = rng.seed;

      OrbAndCoreUpgrades.applyOrb([unit], "u1", "sacrifice_effect_orb", rng);

      // Power increased by SACRIFICE_POWER_INCREASE (10)
      expect(unit.power).toBe(110);
      // One effect was removed
      expect(unit.effects.length).toBe(1);
      // Seed advanced (RNG used for random pick)
      expect(rng.seed).not.toBe(seedBefore);
    });

    it("sacrifice_effect_orb removes a random reaction when no effects exist", () => {
      const unit = makeUnit({
        id: "u1",
        power: 100,
        effects: [],
        reactions: [
          { effectId: "on_battle_start", position: "self", effects: [] },
        ],
      });

      OrbAndCoreUpgrades.applyOrb([unit], "u1", "sacrifice_effect_orb", {
        seed: "reaction-only",
      });

      expect(unit.power).toBe(110);
      expect(unit.reactions.length).toBe(0);
    });

    it("sacrifice_effect_orb boosts power even with no effects or reactions", () => {
      const unit = makeUnit({
        id: "u1",
        power: 100,
        effects: [],
        reactions: [],
      });

      OrbAndCoreUpgrades.applyOrb([unit], "u1", "sacrifice_effect_orb", {
        seed: "empty",
      });

      expect(unit.power).toBe(110);
    });

    it("sacrifice_effect_orb advances the seed", () => {
      const unit = makeUnit({
        id: "u1",
        power: 100,
        effects: [{ id: "damage" } as Effect, { id: "shield" } as Effect],
      });
      const rng = { seed: "advance-test" };

      const seedAfter = OrbAndCoreUpgrades.applyOrb(
        [unit],
        "u1",
        "sacrifice_effect_orb",
        rng,
      );

      // RNG was consumed for the random effect pick
      expect(seedAfter).not.toBe("advance-test");
    });

    it("sacrifice_effect_orb does not advance seed when no effects or reactions exist", () => {
      const unit = makeUnit({
        id: "u1",
        power: 100,
        effects: [],
        reactions: [],
      });
      const rng = { seed: "no-advance" };

      const seedAfter = OrbAndCoreUpgrades.applyOrb(
        [unit],
        "u1",
        "sacrifice_effect_orb",
        rng,
      );

      // No RNG consumed — only flat power increase
      expect(seedAfter).toBe("no-advance");
    });
  });

  describe("upgradeCoreMaxLife", () => {
    it("increases maxLife and heals to full", () => {
      const core = makeUnit({
        id: "core",
        maxLife: 500,
        life: 300,
        isCore: true,
      });
      const msg = OrbAndCoreUpgrades.upgradeCoreMaxLife(core, 5);
      expect(core.maxLife).toBeGreaterThan(500);
      expect(core.life).toBe(core.maxLife);
      expect(typeof msg).toBe("string");
    });
  });

  describe("upgradeCorePower", () => {
    it("increases power", () => {
      const core = makeUnit({ id: "core", power: 100, isCore: true });
      const msg = OrbAndCoreUpgrades.upgradeCorePower(core, 5);
      expect(core.power).toBeGreaterThan(100);
      expect(core.bonusPower).toBeGreaterThan(0);
      expect(typeof msg).toBe("string");
    });
  });

  describe("decreaseCoreCooldown", () => {
    it("reduces cooldown", () => {
      const core = makeUnit({ id: "core", cooldown: 5000, isCore: true });
      const msg = OrbAndCoreUpgrades.decreaseCoreCooldown(core);
      expect(core.cooldown).toBeLessThan(5000);
      expect(typeof msg).toBe("string");
    });

    it("does not go below minimum cooldown", () => {
      const core = makeUnit({ id: "core", cooldown: 500, isCore: true });
      OrbAndCoreUpgrades.decreaseCoreCooldown(core);
      expect(core.cooldown).toBeGreaterThanOrEqual(500);
    });
  });

  describe("applyCoreUpgrade", () => {
    it("appends an effect orb's effect to the core (identity orb)", () => {
      const core = makeUnit({ id: "core", isCore: true });
      const def = CoreUpgradeOrbs.CORE_UPGRADE_DEFINITIONS.crit_crit_column;
      expect(def.kind).toBe("effect");

      OrbAndCoreUpgrades.applyCoreUpgrade(core, def.id, 1);

      expect(core.effects).toHaveLength(1);
      expect(JSON.stringify(core.effects[0])).toBe(JSON.stringify(def.effect));
    });

    it("appends a reaction orb's reaction to the core (identity orb)", () => {
      const core = makeUnit({ id: "core", isCore: true });
      const def = CoreUpgradeOrbs.CORE_UPGRADE_DEFINITIONS.crit_row_power;
      expect(def.kind).toBe("reaction");

      OrbAndCoreUpgrades.applyCoreUpgrade(core, def.id, 1);

      expect(core.reactions).toHaveLength(1);
      expect(JSON.stringify(core.reactions[0])).toBe(
        JSON.stringify(def.reaction),
      );
    });

    it("applies the generic stat ids via the stat helpers", () => {
      const core = makeUnit({ id: "core", power: 100, isCore: true });
      OrbAndCoreUpgrades.applyCoreUpgrade(core, "upgrade_core_power", 5);
      expect(core.power).toBeGreaterThan(100);
      expect(core.bonusPower).toBeGreaterThan(0);
    });

    it("is a no-op for unknown orb ids", () => {
      const core = makeUnit({ id: "core", isCore: true });
      expect(() =>
        OrbAndCoreUpgrades.applyCoreUpgrade(core, "not_a_real_orb", 1),
      ).not.toThrow();
      expect(core.effects).toHaveLength(0);
      expect(core.reactions).toHaveLength(0);
    });
  });
});
