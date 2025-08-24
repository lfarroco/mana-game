import * as BattlegroundScenePure from "./BattlegroundScene.pure";
import { Unit } from "../../Models/Entities/Unit";

describe("removeUnitFromPlayerState", () => {
	it("should remove a unit from the player's state if it exists", () => {
		const units = [{ id: "unit1" } as Unit];
		const updatedUnits = BattlegroundScenePure.removeUnitFromPlayerState(units, "unit1");

		expect(updatedUnits).toHaveLength(0);
	});

	it("should log a warning if the unit does not exist", () => {
		const consoleWarnSpy = jest.spyOn(console, "warn").mockImplementation();

		const units = [{ id: "unit1" } as Unit];
		BattlegroundScenePure.removeUnitFromPlayerState(units, "nonexistentUnit");

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
		const updatedUnits = BattlegroundScenePure.removeUnitFromPlayerState(units, "unit2");

		expect(updatedUnits).toHaveLength(2);
		expect(updatedUnits.map(u => u.id)).toEqual(["unit1", "unit3"]);
	});

	it("should return the same array if unit doesn't exist", () => {
		const units = [{ id: "unit1" } as Unit];
		const updatedUnits = BattlegroundScenePure.removeUnitFromPlayerState(units, "nonexistent");

		expect(updatedUnits).toEqual(units);
		expect(updatedUnits).not.toBe(units); // Should be a new array
	});
});

describe("handleOwnedUnitSold", () => {
	it("should update player gold, emit events, and remove the unit", () => {
		const updatePlayerGold = jest.fn();
		const hideSellZone = jest.fn();
		const showPopText = jest.fn();

		const units = [{ id: "unit1" } as Unit];
		const charaMock = { destroy: jest.fn(), x: 100, y: 200 };

		const updatedUnits = BattlegroundScenePure.handleOwnedUnitSold(
			updatePlayerGold,
			hideSellZone,
			units,
			"unit1",
			10,
			charaMock,
			showPopText
		);

		expect(updatePlayerGold).toHaveBeenCalledWith(10);
		expect(showPopText).toHaveBeenCalledWith(100, 200, "+10G", "shield", "up");
		expect(hideSellZone).toHaveBeenCalled();
		expect(updatedUnits).toHaveLength(0);
		expect(charaMock.destroy).toHaveBeenCalled();
	});

	it("should handle unit sale without character (use fallback position)", () => {
		const updatePlayerGold = jest.fn();
		const hideSellZone = jest.fn();
		const showPopText = jest.fn();

		const units = [{ id: "unit1" } as Unit];

		const updatedUnits = BattlegroundScenePure.handleOwnedUnitSold(
			updatePlayerGold,
			hideSellZone,
			units,
			"unit1",
			25,
			undefined,
			showPopText
		);

		expect(updatePlayerGold).toHaveBeenCalledWith(25);
		expect(showPopText).toHaveBeenCalledWith(400, 300, "+25G", "shield", "up");
		expect(hideSellZone).toHaveBeenCalled();
		expect(updatedUnits).toHaveLength(0);
	});

	it("should handle multiple units and only remove the sold one", () => {
		const updatePlayerGold = jest.fn();
		const hideSellZone = jest.fn();
		const showPopText = jest.fn();

		const units = [
			{ id: "unit1" } as Unit,
			{ id: "unit2" } as Unit,
			{ id: "unit3" } as Unit
		];
		const charaMock = { destroy: jest.fn(), x: 150, y: 250 };

		const updatedUnits = BattlegroundScenePure.handleOwnedUnitSold(
			updatePlayerGold,
			hideSellZone,
			units,
			"unit2",
			15,
			charaMock,
			showPopText
		);

		expect(updatedUnits).toHaveLength(2);
		expect(updatedUnits.map(u => u.id)).toEqual(["unit1", "unit3"]);
		expect(updatePlayerGold).toHaveBeenCalledWith(15);
		expect(showPopText).toHaveBeenCalledWith(150, 250, "+15G", "shield", "up");
	});

	it("should call all dependencies in correct order", () => {
		const callOrder: string[] = [];
		const updatePlayerGold = jest.fn(() => callOrder.push("updateGold"));
		const hideSellZone = jest.fn(() => callOrder.push("hideSellZone"));
		const showPopText = jest.fn(() => callOrder.push("showPopText"));

		const units = [{ id: "unit1" } as Unit];
		const charaMock = {
			destroy: jest.fn(() => callOrder.push("destroyChara")),
			x: 100,
			y: 200
		};

		BattlegroundScenePure.handleOwnedUnitSold(
			updatePlayerGold,
			hideSellZone,
			units,
			"unit1",
			10,
			charaMock,
			showPopText
		);

		expect(callOrder).toEqual(["updateGold", "destroyChara", "showPopText", "hideSellZone"]);
	});
});
