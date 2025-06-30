import { removeUnitFromPlayerState, handleOwnedUnitSold, calculateGoldUpdate, updatePlayerGold, updateUnitPosition } from "./BattlegroundScene.pure";
import { GameEvents } from "../../constants/events";
import { Unit } from "../../Models/Entities/Unit";
import { vec2 } from "../../Utils/Vec2";

describe("removeUnitFromPlayerState", () => {
	it("should remove a unit from the player's state if it exists", () => {
		const units = [{ id: "unit1" } as Unit];
		const updatedUnits = removeUnitFromPlayerState(units, "unit1");

		expect(updatedUnits).toHaveLength(0);
	});

	it("should log a warning if the unit does not exist", () => {
		const consoleWarnSpy = jest.spyOn(console, "warn").mockImplementation();

		const units = [{ id: "unit1" } as Unit];
		removeUnitFromPlayerState(units, "nonexistentUnit");

		expect(consoleWarnSpy).toHaveBeenCalledWith(
			expect.stringContaining("Unit with ID nonexistentUnit not found for selling.")
		);

		consoleWarnSpy.mockRestore();
	});

	it("should remove only the specified unit when multiple units exist", () => {
		const units = [
			{ id: "unit1" } as Unit,
			{ id: "unit2" } as Unit,
			{ id: "unit3" } as Unit
		];
		const updatedUnits = removeUnitFromPlayerState(units, "unit2");

		expect(updatedUnits).toHaveLength(2);
		expect(updatedUnits.map(u => u.id)).toEqual(["unit1", "unit3"]);
	});

	it("should return the same array if unit doesn't exist", () => {
		const units = [{ id: "unit1" } as Unit];
		const updatedUnits = removeUnitFromPlayerState(units, "nonexistent");

		expect(updatedUnits).toEqual(units);
		expect(updatedUnits).not.toBe(units); // Should be a new array
	});
});

describe("handleOwnedUnitSold", () => {
	it("should update player gold, emit events, and remove the unit", () => {
		const updatePlayerGold = jest.fn();
		const emitEvent = jest.fn();
		const hideSellZone = jest.fn();

		const units = [{ id: "unit1" } as Unit];
		const charaMock = { destroy: jest.fn(), x: 100, y: 200 };

		const updatedUnits = handleOwnedUnitSold(
			updatePlayerGold,
			emitEvent,
			hideSellZone,
			units,
			"unit1",
			10,
			charaMock
		);

		expect(updatePlayerGold).toHaveBeenCalledWith(10);
		expect(emitEvent).toHaveBeenCalledWith(GameEvents.POP_TEXT_SHOW, {
			text: "+10G",
			x: 100,
			y: 200,
			type: "success",
		});
		expect(hideSellZone).toHaveBeenCalled();
		expect(updatedUnits).toHaveLength(0);
		expect(charaMock.destroy).toHaveBeenCalled();
	});

	it("should handle unit sale without character (use fallback position)", () => {
		const updatePlayerGold = jest.fn();
		const emitEvent = jest.fn();
		const hideSellZone = jest.fn();

		const units = [{ id: "unit1" } as Unit];

		const updatedUnits = handleOwnedUnitSold(
			updatePlayerGold,
			emitEvent,
			hideSellZone,
			units,
			"unit1",
			25,
			undefined
		);

		expect(updatePlayerGold).toHaveBeenCalledWith(25);
		expect(emitEvent).toHaveBeenCalledWith(GameEvents.POP_TEXT_SHOW, {
			text: "+25G",
			x: 400, // fallback position
			y: 300, // fallback position
			type: "success",
		});
		expect(hideSellZone).toHaveBeenCalled();
		expect(updatedUnits).toHaveLength(0);
	});

	it("should handle multiple units and only remove the sold one", () => {
		const updatePlayerGold = jest.fn();
		const emitEvent = jest.fn();
		const hideSellZone = jest.fn();

		const units = [
			{ id: "unit1" } as Unit,
			{ id: "unit2" } as Unit,
			{ id: "unit3" } as Unit
		];
		const charaMock = { destroy: jest.fn(), x: 150, y: 250 };

		const updatedUnits = handleOwnedUnitSold(
			updatePlayerGold,
			emitEvent,
			hideSellZone,
			units,
			"unit2",
			15,
			charaMock
		);

		expect(updatedUnits).toHaveLength(2);
		expect(updatedUnits.map(u => u.id)).toEqual(["unit1", "unit3"]);
		expect(updatePlayerGold).toHaveBeenCalledWith(15);
		expect(emitEvent).toHaveBeenCalledWith(GameEvents.POP_TEXT_SHOW, {
			text: "+15G",
			x: 150,
			y: 250,
			type: "success",
		});
	});

	it("should call all dependencies in correct order", () => {
		const callOrder: string[] = [];
		const updatePlayerGold = jest.fn(() => callOrder.push("updateGold"));
		const emitEvent = jest.fn(() => callOrder.push("emitEvent"));
		const hideSellZone = jest.fn(() => callOrder.push("hideSellZone"));

		const units = [{ id: "unit1" } as Unit];
		const charaMock = {
			destroy: jest.fn(() => callOrder.push("destroyChara")),
			x: 100,
			y: 200
		};

		handleOwnedUnitSold(
			updatePlayerGold,
			emitEvent,
			hideSellZone,
			units,
			"unit1",
			10,
			charaMock
		);

		expect(callOrder).toEqual(["updateGold", "destroyChara", "emitEvent", "hideSellZone"]);
	});
});

