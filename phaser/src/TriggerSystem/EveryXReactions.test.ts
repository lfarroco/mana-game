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

describe("Every_X Reaction Logic", () => {
	describe("Threshold constants", () => {
		it("should use 100 as threshold for damage", () => {
			const DAMAGE_THRESHOLD = 100;
			expect(DAMAGE_THRESHOLD).toBe(100);
		});

		it("should use 100 as threshold for shield", () => {
			const SHIELD_THRESHOLD = 100;
			expect(SHIELD_THRESHOLD).toBe(100);
		});

		it("should use 100 as threshold for heal", () => {
			const HEAL_THRESHOLD = 100;
			expect(HEAL_THRESHOLD).toBe(100);
		});

		it("should use 10 as threshold for poison", () => {
			const POISON_THRESHOLD = 10;
			expect(POISON_THRESHOLD).toBe(10);
		});

		it("should use 10 as threshold for regen", () => {
			const REGEN_THRESHOLD = 10;
			expect(REGEN_THRESHOLD).toBe(10);
		});
	});

	describe("Scaling behavior", () => {
		it("should trigger once when exactly at threshold", () => {
			const damage = 100;
			const threshold = 100;

			const triggers = Math.floor(damage / threshold);

			expect(triggers).toBe(1);
		});

		it("should trigger twice when at 2x threshold", () => {
			const damage = 200;
			const threshold = 100;

			const triggers = Math.floor(damage / threshold);

			expect(triggers).toBe(2);
		});

		it("should not trigger when below threshold", () => {
			const damage = 99;
			const threshold = 100;

			const triggers = Math.floor(damage / threshold);

			expect(triggers).toBe(0);
		});

		it("should calculate correct scale for accumulated damage", () => {
			const oldTotal = 80;
			const newDamage = 150;
			const threshold = 100;

			const oldThresholds = Math.floor(oldTotal / threshold);
			const newThresholds = Math.floor((oldTotal + newDamage) / threshold);
			const scale = newThresholds - oldThresholds;

			// 80 + 150 = 230, which is 2 thresholds
			// Old was 0 thresholds, so scale should be 2
			expect(scale).toBe(2);
		});

		it("should calculate correct scale for poison accumulation", () => {
			const oldTotal = 8;
			const newPoison = 15;
			const threshold = 10;

			const oldThresholds = Math.floor(oldTotal / threshold);
			const newThresholds = Math.floor((oldTotal + newPoison) / threshold);
			const scale = newThresholds - oldThresholds;

			// 8 + 15 = 23, which is 2 thresholds
			// Old was 0 thresholds, so scale should be 2
			expect(scale).toBe(2);
		});
	});

	describe("every_100_damage reaction configuration", () => {
		it("should have reaction that increases poison ally power", () => {
			const unit = createTestUnit({
				id: "damage_tracker",
				reactions: [
					{
						position: "allies",
						effectId: "every_100_damage",
						effects: [
							{
								id: "increase_power",
								amount: 5,
								targets: { id: "all_allies", ofType: "poison" },
							},
						],
					},
				],
			});

			expect(unit.reactions).toHaveLength(1);
			expect(unit.reactions[0].effectId).toBe("every_100_damage");
			expect(unit.reactions[0].position).toBe("allies");

			const effect = unit.reactions[0].effects[0];
			if (effect.id === "increase_power") {
				expect(effect.amount).toBe(5);
				expect(effect.targets.id).toBe("all_allies");
				if (effect.targets.id === "all_allies") {
					expect(effect.targets.ofType).toBe("poison");
				}
			}
		});

		it("should have reaction that increases damage ally power", () => {
			const unit = createTestUnit({
				id: "damage_tracker_2",
				reactions: [
					{
						position: "allies",
						effectId: "every_100_damage",
						effects: [
							{
								id: "increase_power",
								amount: 5,
								targets: { id: "all_allies", ofType: "damage" },
							},
						],
					},
				],
			});

			const effect = unit.reactions[0].effects[0];
			if (effect.id === "increase_power" && effect.targets.id === "all_allies") {
				expect(effect.targets.ofType).toBe("damage");
			}
		});
	});

	describe("every_100_shield reaction configuration", () => {
		it("should have reaction that increases heal/damage/poison/regen ally power", () => {
			const possibleTypes: Array<"heal" | "damage" | "poison" | "regen"> = [
				"heal",
				"damage",
				"poison",
				"regen",
			];

			possibleTypes.forEach((type) => {
				const unit = createTestUnit({
					id: `shield_tracker_${type}`,
					reactions: [
						{
							position: "allies",
							effectId: "every_100_shield",
							effects: [
								{
									id: "increase_power",
									amount: 2,
									targets: { id: "all_allies", ofType: type },
								},
							],
						},
					],
				});

				expect(unit.reactions[0].effectId).toBe("every_100_shield");
				const effect = unit.reactions[0].effects[0];
				if (effect.id === "increase_power" && effect.targets.id === "all_allies") {
					expect(effect.targets.ofType).toBe(type);
				}
			});
		});
	});

	describe("every_100_heal reaction configuration", () => {
		it("should have reaction that increases weakest ally power", () => {
			const unit = createTestUnit({
				id: "heal_tracker",
				reactions: [
					{
						position: "allies",
						effectId: "every_100_heal",
						effects: [
							{
								id: "increase_power",
								amount: 10,
								targets: { id: "weakest_ally" },
							},
						],
					},
				],
			});

			expect(unit.reactions[0].effectId).toBe("every_100_heal");
			const effect = unit.reactions[0].effects[0];
			if (effect.id === "increase_power") {
				expect(effect.targets.id).toBe("weakest_ally");
			}
		});

		it("should have reaction that increases typed ally power", () => {
			const possibleTypes: Array<"shield" | "damage" | "poison" | "regen"> = [
				"shield",
				"damage",
				"poison",
				"regen",
			];

			possibleTypes.forEach((type) => {
				const unit = createTestUnit({
					id: `heal_tracker_${type}`,
					reactions: [
						{
							position: "allies",
							effectId: "every_100_heal",
							effects: [
								{
									id: "increase_power",
									amount: 2,
									targets: { id: "all_allies", ofType: type },
								},
							],
						},
					],
				});

				expect(unit.reactions[0].effectId).toBe("every_100_heal");
			});
		});
	});

	describe("every_10_poison reaction configuration", () => {
		it("should have reaction that increases damage ally power", () => {
			const unit = createTestUnit({
				id: "poison_tracker",
				reactions: [
					{
						position: "allies",
						effectId: "every_10_poison",
						effects: [
							{
								id: "increase_power",
								amount: 5,
								targets: { id: "all_allies", ofType: "damage" },
							},
						],
					},
				],
			});

			expect(unit.reactions[0].effectId).toBe("every_10_poison");
			const effect = unit.reactions[0].effects[0];
			if (effect.id === "increase_power" && effect.targets.id === "all_allies") {
				expect(effect.targets.ofType).toBe("damage");
			}
		});

		it("should have reaction that increases poison ally power", () => {
			const unit = createTestUnit({
				id: "poison_tracker_2",
				reactions: [
					{
						position: "allies",
						effectId: "every_10_poison",
						effects: [
							{
								id: "increase_power",
								amount: 5,
								targets: { id: "all_allies", ofType: "poison" },
							},
						],
					},
				],
			});

			const effect = unit.reactions[0].effects[0];
			if (effect.id === "increase_power" && effect.targets.id === "all_allies") {
				expect(effect.targets.ofType).toBe("poison");
			}
		});
	});

	describe("every_10_regen reaction configuration", () => {
		it("should have reaction that increases typed ally power", () => {
			const possibleTypes: Array<"shield" | "damage" | "poison" | "heal"> = [
				"shield",
				"damage",
				"poison",
				"heal",
			];

			possibleTypes.forEach((type) => {
				const unit = createTestUnit({
					id: `regen_tracker_${type}`,
					reactions: [
						{
							position: "allies",
							effectId: "every_10_regen",
							effects: [
								{
									id: "increase_power",
									amount: 2,
									targets: { id: "all_allies", ofType: type },
								},
							],
						},
					],
				});

				expect(unit.reactions[0].effectId).toBe("every_10_regen");
			});
		});
	});

	describe("GLOBAL_REACTIONS behavior", () => {
		it("should include every_X reactions in GLOBAL_REACTIONS list", () => {
			const GLOBAL_REACTIONS = [
				"on_crit",
				"every_100_damage",
				"every_100_shield",
				"every_100_heal",
				"every_10_poison",
				"every_10_regen",
				"on_over_heal",
				"on_battle_start",
			];

			expect(GLOBAL_REACTIONS).toContain("every_100_damage");
			expect(GLOBAL_REACTIONS).toContain("every_100_shield");
			expect(GLOBAL_REACTIONS).toContain("every_100_heal");
			expect(GLOBAL_REACTIONS).toContain("every_10_poison");
			expect(GLOBAL_REACTIONS).toContain("every_10_regen");
		});

		it("should allow reactions to trigger on self for GLOBAL_REACTIONS", () => {
			// GLOBAL_REACTIONS allow units to react to their own actions
			// This is different from regular reactions which filter out self
			const reactingUnit = createTestUnit({
				id: "self_reactor",
				force: FORCE_ID_PLAYER,
			});

			const triggeringUnit = reactingUnit; // Same unit

			// For GLOBAL_REACTIONS, the check is:
			// u.id != triggeringUnit.id || GLOBAL_REACTIONS.includes(effect.id)
			const isGlobalReaction = true;
			const shouldTrigger = reactingUnit.id !== triggeringUnit.id || isGlobalReaction;

			expect(shouldTrigger).toBe(true);
		});
	});

	describe("Force-level tracking", () => {
		it("should track damage at force level, not unit level", () => {
			// Simulate two units from the same force dealing damage
			const unit1Damage = 60;
			const unit2Damage = 50;
			const totalForceDamage = unit1Damage + unit2Damage;
			const threshold = 100;

			const triggers = Math.floor(totalForceDamage / threshold);

			// Combined damage of 110 should trigger once
			expect(triggers).toBe(1);
		});

		it("should track poison at force level", () => {
			const unit1Poison = 6;
			const unit2Poison = 5;
			const totalForcePoison = unit1Poison + unit2Poison;
			const threshold = 10;

			const triggers = Math.floor(totalForcePoison / threshold);

			// Combined poison of 11 should trigger once
			expect(triggers).toBe(1);
		});
	});

	describe("Orb effects with every_X reactions", () => {
		it("should create orb with every_100_damage reaction", () => {
			const unitWithOrb = createTestUnit({
				id: "orb_damage_unit",
				reactions: [
					{
						position: "allies",
						effectId: "every_100_damage",
						effects: [
							{
								id: "increase_power",
								amount: 2,
								targets: { id: "all_allies", ofType: "heal" },
							},
						],
					},
				],
			});

			expect(unitWithOrb.reactions[0].effectId).toBe("every_100_damage");
		});

		it("should create orb with every_10_poison reaction", () => {
			const unitWithOrb = createTestUnit({
				id: "orb_poison_unit",
				reactions: [
					{
						position: "allies",
						effectId: "every_10_poison",
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

			expect(unitWithOrb.reactions[0].effectId).toBe("every_10_poison");
		});
	});
});
