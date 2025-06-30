import {
	getEffectParams,
	calculateDamageAmount,
	calculateHealingAmount,
	isValidTarget,
	filterValidTargets,
	calculateEffectDuration,
	traitHasEffect,
	calculateGoldReward,
	validateEffectParameters
} from "./TraitSystem.pure";
import { Unit } from "../Models/Entities/Unit";
import { TraitData } from "./Traits";

// Helper function to create mock units
function createMockUnit(id: string, hp: number = 100, force: string = "player"): Unit {
	return {
		id,
		cardId: "test-card",
		name: "Test Unit",
		pic: "test.png",
		hp,
		maxHp: hp,
		force,
		power: 15,
		attackType: "damage",
		cooldown: 100,
		crit: 5,
		evade: 10,
		position: { tag: "_vec2" as const, x: 0, y: 0 },
		traits: [],
		charge: 0,
		refresh: 0,
		hasted: 0,
		slowed: 0
	} as Unit;
}

describe("getEffectParams", () => {
	it("should return effect instance parameter when present", () => {
		const traitParams = { amount: 10 };
		const effectParams = { amount: 20 };

		const result = getEffectParams(traitParams, effectParams, "amount", 5);

		expect(result).toBe(20); // Effect instance takes priority
	});

	it("should return trait instance parameter when effect instance doesn't have it", () => {
		const traitParams = { amount: 10 };
		const effectParams = {};

		const result = getEffectParams(traitParams, effectParams, "amount", 5);

		expect(result).toBe(10);
	});

	it("should return default value when neither has the parameter", () => {
		const traitParams = {};
		const effectParams = {};

		const result = getEffectParams(traitParams, effectParams, "amount", 5);

		expect(result).toBe(5);
	});

	it("should handle undefined objects gracefully", () => {
		const result = getEffectParams(undefined as any, undefined as any, "amount", 5);

		expect(result).toBe(5);
	});

	it("should work with different parameter types", () => {
		const traitParams = { text: "hello", enabled: true };
		const effectParams = { text: "world" };

		expect(getEffectParams(traitParams, effectParams, "text", "default")).toBe("world");
		expect(getEffectParams(traitParams, effectParams, "enabled", false)).toBe(true);
		expect(getEffectParams(traitParams, effectParams, "missing", "default")).toBe("default");
	});
});

describe("calculateDamageAmount", () => {
	const mockUnit = createMockUnit("unit1");

	it("should calculate basic damage correctly", () => {
		const result = calculateDamageAmount(10, mockUnit);

		expect(result).toBe(10);
	});

	it("should apply multiplier correctly", () => {
		const result = calculateDamageAmount(10, mockUnit, 2.0);

		expect(result).toBe(20);
	});

	it("should apply flat bonus correctly", () => {
		const result = calculateDamageAmount(10, mockUnit, 1.0, 5);

		expect(result).toBe(15);
	});

	it("should apply both multiplier and flat bonus", () => {
		const result = calculateDamageAmount(10, mockUnit, 1.5, 5);

		expect(result).toBe(22); // (10 + 5) * 1.5 = 22.5, floored to 22
	});

	it("should floor fractional results", () => {
		const result = calculateDamageAmount(10, mockUnit, 1.7);

		expect(result).toBe(17); // 10 * 1.7 = 17.0
	});

	it("should ensure non-negative damage", () => {
		const result = calculateDamageAmount(5, mockUnit, 1.0, -10);

		expect(result).toBe(0); // (5 + (-10)) * 1.0 = -5, clamped to 0
	});
});

describe("calculateHealingAmount", () => {
	const mockUnit = createMockUnit("unit1");

	it("should calculate basic healing correctly", () => {
		const result = calculateHealingAmount(15, mockUnit);

		expect(result).toBe(15);
	});

	it("should apply multiplier correctly", () => {
		const result = calculateHealingAmount(15, mockUnit, 1.5);

		expect(result).toBe(22); // 15 * 1.5 = 22.5, floored to 22
	});

	it("should apply flat bonus correctly", () => {
		const result = calculateHealingAmount(15, mockUnit, 1.0, 3);

		expect(result).toBe(18);
	});

	it("should ensure non-negative healing", () => {
		const result = calculateHealingAmount(5, mockUnit, 1.0, -10);

		expect(result).toBe(0);
	});
});

