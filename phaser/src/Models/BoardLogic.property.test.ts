import fc from "fast-check";
import type { Unit } from "@Models/Entities/Unit";
import { checkMove, findFreeSlot, getEmptySlot } from "@Models/BoardLogic";
import { vec2 } from "@Models/SharedGeometry";

type TestVec2 = { x: number; y: number };

const PLAYER_FORCE = "player";
const ENEMY_FORCE = "enemy";

const makeTestUnit = (id: string, force: string, position: TestVec2): Unit =>
	({ id, force, position }) as Unit;

const posKey = ({ x, y }: TestVec2): string => `${x},${y}`;

const positionArb = fc.record({
	x: fc.integer({ min: 0, max: 2 }),
	y: fc.integer({ min: 0, max: 2 }),
});

const occupiedPositionsArb = fc.uniqueArray(positionArb, {
	selector: posKey,
	minLength: 0,
	maxLength: 9,
});

describe("BoardLogic property-based tests", () => {
	it("getEmptySlot returns null iff all board slots are occupied by force", () => {
		fc.assert(
			fc.property(occupiedPositionsArb, (occupiedByPlayer) => {
				const playerUnits = occupiedByPlayer.map((pos, index) =>
					makeTestUnit(`p-${index}`, PLAYER_FORCE, pos)
				);
				const enemyUnits = [makeTestUnit("e-1", ENEMY_FORCE, { x: 0, y: 0 })];
				const units = [...playerUnits, ...enemyUnits];

				const emptySlot = getEmptySlot(units, PLAYER_FORCE, 3, 3);

				if (occupiedByPlayer.length === 9) {
					expect(emptySlot).toBeNull();
					return;
				}

				expect(emptySlot).not.toBeNull();
				const occupiedSet = new Set(occupiedByPlayer.map(posKey));
				expect(occupiedSet.has(posKey(emptySlot!))).toBe(false);
				expect(emptySlot!.x).toBeGreaterThanOrEqual(0);
				expect(emptySlot!.x).toBeLessThanOrEqual(2);
				expect(emptySlot!.y).toBeGreaterThanOrEqual(0);
				expect(emptySlot!.y).toBeLessThanOrEqual(2);
			})
		);
	});

	it("findFreeSlot honors preferred position when available", () => {
		fc.assert(
			fc.property(occupiedPositionsArb, positionArb, (occupiedByPlayer, preferredPos) => {
				const units = occupiedByPlayer.map((pos, index) =>
					makeTestUnit(`p-${index}`, PLAYER_FORCE, pos)
				);
				const occupiedSet = new Set(occupiedByPlayer.map(posKey));

				const slot = findFreeSlot(units, PLAYER_FORCE, vec2(preferredPos.x, preferredPos.y));

				if (!occupiedSet.has(posKey(preferredPos))) {
					expect(slot).toEqual(preferredPos);
					return;
				}

				const expected = getEmptySlot(units, PLAYER_FORCE, 3, 3);
				expect(slot).toEqual(expected);
			})
		);
	});

	it("checkMove reports occupant only when target tile contains another unit", () => {
		fc.assert(
			fc.property(positionArb, positionArb, fc.boolean(), (from, to, shouldOccupyTarget) => {
				const movingUnit = makeTestUnit("u-1", PLAYER_FORCE, from);
				const blockingUnit = makeTestUnit("u-2", PLAYER_FORCE, to);
				const units = shouldOccupyTarget ? [movingUnit, blockingUnit] : [movingUnit];

				const result = checkMove(movingUnit, vec2(to.x, to.y), units);

				if (from.x === to.x && from.y === to.y) {
					expect(result.valid).toBe(false);
					return;
				}

				expect(result.valid).toBe(true);
				if (shouldOccupyTarget) {
					expect(result.occupant?.id).toBe("u-2");
				} else {
					expect(result.occupant).toBeUndefined();
				}
			})
		);
	});
});
