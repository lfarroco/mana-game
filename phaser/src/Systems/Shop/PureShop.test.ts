/**
 * Tests for Pure Shop System
 */

import { describe, it, expect, beforeEach, beforeAll, jest } from "@jest/globals";
import * as PureShop from "@Systems/Shop/PureShop";
import { SessionData } from "@Core/Types";
import { makeUnit, Unit } from "@Models/Entities/Unit";
import * as constants from "@Constants/constants";
import { registerCollection } from "@Models/Entities/Card";
import { BASE_COLLECTION_DATA } from "@Data/BaseCollection";

// Mock Board module
jest.mock("@Models/Board", () => ({
	getEmptySlot: jest.fn((units: Unit[]) => {
		// Simple mock: return first empty position
		if (units.length < 6) {
			return { x: units.length, y: 0 };
		}
		return null;
	}),
}));

// Mock i18n
jest.mock("../../i18n/i18n", () => ({
	getName: (id: string) => id,
	t: (key: string) => key,
	initialize: () => {},
	setLocale: () => {},
	getCurrentLocale: () => "en",
	getAvailableLocales: () => ["en"],
	getNativeName: () => "English",
}));

beforeAll(() => {
	if (typeof global.structuredClone === "undefined") {
		global.structuredClone = <T>(obj: T): T => JSON.parse(JSON.stringify(obj)) as T;
	}
	registerCollection(BASE_COLLECTION_DATA);
});

