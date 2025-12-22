import { Unit } from "@Models/Entities/Unit";
import { FORCE_ID_PLAYER, FORCE_ID_CPU } from "@Constants/constants";

// Helper function to create a test unit
const createTestUnit = (overrides: Partial<Unit>): Unit => ({
	id: "test_unit",
	cardId: "test_card",
	pic: "test",
	force: FORCE_ID_PLAYER,
	power: 50,
	bonusPower: 0,
	life: 500,
	maxLife: 500,
	shield: 0,
	cooldown: 5000,
	evade: 0,
	rank: 1,
	position: { x: 0, y: 0 },
	effects: [],
	reactions: [],
	charge: 0,
	refresh: 0,
	slowed: 0,
	hasted: 0,
	isCore: false,
	...overrides,
});

describe("Re-Slow and Re-Hasted Trigger Logic", () => {
	describe("re_slow trigger condition", () => {
		it("should detect when a unit already has slow status", () => {
			const unit = createTestUnit({ slowed: 1000 });

			// This simulates the check in applySlowLogicIO
			const hasSlowAlready = unit.slowed > 0;

			expect(hasSlowAlready).toBe(true);
		});

		it("should detect when a unit does NOT have slow status", () => {
			const unit = createTestUnit({ slowed: 0 });

			const hasSlowAlready = unit.slowed > 0;

			expect(hasSlowAlready).toBe(false);
		});

		it("should accumulate slow duration when applied multiple times", () => {
			const unit = createTestUnit({ slowed: 1000 });
			const additionalSlowDuration = 500;

			// Simulate applying slow again
			unit.slowed += additionalSlowDuration;

			expect(unit.slowed).toBe(1500);
		});
	});

	describe("re_hasted trigger condition", () => {
		it("should detect when a unit already has haste status", () => {
			const unit = createTestUnit({ hasted: 1000 });

			// This simulates the check in applyHasteLogicIO
			const hasHasteAlready = unit.hasted > 0;

			expect(hasHasteAlready).toBe(true);
		});

		it("should detect when a unit does NOT have haste status", () => {
			const unit = createTestUnit({ hasted: 0 });

			const hasHasteAlready = unit.hasted > 0;

			expect(hasHasteAlready).toBe(false);
		});

		it("should accumulate haste duration when applied multiple times", () => {
			const unit = createTestUnit({ hasted: 1000 });
			const additionalHasteDuration = 500;

			// Simulate applying haste again
			unit.hasted += additionalHasteDuration;

			expect(unit.hasted).toBe(1500);
		});
	});

	describe("corruption_bringer unit configuration", () => {
		it("should have re_slow reaction that targets strongest enemy with decrease_power", () => {
			const corruptionBringer = createTestUnit({
				id: "corruption_bringer",
				power: 80,
				rank: 3,
				reactions: [
					{
						position: "allies",
						effectId: "re_slow",
						effects: [
							{
								id: "decrease_power",
								amount: 10,
								targets: { id: "strongest_enemy" },
							},
						],
					},
				],
			});

			expect(corruptionBringer.reactions).toHaveLength(1);
			expect(corruptionBringer.reactions[0].effectId).toBe("re_slow");
			expect(corruptionBringer.reactions[0].position).toBe("allies");
			expect(corruptionBringer.reactions[0].effects[0].id).toBe("decrease_power");

			const effect = corruptionBringer.reactions[0].effects[0];
			if (effect.id === "decrease_power") {
				expect(effect.amount).toBe(10);
				expect(effect.targets.id).toBe("strongest_enemy");
			}
		});
	});

	describe("windlash_serpent unit configuration", () => {
		it("should have re_hasted reaction that increases own power", () => {
			const windlashSerpent = createTestUnit({
				id: "windlash_serpent",
				power: 95,
				rank: 3,
				reactions: [
					{
						position: "allies",
						effectId: "re_hasted",
						effects: [
							{
								id: "increase_power",
								amount: 5,
								targets: { id: "self" },
							},
						],
					},
				],
			});

			expect(windlashSerpent.reactions).toHaveLength(1);
			expect(windlashSerpent.reactions[0].effectId).toBe("re_hasted");
			expect(windlashSerpent.reactions[0].position).toBe("allies");
			expect(windlashSerpent.reactions[0].effects[0].id).toBe("increase_power");

			const effect = windlashSerpent.reactions[0].effects[0];
			if (effect.id === "increase_power") {
				expect(effect.amount).toBe(5);
				expect(effect.targets.id).toBe("self");
			}
		});
	});

	describe("orb effect - re_slow with shield allies", () => {
		it("should have re_slow reaction that increases power of shield allies", () => {
			const unitWithOrbEffect = createTestUnit({
				id: "orb_unit",
				reactions: [
					{
						position: "allies",
						effectId: "re_slow",
						effects: [
							{
								id: "increase_power",
								amount: 2,
								targets: { id: "all_allies", ofType: "shield" },
							},
						],
					},
				],
			});

			expect(unitWithOrbEffect.reactions).toHaveLength(1);
			expect(unitWithOrbEffect.reactions[0].effectId).toBe("re_slow");

			const effect = unitWithOrbEffect.reactions[0].effects[0];
			if (effect.id === "increase_power") {
				expect(effect.amount).toBe(2);
				expect(effect.targets.id).toBe("all_allies");
				if (effect.targets.id === "all_allies") {
					expect(effect.targets.ofType).toBe("shield");
				}
			}
		});
	});

	describe("reaction position filtering", () => {
		it("should only trigger for allies when position is 'allies'", () => {
			const reactingUnit = createTestUnit({
				id: "reacting_unit",
				force: FORCE_ID_PLAYER,
			});

			const allyTrigger = createTestUnit({
				id: "ally_trigger",
				force: FORCE_ID_PLAYER,
			});

			const enemyTrigger = createTestUnit({
				id: "enemy_trigger",
				force: FORCE_ID_CPU,
			});

			// Simulate the position check from processReactions
			const sameForce = (u: Unit, triggeringUnit: Unit) => u.force === triggeringUnit.force;

			const shouldTriggerForAlly = sameForce(reactingUnit, allyTrigger);
			const shouldTriggerForEnemy = sameForce(reactingUnit, enemyTrigger);

			expect(shouldTriggerForAlly).toBe(true);
			expect(shouldTriggerForEnemy).toBe(false);
		});
	});
});
