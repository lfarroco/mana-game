/**
 * @file Tests for Positional Bonus trait effect implementation
 */

import { describe, it, expect } from "@jest/globals";
import { positionalBonusLogicPure, PositionalBonusParams, PositionalBonusState } from "./positionalBonus";
import { Unit } from "../../../Models/Entities/Unit";
import { Vec2, vec2 } from "../../../Models/Geometry.pure";

// Helper function to create a Vec2 compatible with the Unit type
function createVec2(x: number, y: number): Vec2 {
	return vec2(x, y);
}

// Mock unit factory
function createMockUnit(position: { x: number; y: number }, force: string): Unit {
	return {
		id: `unit-${Math.random()}`,
		cardId: 'test-card',
		name: "Test Unit",
		pic: 'test.png',
		position: createVec2(position.x, position.y),
		force,
		hp: 100,
		maxHp: 100,
		power: 50,
		powerType: 'damage',
		cooldown: 1000,
		traits: [],
		attackType: 'damage',
		crit: 0,
		tags: [],
		description: 'Test unit',
		evade: 0,
		charge: 0,
		refresh: false,
		hasted: false,
		slowed: false
	} as unknown as Unit;
}

describe("positionalBonusLogicPure", () => {
	const playerForceId = 'player-force';
	const enemyForceId = 'enemy-force';

	describe("Parameter validation", () => {
		it("should not apply bonus when attribute is missing", () => {
			const params: PositionalBonusParams = {
				attribute: '' as any,
				amount: 10,
				row: 'back'
			};
			const state: PositionalBonusState = {
				sourceUnit: createMockUnit({ x: 0, y: 2 }, playerForceId),
				playerForceId
			};

			const result = positionalBonusLogicPure(params, state);

			expect(result.shouldApplyBonus).toBe(false);
		});

		it("should not apply bonus when amount is 0", () => {
			const params: PositionalBonusParams = {
				attribute: 'power',
				amount: 0,
				row: 'back'
			};
			const state: PositionalBonusState = {
				sourceUnit: createMockUnit({ x: 0, y: 2 }, playerForceId),
				playerForceId
			};

			const result = positionalBonusLogicPure(params, state);

			expect(result.shouldApplyBonus).toBe(false);
		});

		it("should not apply bonus when row is missing", () => {
			const params: PositionalBonusParams = {
				attribute: 'power',
				amount: 10,
				row: '' as any
			};
			const state: PositionalBonusState = {
				sourceUnit: createMockUnit({ x: 0, y: 2 }, playerForceId),
				playerForceId
			};

			const result = positionalBonusLogicPure(params, state);

			expect(result.shouldApplyBonus).toBe(false);
		});
	});

	describe("Player force units", () => {
		const defaultParams: PositionalBonusParams = {
			attribute: 'power',
			amount: 15,
			row: 'back'
		};

		it("should apply bonus for player unit in back row (y = 2 for board height 3)", () => {
			const sourceUnit = createMockUnit({ x: 0, y: 2 }, playerForceId);
			const state: PositionalBonusState = {
				sourceUnit,
				playerForceId,
				boardHeightInTiles: 3
			};

			const result = positionalBonusLogicPure(defaultParams, state);

			expect(result.shouldApplyBonus).toBe(true);
			expect(result.attribute).toBe('power');
			expect(result.amount).toBe(15);
		});

		it("should not apply bonus for player unit in front row (y = 0) when looking for back row", () => {
			const sourceUnit = createMockUnit({ x: 0, y: 0 }, playerForceId);
			const state: PositionalBonusState = {
				sourceUnit,
				playerForceId,
				boardHeightInTiles: 3
			};

			const result = positionalBonusLogicPure(defaultParams, state);

			expect(result.shouldApplyBonus).toBe(false);
			expect(result.attribute).toBe('power');
			expect(result.amount).toBe(15);
		});

		it("should apply bonus for player unit in front row (y = 0) when looking for front row", () => {
			const frontParams: PositionalBonusParams = {
				attribute: 'hp',
				amount: 20,
				row: 'front'
			};
			const sourceUnit = createMockUnit({ x: 0, y: 0 }, playerForceId);
			const state: PositionalBonusState = {
				sourceUnit,
				playerForceId,
				boardHeightInTiles: 3
			};

			const result = positionalBonusLogicPure(frontParams, state);

			expect(result.shouldApplyBonus).toBe(true);
			expect(result.attribute).toBe('hp');
			expect(result.amount).toBe(20);
		});

		it("should apply bonus for player unit in middle row (y = 1) when looking for mid row", () => {
			const midParams: PositionalBonusParams = {
				attribute: 'power',
				amount: 12,
				row: 'mid'
			};
			const sourceUnit = createMockUnit({ x: 0, y: 1 }, playerForceId);
			const state: PositionalBonusState = {
				sourceUnit,
				playerForceId,
				boardHeightInTiles: 3
			};

			const result = positionalBonusLogicPure(midParams, state);

			expect(result.shouldApplyBonus).toBe(true);
			expect(result.attribute).toBe('power');
			expect(result.amount).toBe(12);
		});

		it("should not apply bonus for player unit in wrong row", () => {
			const sourceUnit = createMockUnit({ x: 0, y: 1 }, playerForceId); // Mid row
			const state: PositionalBonusState = {
				sourceUnit,
				playerForceId,
				boardHeightInTiles: 3
			};

			const result = positionalBonusLogicPure(defaultParams, state); // Looking for back row

			expect(result.shouldApplyBonus).toBe(false);
		});
	});

	describe("Enemy force units", () => {
		it("should apply bonus for enemy unit in back row (y = 0 for enemy)", () => {
			const backParams: PositionalBonusParams = {
				attribute: 'power',
				amount: 25,
				row: 'back'
			};
			const sourceUnit = createMockUnit({ x: 0, y: 0 }, enemyForceId); // Enemy back row
			const state: PositionalBonusState = {
				sourceUnit,
				playerForceId,
				boardHeightInTiles: 3
			};

			const result = positionalBonusLogicPure(backParams, state);

			expect(result.shouldApplyBonus).toBe(true);
			expect(result.attribute).toBe('power');
			expect(result.amount).toBe(25);
		});

		it("should apply bonus for enemy unit in front row (y = 2 for enemy)", () => {
			const frontParams: PositionalBonusParams = {
				attribute: 'hp',
				amount: 30,
				row: 'front'
			};
			const sourceUnit = createMockUnit({ x: 0, y: 2 }, enemyForceId); // Enemy front row
			const state: PositionalBonusState = {
				sourceUnit,
				playerForceId,
				boardHeightInTiles: 3
			};

			const result = positionalBonusLogicPure(frontParams, state);

			expect(result.shouldApplyBonus).toBe(true);
			expect(result.attribute).toBe('hp');
			expect(result.amount).toBe(30);
		});

		it("should apply bonus for enemy unit in middle row (y = 1)", () => {
			const midParams: PositionalBonusParams = {
				attribute: 'power',
				amount: 18,
				row: 'mid'
			};
			const sourceUnit = createMockUnit({ x: 0, y: 1 }, enemyForceId);
			const state: PositionalBonusState = {
				sourceUnit,
				playerForceId,
				boardHeightInTiles: 3
			};

			const result = positionalBonusLogicPure(midParams, state);

			expect(result.shouldApplyBonus).toBe(true);
			expect(result.attribute).toBe('power');
			expect(result.amount).toBe(18);
		});

		it("should not apply bonus for enemy unit in wrong row", () => {
			const backParams: PositionalBonusParams = {
				attribute: 'power',
				amount: 25,
				row: 'back'
			};
			const sourceUnit = createMockUnit({ x: 0, y: 2 }, enemyForceId); // Enemy front row
			const state: PositionalBonusState = {
				sourceUnit,
				playerForceId,
				boardHeightInTiles: 3
			};

			const result = positionalBonusLogicPure(backParams, state); // Looking for back row

			expect(result.shouldApplyBonus).toBe(false);
		});
	});

	describe("Custom board configurations", () => {
		it("should handle different board heights correctly", () => {
			const params: PositionalBonusParams = {
				attribute: 'power',
				amount: 10,
				row: 'back'
			};
			const sourceUnit = createMockUnit({ x: 0, y: 4 }, playerForceId); // Back row in 5-tile board
			const state: PositionalBonusState = {
				sourceUnit,
				playerForceId,
				boardHeightInTiles: 5
			};

			const result = positionalBonusLogicPure(params, state);

			expect(result.shouldApplyBonus).toBe(true);
		});

		it("should use default board height when not specified", () => {
			const params: PositionalBonusParams = {
				attribute: 'power',
				amount: 10,
				row: 'back'
			};
			const sourceUnit = createMockUnit({ x: 0, y: 2 }, playerForceId); // Back row in default 3-tile board
			const state: PositionalBonusState = {
				sourceUnit,
				playerForceId
				// boardHeightInTiles not specified, should default to 3
			};

			const result = positionalBonusLogicPure(params, state);

			expect(result.shouldApplyBonus).toBe(true);
		});
	});

	describe("Different attributes", () => {
		it("should handle power attribute correctly", () => {
			const params: PositionalBonusParams = {
				attribute: 'power',
				amount: 100,
				row: 'back'
			};
			const sourceUnit = createMockUnit({ x: 0, y: 2 }, playerForceId);
			const state: PositionalBonusState = {
				sourceUnit,
				playerForceId
			};

			const result = positionalBonusLogicPure(params, state);

			expect(result.shouldApplyBonus).toBe(true);
			expect(result.attribute).toBe('power');
			expect(result.amount).toBe(100);
		});

		it("should handle hp attribute correctly", () => {
			const params: PositionalBonusParams = {
				attribute: 'hp',
				amount: 50,
				row: 'back'
			};
			const sourceUnit = createMockUnit({ x: 0, y: 2 }, playerForceId);
			const state: PositionalBonusState = {
				sourceUnit,
				playerForceId
			};

			const result = positionalBonusLogicPure(params, state);

			expect(result.shouldApplyBonus).toBe(true);
			expect(result.attribute).toBe('hp');
			expect(result.amount).toBe(50);
		});
	});
});