describe("isValidTarget", () => {
	const sourceUnit = createMockUnit("source", 100, "player");
	const aliveAlly = createMockUnit("ally", 50, "player");
	const deadAlly = createMockUnit("deadAlly", 0, "player");
	const aliveEnemy = createMockUnit("enemy", 75, "enemy");
	const deadEnemy = createMockUnit("deadEnemy", 0, "enemy");

	it("should allow targeting alive units by default", () => {
		expect(isValidTarget(sourceUnit, aliveAlly)).toBe(true);
		expect(isValidTarget(sourceUnit, aliveEnemy)).toBe(true);
	});

	it("should reject dead units when requiresAlive is true", () => {
		expect(isValidTarget(sourceUnit, deadAlly, true)).toBe(false);
		expect(isValidTarget(sourceUnit, deadEnemy, true)).toBe(false);
	});

	it("should allow dead units when requiresAlive is false", () => {
		expect(isValidTarget(sourceUnit, deadAlly, false)).toBe(true);
		expect(isValidTarget(sourceUnit, deadEnemy, false)).toBe(true);
	});

	it("should enforce same force requirement", () => {
		expect(isValidTarget(sourceUnit, aliveAlly, true, true, false)).toBe(true);
		expect(isValidTarget(sourceUnit, aliveEnemy, true, true, false)).toBe(false);
	});

	it("should enforce different force requirement", () => {
		expect(isValidTarget(sourceUnit, aliveAlly, true, false, true)).toBe(false);
		expect(isValidTarget(sourceUnit, aliveEnemy, true, false, true)).toBe(true);
	});

	it("should handle self-targeting logic", () => {
		// Self-targeting allowed for same-force effects
		expect(isValidTarget(sourceUnit, sourceUnit, true, true, false)).toBe(true);
		// Self-targeting rejected for different-force effects
		expect(isValidTarget(sourceUnit, sourceUnit, true, false, true)).toBe(false);
	});
});

describe("filterValidTargets", () => {
	const sourceUnit = createMockUnit("source", 100, "player");
	const aliveAlly1 = createMockUnit("ally1", 50, "player");
	const aliveAlly2 = createMockUnit("ally2", 30, "player");
	const deadAlly = createMockUnit("deadAlly", 0, "player");
	const aliveEnemy1 = createMockUnit("enemy1", 75, "enemy");
	const aliveEnemy2 = createMockUnit("enemy2", 40, "enemy");

	const allUnits = [sourceUnit, aliveAlly1, aliveAlly2, deadAlly, aliveEnemy1, aliveEnemy2];

	it("should filter alive units by default", () => {
		const result = filterValidTargets(sourceUnit, allUnits);

		expect(result).toHaveLength(5); // All except deadAlly
		expect(result.map(u => u.id)).not.toContain("deadAlly");
	});

	it("should filter same force units", () => {
		const result = filterValidTargets(sourceUnit, allUnits, { requiresSameForce: true });

		const resultIds = result.map(u => u.id);
		expect(resultIds).toContain("source");
		expect(resultIds).toContain("ally1");
		expect(resultIds).toContain("ally2");
		expect(resultIds).not.toContain("enemy1");
		expect(resultIds).not.toContain("enemy2");
	});

	it("should filter different force units", () => {
		const result = filterValidTargets(sourceUnit, allUnits, { requiresDifferentForce: true });

		const resultIds = result.map(u => u.id);
		expect(resultIds).toContain("enemy1");
		expect(resultIds).toContain("enemy2");
		expect(resultIds).not.toContain("source");
		expect(resultIds).not.toContain("ally1");
		expect(resultIds).not.toContain("ally2");
	});

	it("should exclude self when requested", () => {
		const result = filterValidTargets(sourceUnit, allUnits, { excludeSelf: true });

		expect(result.map(u => u.id)).not.toContain("source");
	});

	it("should limit number of targets", () => {
		const result = filterValidTargets(sourceUnit, allUnits, { maxTargets: 2 });

		expect(result).toHaveLength(2);
	});

	it("should combine multiple filters", () => {
		const result = filterValidTargets(sourceUnit, allUnits, {
			requiresDifferentForce: true,
			requiresAlive: true,
			maxTargets: 1
		});

		expect(result).toHaveLength(1);
		expect(["enemy1", "enemy2"]).toContain(result[0].id);
	});
});