describe("PureShop", () => {
	let mockSession: SessionData;

	beforeEach(() => {
		// Create a minimal mock session
		mockSession = {
			id: "test-session",
			player_id: "test-player",
			phase: "shop",
			round: 1,
			step: 1,
			seed: "test-seed",
			initial_seed: "test-seed",
			current_options: null,
			team: {
				units: [],
			},
			wins: 0,
			losses: 0,
			action_log: [],
		} as SessionData;
	});

	describe("processPurchase", () => {
		it("should successfully purchase a new unit when party is not full", () => {
			const result = PureShop.processPurchase(mockSession, "mana_crystal", "shop-chara-1", {
				x: 100,
				y: 100,
			});

			expect(result.success).toBe(true);
			expect(result.newUnit).toBeDefined();
			expect(result.newUnit?.cardId).toBe("mana_crystal");
			expect(result.events.length).toBe(1);
			expect(result.events[0].type).toBe("UnitPurchased");
		});

		it("should fail purchase when party is full", () => {
			// Fill the party to max size
			for (let i = 0; i < constants.MAX_PARTY_SIZE; i++) {
				const unit = makeUnit(constants.FORCE_ID_PLAYER, "mana_crystal", { x: i, y: 0 });
				unit.rank = 4; // Make rank > 3 so it can't be upgraded
				mockSession.team.units.push(unit);
			}

			const result = PureShop.processPurchase(mockSession, "critical_crystal", "shop-chara-1", {
				x: 100,
				y: 100,
			});

			expect(result.success).toBe(false);
			expect(result.error).toBe("PARTY_FULL");
			expect(result.events.length).toBe(1);
			expect(result.events[0].type).toBe("PurchaseFailed");
		});

		it("should upgrade existing unit instead of creating new one", () => {
			// Add a unit that can be upgraded (rank <= 3)
			const existingUnit = makeUnit(constants.FORCE_ID_PLAYER, "mana_crystal", { x: 0, y: 0 });
			existingUnit.rank = 2;
			mockSession.team.units.push(existingUnit);

			const result = PureShop.processPurchase(mockSession, "mana_crystal", "shop-chara-1", {
				x: 100,
				y: 100,
			});

			expect(result.success).toBe(true);
			expect(result.upgradedUnit).toBeDefined();
			expect(result.upgradedUnit?.rank).toBe(3);
			expect(result.newUnit).toBeUndefined();
			expect(result.events.length).toBe(1);
			expect(result.events[0].type).toBe("UnitPurchased");
		});

		it("should not upgrade unit with rank > 3", () => {
			// Add a unit with max rank
			const existingUnit = makeUnit(constants.FORCE_ID_PLAYER, "mana_crystal", { x: 0, y: 0 });
			existingUnit.rank = 4;
			mockSession.team.units.push(existingUnit);

			const result = PureShop.processPurchase(mockSession, "mana_crystal", "shop-chara-1", {
				x: 100,
				y: 100,
			});

			expect(result.success).toBe(true);
			expect(result.newUnit).toBeDefined();
			expect(result.upgradedUnit).toBeUndefined();
		});
	});

	describe("processSale", () => {
		it("should return sale event for existing unit", () => {
			const unit = makeUnit(constants.FORCE_ID_PLAYER, "mana_crystal", { x: 0, y: 0 });
			mockSession.team.units.push(unit);

			const events = PureShop.processSale(mockSession, unit.id);

			expect(events.length).toBe(1);
			expect(events[0].type).toBe("UnitSold");
		});

		it("should return empty array for non-existent unit", () => {
			const events = PureShop.processSale(mockSession, "non-existent-id");

			expect(events.length).toBe(0);
		});
	});

	describe("removeUnitFromUnits", () => {
		it("should remove unit from array", () => {
			const unit1 = makeUnit(constants.FORCE_ID_PLAYER, "mana_crystal", { x: 0, y: 0 });
			const unit2 = makeUnit(constants.FORCE_ID_PLAYER, "critical_crystal", { x: 1, y: 0 });
			const units = [unit1, unit2];

			const result = PureShop.removeUnitFromUnits(units, unit1.id);

			expect(result.length).toBe(1);
			expect(result[0].id).toBe(unit2.id);
		});

		it("should not mutate original array", () => {
			const unit1 = makeUnit(constants.FORCE_ID_PLAYER, "mana_crystal", { x: 0, y: 0 });
			const units = [unit1];

			const result = PureShop.removeUnitFromUnits(units, unit1.id);

			expect(result).not.toBe(units);
			expect(units.length).toBe(1);
			expect(result.length).toBe(0);
		});
	});

	describe("addUnitToUnits", () => {
		it("should add unit to array", () => {
			const unit1 = makeUnit(constants.FORCE_ID_PLAYER, "mana_crystal", { x: 0, y: 0 });
			const unit2 = makeUnit(constants.FORCE_ID_PLAYER, "critical_crystal", { x: 1, y: 0 });
			const units = [unit1];

			const result = PureShop.addUnitToUnits(units, unit2);

			expect(result.length).toBe(2);
			expect(result[0].id).toBe(unit1.id);
			expect(result[1].id).toBe(unit2.id);
		});

		it("should not mutate original array", () => {
			const unit1 = makeUnit(constants.FORCE_ID_PLAYER, "mana_crystal", { x: 0, y: 0 });
			const unit2 = makeUnit(constants.FORCE_ID_PLAYER, "critical_crystal", { x: 1, y: 0 });
			const units = [unit1];

			const result = PureShop.addUnitToUnits(units, unit2);

			expect(result).not.toBe(units);
			expect(units.length).toBe(1);
			expect(result.length).toBe(2);
		});
	});

	describe("updateUnitInUnits", () => {
		it("should update unit in array", () => {
			const unit1 = makeUnit(constants.FORCE_ID_PLAYER, "mana_crystal", { x: 0, y: 0 });
			unit1.power = 10;
			const units = [unit1];

			const updatedUnit = { ...unit1, power: 20 };
			const result = PureShop.updateUnitInUnits(units, updatedUnit);

			expect(result.length).toBe(1);
			expect(result[0].power).toBe(20);
		});

		it("should not mutate original array", () => {
			const unit1 = makeUnit(constants.FORCE_ID_PLAYER, "mana_crystal", { x: 0, y: 0 });
			unit1.power = 10;
			const units = [unit1];

			const updatedUnit = { ...unit1, power: 20 };
			const result = PureShop.updateUnitInUnits(units, updatedUnit);

			expect(result).not.toBe(units);
			expect(units[0].power).toBe(10);
			expect(result[0].power).toBe(20);
		});
	});
});