describe("calculateGoldUpdate", () => {
	it("should calculate correct gold update with positive delta", () => {
		const result = calculateGoldUpdate(100, 25.7);

		expect(result.newGold).toBe(125);
		expect(result.changeAmount).toBe(25);
	});

	it("should calculate correct gold update with negative delta", () => {
		const result = calculateGoldUpdate(100, -30.2);

		expect(result.newGold).toBe(69); // 100 + Math.floor(-30.2) = 100 + (-31) = 69
		expect(result.changeAmount).toBe(-31); // Math.floor(-30.2) = -31
	});

	it("should floor the change amount", () => {
		const result = calculateGoldUpdate(50, 15.9);

		expect(result.newGold).toBe(65);
		expect(result.changeAmount).toBe(15);
	});

	it("should handle zero delta", () => {
		const result = calculateGoldUpdate(100, 0);

		expect(result.newGold).toBe(100);
		expect(result.changeAmount).toBe(0);
	});

	it("should handle very small positive decimals", () => {
		const result = calculateGoldUpdate(100, 0.9);

		expect(result.newGold).toBe(100);
		expect(result.changeAmount).toBe(0);
	});

	it("should handle very small negative decimals", () => {
		const result = calculateGoldUpdate(100, -0.1);

		expect(result.newGold).toBe(99);
		expect(result.changeAmount).toBe(-1);
	});
});

describe("updatePlayerGold", () => {
	it("should update gold and emit event with correct parameters", () => {
		const emitEvent = jest.fn();

		const newGold = updatePlayerGold(100, 25, emitEvent);

		expect(newGold).toBe(125);
		expect(emitEvent).toHaveBeenCalledWith(GameEvents.GOLD_CHANGED, 125, 25);
	});

	it("should handle negative gold changes", () => {
		const emitEvent = jest.fn();

		const newGold = updatePlayerGold(100, -30, emitEvent);

		expect(newGold).toBe(70);
		expect(emitEvent).toHaveBeenCalledWith(GameEvents.GOLD_CHANGED, 70, -30);
	});

	it("should only call emit event once", () => {
		const emitEvent = jest.fn();

		updatePlayerGold(50, 10, emitEvent);

		expect(emitEvent).toHaveBeenCalledTimes(1);
	});

	it("should handle zero current gold", () => {
		const emitEvent = jest.fn();

		const newGold = updatePlayerGold(0, 50, emitEvent);

		expect(newGold).toBe(50);
		expect(emitEvent).toHaveBeenCalledWith(GameEvents.GOLD_CHANGED, 50, 50);
	});

	it("should allow gold to go negative", () => {
		const emitEvent = jest.fn();

		const newGold = updatePlayerGold(10, -50, emitEvent);

		expect(newGold).toBe(-40);
		expect(emitEvent).toHaveBeenCalledWith(GameEvents.GOLD_CHANGED, -40, -50);
	});
});