describe("calculateEffectDuration", () => {
	const mockUnit = createMockUnit("unit1");

	it("should calculate basic duration correctly", () => {
		const result = calculateEffectDuration(1000, mockUnit);

		expect(result).toBe(1000);
	});

	it("should apply multiplier correctly", () => {
		const result = calculateEffectDuration(1000, mockUnit, 1.5);

		expect(result).toBe(1500);
	});

	it("should apply flat bonus correctly", () => {
		const result = calculateEffectDuration(1000, mockUnit, 1.0, 200);

		expect(result).toBe(1200);
	});

	it("should ensure minimum duration of 1", () => {
		const result = calculateEffectDuration(2, mockUnit, 0.1, -5);

		expect(result).toBe(1); // (2 + (-5)) * 0.1 = -0.3, clamped to 1
	});
});

describe("traitHasEffect", () => {
	const mockTraitData: TraitData = { id: "trait1" as any };
	const mockDefinition = {
		effects: [
			{ effectId: "heal" },
			{ effectId: "damage" },
			{ effectId: "buff" }
		]
	};

	it("should return true when trait has the effect", () => {
		expect(traitHasEffect(mockTraitData, "heal", mockDefinition)).toBe(true);
		expect(traitHasEffect(mockTraitData, "damage", mockDefinition)).toBe(true);
		expect(traitHasEffect(mockTraitData, "buff", mockDefinition)).toBe(true);
	});

	it("should return false when trait doesn't have the effect", () => {
		expect(traitHasEffect(mockTraitData, "shield", mockDefinition)).toBe(false);
		expect(traitHasEffect(mockTraitData, "teleport", mockDefinition)).toBe(false);
	});

	it("should handle empty effects array", () => {
		const emptyDefinition = { effects: [] };
		expect(traitHasEffect(mockTraitData, "heal", emptyDefinition)).toBe(false);
	});
});

describe("calculateGoldReward", () => {
	const mockUnit = createMockUnit("unit1");

	it("should calculate basic gold correctly", () => {
		const result = calculateGoldReward(100, mockUnit);

		expect(result).toBe(100);
	});

	it("should apply multiplier correctly", () => {
		const result = calculateGoldReward(100, mockUnit, 1.5);

		expect(result).toBe(150);
	});

	it("should apply flat bonus correctly", () => {
		const result = calculateGoldReward(100, mockUnit, 1.0, 25);

		expect(result).toBe(125);
	});

	it("should ensure non-negative gold", () => {
		const result = calculateGoldReward(50, mockUnit, 1.0, -100);

		expect(result).toBe(0);
	});
});

describe("validateEffectParameters", () => {
	it("should validate when all required parameters are present", () => {
		const traitParams = { amount: 10 };
		const effectParams = { duration: 1000 };

		const result = validateEffectParameters(traitParams, effectParams, ["amount", "duration"]);

		expect(result.isValid).toBe(true);
		expect(result.missingParams).toHaveLength(0);
	});

	it("should find missing parameters", () => {
		const traitParams = { amount: 10 };
		const effectParams = {};

		const result = validateEffectParameters(traitParams, effectParams, ["amount", "duration", "target"]);

		expect(result.isValid).toBe(false);
		expect(result.missingParams).toEqual(["duration", "target"]);
	});

	it("should handle parameters in either trait or effect instance", () => {
		const traitParams = { amount: 10, type: "fire" };
		const effectParams = { duration: 1000 };

		const result = validateEffectParameters(traitParams, effectParams, ["amount", "duration", "type"]);

		expect(result.isValid).toBe(true);
		expect(result.missingParams).toHaveLength(0);
	});

	it("should handle empty parameter arrays", () => {
		const result = validateEffectParameters({}, {}, []);

		expect(result.isValid).toBe(true);
		expect(result.missingParams).toHaveLength(0);
	});

	it("should handle undefined objects gracefully", () => {
		const result = validateEffectParameters(undefined as any, undefined as any, ["amount"]);

		expect(result.isValid).toBe(false);
		expect(result.missingParams).toEqual(["amount"]);
	});
});
