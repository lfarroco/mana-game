/// <reference types="jest" />

import * as OrbAndCoreUpgrades from "./OrbAndCoreUpgrades";
import { Unit } from "../Models";

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
		isCore: false,
		...overrides,
	};
}

const dummyRng = { seed: "test-seed" };

describe("OrbAndCoreUpgrades", () => {
	describe("applyOrb", () => {
		it("upgrade_orb ranks up and multiplies stats", () => {
			const unit = makeUnit({ rank: 1, power: 100, maxLife: 200, life: 150 });
			OrbAndCoreUpgrades.applyOrb([unit], "u1", "upgrade_orb", dummyRng);
			expect(unit.rank).toBe(2);
			expect(unit.power).toBe(Math.floor(100 * 1.75));
			expect(unit.maxLife).toBe(Math.floor(200 * 1.75));
			expect(unit.life).toBe(unit.maxLife);
		});

		it("absorb_power_orb absorbs from same-row units", () => {
			const target = makeUnit({ id: "u1", position: [1, 0], power: 100 });
			const neighbor = makeUnit({ id: "u2", position: [0, 0], power: 200 });
			OrbAndCoreUpgrades.applyOrb([target, neighbor], "u1", "absorb_power_orb", dummyRng);
			// Absorbed 25% = 50 from neighbor
			expect(neighbor.power).toBeLessThan(200);
			expect(target.power).toBeGreaterThan(100);
		});

		it("distribute_power_orb gives 50% of power to same-row units", () => {
			const donor = makeUnit({ id: "donor", position: [0, 0], power: 100 });
			const receiver = makeUnit({ id: "recv", position: [1, 0], power: 50 });
			const other = makeUnit({ id: "other", position: [0, 1], power: 50 });
			OrbAndCoreUpgrades.applyOrb([donor, receiver, other], "donor", "distribute_power_orb", dummyRng);
			expect(donor.power).toBeLessThan(100); // Lost 50%
			expect(receiver.power).toBeGreaterThan(50); // Gained something
			expect(other.power).toBe(50); // Different row, unchanged
		});

		it("does nothing for non-existent unit", () => {
			const unit = makeUnit();
			OrbAndCoreUpgrades.applyOrb([unit], "nonexistent", "upgrade_orb", dummyRng);
			expect(unit.rank).toBe(1); // unchanged
		});

		it("returns advanced seed after applying a reaction orb", () => {
			const units = [makeUnit({ id: "u1" })];
			const rng = { seed: "reaction-test-seed" };
			const originalSeed = rng.seed;

			const seedAfter = OrbAndCoreUpgrades.applyOrb(units, "u1", "on_100_damage_effect", rng);

			// Reaction orbs consume RNG via pickOneSeeded — the seed advances
			expect(seedAfter).not.toBe(originalSeed);
			expect(typeof seedAfter).toBe("string");
		});

		it("returns the same seed after applying a stat orb (no RNG consumed)", () => {
			const units = [makeUnit({ id: "u1", effects: [{ id: "damage" }] })];
			const rng = { seed: "stat-orb-test" };
			const originalSeed = rng.seed;

			const seedAfter = OrbAndCoreUpgrades.applyOrb(units, "u1", "increase_power_on_damage", rng);

			// Stat orbs don't touch RNG — the seed stays the same
			expect(seedAfter).toBe(originalSeed);
		});

		it("consecutive reaction orbs advance the seed progressively", () => {
			const units = [makeUnit({ id: "u1" })];

			// Apply first reaction orb
			const seed1 = OrbAndCoreUpgrades.applyOrb(units, "u1", "on_100_damage_effect", { seed: "base" });
			const reaction1 = units[0].reactions![0];

			// Apply second reaction orb — use the seed returned from the first call
			const seed2 = OrbAndCoreUpgrades.applyOrb(units, "u1", "on_100_damage_effect", { seed: seed1 });
			const reaction2 = units[0].reactions![1];

			// Seed advanced on each call
			expect(seed1).not.toBe("base");
			expect(seed2).not.toBe(seed1);

			// Both reactions are valid EffectReaction objects
			expect(reaction1.effectId).toBe("every_100_damage");
			expect(reaction2.effectId).toBe("every_100_damage");
		});
	});

	describe("upgradeCoreMaxLife", () => {
		it("increases maxLife and heals to full", () => {
			const core = makeUnit({ id: "core", maxLife: 500, life: 300, isCore: true });
			const msg = OrbAndCoreUpgrades.upgradeCoreMaxLife(core, 5);
			expect(core.maxLife).toBeGreaterThan(500);
			expect(core.life).toBe(core.maxLife);
			expect(typeof msg).toBe("string");
		});
	});

	describe("upgradeCorepower", () => {
		it("increases power", () => {
			const core = makeUnit({ id: "core", power: 100, isCore: true });
			const msg = OrbAndCoreUpgrades.upgradeCorepower(core, 5);
			expect(core.power).toBeGreaterThan(100);
			expect(core.bonusPower).toBeGreaterThan(0);
			expect(typeof msg).toBe("string");
		});
	});

	describe("decreaseCoresCooldown", () => {
		it("reduces cooldown", () => {
			const core = makeUnit({ id: "core", cooldown: 5000, isCore: true });
			const msg = OrbAndCoreUpgrades.decreaseCoresCooldown(core);
			expect(core.cooldown).toBeLessThan(5000);
			expect(typeof msg).toBe("string");
		});

		it("does not go below minimum cooldown", () => {
			const core = makeUnit({ id: "core", cooldown: 500, isCore: true });
			OrbAndCoreUpgrades.decreaseCoresCooldown(core);
			expect(core.cooldown).toBeGreaterThanOrEqual(500);
		});
	});
});