describe("updateUnitPosition", () => {
	const createMockUnit = (id: string, x: number, y: number): Unit => ({
		id,
		position: { tag: "_vec2" as const, x, y },
		// Add other required Unit properties as minimal mocks
	} as Unit);

	it("should return null if unit moves to its current position", () => {
		const unit = createMockUnit("unit1", 1, 1);
		const units = [unit];

		const result = updateUnitPosition(unit, vec2(1, 1), units);

		expect(result).toBeNull();
	});

	it("should move unit to empty position", () => {
		const unit = createMockUnit("unit1", 0, 0);
		const units = [unit];

		const result = updateUnitPosition(unit, vec2(1, 1), units);

		expect(result).not.toBeNull();
		expect(result!.movedUnit.position.x).toBe(1);
		expect(result!.movedUnit.position.y).toBe(1);
		expect(result!.oldPositionOfMovedUnit).toEqual(vec2(0, 0));
		expect(result!.swappedUnit).toBeUndefined();
	});

	it("should swap units when moving to occupied position", () => {
		const unit1 = createMockUnit("unit1", 0, 0);
		const unit2 = createMockUnit("unit2", 1, 1);
		const units = [unit1, unit2];

		const result = updateUnitPosition(unit1, vec2(1, 1), units);

		expect(result).not.toBeNull();
		expect(result!.movedUnit.id).toBe("unit1");
		expect(result!.movedUnit.position.x).toBe(1);
		expect(result!.movedUnit.position.y).toBe(1);
		expect(result!.swappedUnit!.id).toBe("unit2");
		expect(result!.swappedUnit!.position.x).toBe(0);
		expect(result!.swappedUnit!.position.y).toBe(0);
		expect(result!.oldPositionOfMovedUnit).toEqual(vec2(0, 0));
	});

	it("should not mutate the original units array or units", () => {
		const unit1 = createMockUnit("unit1", 0, 0);
		const unit2 = createMockUnit("unit2", 1, 1);
		const units = [unit1, unit2];
		const originalUnit1Position = { ...unit1.position };
		const originalUnit2Position = { ...unit2.position };

		updateUnitPosition(unit1, vec2(1, 1), units);

		// Original units should be unchanged
		expect(unit1.position).toEqual(originalUnit1Position);
		expect(unit2.position).toEqual(originalUnit2Position);
		expect(units.length).toBe(2);
	});

	it("should handle moving unit that doesn't exist in units array", () => {
		const unit1 = createMockUnit("unit1", 0, 0);
		const unit2 = createMockUnit("unit2", 1, 1);
		const nonExistentUnit = createMockUnit("unit3", 2, 2);
		const units = [unit1, unit2];

		const result = updateUnitPosition(nonExistentUnit, vec2(1, 0), units);

		expect(result).toBeNull();
	});

	it("should handle complex multi-unit board scenario", () => {
		const unit1 = createMockUnit("unit1", 0, 0);
		const unit2 = createMockUnit("unit2", 1, 0);
		const unit3 = createMockUnit("unit3", 2, 0);
		const unit4 = createMockUnit("unit4", 0, 1);
		const units = [unit1, unit2, unit3, unit4];

		// Move unit1 to unit3's position (should swap)
		const result = updateUnitPosition(unit1, vec2(2, 0), units);

		expect(result).not.toBeNull();
		expect(result!.movedUnit.id).toBe("unit1");
		expect(result!.movedUnit.position.x).toBe(2);
		expect(result!.movedUnit.position.y).toBe(0);
		expect(result!.swappedUnit!.id).toBe("unit3");
		expect(result!.swappedUnit!.position.x).toBe(0);
		expect(result!.swappedUnit!.position.y).toBe(0);

		// Verify other units remain in returned array but unaffected by position changes
		const resultUnits = [result!.movedUnit, result!.swappedUnit!,
		...units.filter(u => u.id !== "unit1" && u.id !== "unit3")];
		expect(resultUnits.length).toBe(4);
	});

	it("should handle moving to position with exact same coordinates", () => {
		const unit1 = createMockUnit("unit1", 1, 1);
		const unit2 = createMockUnit("unit2", 1, 1); // Same position
		const units = [unit1, unit2];

		const result = updateUnitPosition(unit1, vec2(2, 2), units);

		expect(result).not.toBeNull();
		expect(result!.movedUnit.position.x).toBe(2);
		expect(result!.movedUnit.position.y).toBe(2);
		// When two units are at the same position, the search should find unit2 as the occupier
		// But since they start at the same position, there's no "occupier" at the target position
		// This test case might be unrealistic - let's update it
		expect(result!.swappedUnit).toBeUndefined(); // No unit at target position (2,2)
	});
});
