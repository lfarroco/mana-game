/**
 * @file Tests for Trait Sniper implementation
 */

import { describe, it, expect } from "@jest/globals";
import { traitSniperLogic, TraitSniperLogicParams, TraitSniperLogicState } from "./traitSniper";
import { Unit } from "../../../Models/Entities/Unit";
import { playerForce } from "../../../Models/Entities/Force";

// Mock unit factory
function createMockUnit(position: { x: number; y: number }, force: string): Unit {
	return {
		id: `unit-${Math.random()}`,
		name: "Test Unit",
		position,
		force,
		health: 100,
		maxHealth: 100,
		power: 50,
		defense: 10,
		isActive: true
	} as unknown as Unit;
}

describe("traitSniperLogic", () => {
	const defaultParams: TraitSniperLogicParams = {
		amount: 10
	};

	describe("Player force units", () => {
		it("should apply bonus for player unit in back row (y = 2 for board height 3)", () => {
			const sourceUnit = createMockUnit({ x: 0, y: 2 }, playerForce.id);
			const state: TraitSniperLogicState = {
				sourceUnit,
				boardHeightInTiles: 3
			};

			const result = traitSniperLogic(defaultParams, state);

			expect(result.shouldApplyBonus).toBe(true);
			expect(result.attackBonus).toBe(10);
		});

		it("should not apply bonus for player unit in front row (y = 0)", () => {
			const sourceUnit = createMockUnit({ x: 0, y: 0 }, playerForce.id);
			const state: TraitSniperLogicState = {
				sourceUnit,
				boardHeightInTiles: 3
			};

			const result = traitSniperLogic(defaultParams, state);

			expect(result.shouldApplyBonus).toBe(false);
			expect(result.attackBonus).toBe(10);
		});

		it("should not apply bonus for player unit in middle row (y = 1)", () => {
			const sourceUnit = createMockUnit({ x: 0, y: 1 }, playerForce.id);
			const state: TraitSniperLogicState = {
				sourceUnit,
				boardHeightInTiles: 3
			};

			const result = traitSniperLogic(defaultParams, state);

			expect(result.shouldApplyBonus).toBe(false);
			expect(result.attackBonus).toBe(10);
		});
	});

	describe("Enemy force units", () => {
		const enemyForceId = "enemy-force";

		it("should apply bonus for enemy unit in back row (y = 0)", () => {
			const sourceUnit = createMockUnit({ x: 0, y: 0 }, enemyForceId);
			const state: TraitSniperLogicState = {
				sourceUnit,
				boardHeightInTiles: 3
			};

			const result = traitSniperLogic(defaultParams, state);

			expect(result.shouldApplyBonus).toBe(true);
			expect(result.attackBonus).toBe(10);
		});

		it("should not apply bonus for enemy unit in front row (y = 2)", () => {
			const sourceUnit = createMockUnit({ x: 0, y: 2 }, enemyForceId);
			const state: TraitSniperLogicState = {
				sourceUnit,
				boardHeightInTiles: 3
			};

			const result = traitSniperLogic(defaultParams, state);

			expect(result.shouldApplyBonus).toBe(false);
			expect(result.attackBonus).toBe(10);
		});

		it("should not apply bonus for enemy unit in middle row (y = 1)", () => {
			const sourceUnit = createMockUnit({ x: 0, y: 1 }, enemyForceId);
			const state: TraitSniperLogicState = {
				sourceUnit,
				boardHeightInTiles: 3
			};

			const result = traitSniperLogic(defaultParams, state);

			expect(result.shouldApplyBonus).toBe(false);
			expect(result.attackBonus).toBe(10);
		});
	});

	describe("Different board heights", () => {
		it("should work with board height 5 for player units", () => {
			const sourceUnit = createMockUnit({ x: 0, y: 4 }, playerForce.id);
			const state: TraitSniperLogicState = {
				sourceUnit,
				boardHeightInTiles: 5
			};

			const result = traitSniperLogic(defaultParams, state);

			expect(result.shouldApplyBonus).toBe(true);
			expect(result.attackBonus).toBe(10);
		});

		it("should work with board height 1 for player units", () => {
			const sourceUnit = createMockUnit({ x: 0, y: 0 }, playerForce.id);
			const state: TraitSniperLogicState = {
				sourceUnit,
				boardHeightInTiles: 1
			};

			const result = traitSniperLogic(defaultParams, state);

			expect(result.shouldApplyBonus).toBe(true);
			expect(result.attackBonus).toBe(10);
		});

		it("should use default board height when not specified", () => {
			const sourceUnit = createMockUnit({ x: 0, y: 2 }, playerForce.id);
			const state: TraitSniperLogicState = {
				sourceUnit
				// boardHeightInTiles not specified, should default to 3
			};

			const result = traitSniperLogic(defaultParams, state);

			expect(result.shouldApplyBonus).toBe(true);
			expect(result.attackBonus).toBe(10);
		});
	});

	describe("Custom attack bonus amounts", () => {
		it("should use custom attack bonus amount", () => {
			const customParams: TraitSniperLogicParams = {
				amount: 25
			};
			const sourceUnit = createMockUnit({ x: 0, y: 2 }, playerForce.id);
			const state: TraitSniperLogicState = {
				sourceUnit,
				boardHeightInTiles: 3
			};

			const result = traitSniperLogic(customParams, state);

			expect(result.shouldApplyBonus).toBe(true);
			expect(result.attackBonus).toBe(25);
		});

		it("should handle zero attack bonus", () => {
			const zeroParams: TraitSniperLogicParams = {
				amount: 0
			};
			const sourceUnit = createMockUnit({ x: 0, y: 2 }, playerForce.id);
			const state: TraitSniperLogicState = {
				sourceUnit,
				boardHeightInTiles: 3
			};

			const result = traitSniperLogic(zeroParams, state);

			expect(result.shouldApplyBonus).toBe(true);
			expect(result.attackBonus).toBe(0);
		});

		it("should handle negative attack bonus", () => {
			const negativeParams: TraitSniperLogicParams = {
				amount: -5
			};
			const sourceUnit = createMockUnit({ x: 0, y: 2 }, playerForce.id);
			const state: TraitSniperLogicState = {
				sourceUnit,
				boardHeightInTiles: 3
			};

			const result = traitSniperLogic(negativeParams, state);

			expect(result.shouldApplyBonus).toBe(true);
			expect(result.attackBonus).toBe(-5);
		});
	});
});
