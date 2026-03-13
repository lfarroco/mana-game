import { beforeEach, describe, expect, it, jest } from "@jest/globals";

const mockGetUnitAt = jest.fn<(units: unknown) => (tile: { x: number; y: number }) => unknown>();
const mockGetCharaById = jest.fn<(unitId: string) => unknown>();
const mockSummon = jest.fn<(unit: unknown, isPlayer: boolean) => void>();
const mockUpgradeUnit = jest.fn<(unit: unknown) => void>();
const mockOnPurchaseFailed = jest.fn<(unitName: string, reason: string) => void>();
const mockOnShopPurchaseFailed =
	jest.fn<(chara: unknown, startPosition: { x: number; y: number }) => void>();
const mockOnShopPurchaseSuccesful = jest.fn<(chara: unknown) => void>();
const mockPurchaseUnit = jest.fn<(cardId: string) => Promise<boolean>>();
const mockGetName = jest.fn<(cardId: string) => string>((cardId: string) => `name:${cardId}`);
const mockMakeUnit = jest.fn<
	(
		force: string,
		cardId: string,
		position: { x: number; y: number }
	) => {
		id: string;
		force: string;
		cardId: string;
		position: { x: number; y: number };
	}
>((force: string, cardId: string, position: { x: number; y: number }) => ({
	id: `new-${cardId}`,
	force,
	cardId,
	position,
}));

const mockState = {
	session: {
		team: { units: [] as Array<Record<string, unknown>> },
		runStats: undefined as
			| undefined
			| { totalUnitsRecruited: number; unitUsage: Record<string, number> },
	},
};

jest.mock("@Models/Geometry", () => ({
	vec2: (x: number, y: number) => ({ x, y }),
}));

jest.mock("@Models/Entities/Unit", () => ({
	makeUnit: (force: string, cardId: string, position: { x: number; y: number }) =>
		mockMakeUnit(force, cardId, position),
}));

jest.mock("@Models/State", () => ({
	getState: () => mockState,
	getUnitAt: (units: unknown) => mockGetUnitAt(units),
}));

jest.mock("@Systems/Chara/Chara", () => ({
	getCharaById: (unitId: string) => mockGetCharaById(unitId),
	summon: (unit: unknown, isPlayer: boolean) => mockSummon(unit, isPlayer),
	upgradeUnit: (unit: unknown) => mockUpgradeUnit(unit),
}));

jest.mock("@UI/events", () => ({
	onPurchaseFailed: (unitName: string, reason: string) => mockOnPurchaseFailed(unitName, reason),
}));

jest.mock("@Systems/Chara/events", () => ({
	onShopPurchaseFailed: (chara: unknown, startPosition: { x: number; y: number }) =>
		mockOnShopPurchaseFailed(chara, startPosition),
	onShopPurchaseSuccesful: (chara: unknown) => mockOnShopPurchaseSuccesful(chara),
}));

jest.mock("@Core/GameControllerFactory", () => ({
	getGameController: () => ({
		purchaseUnit: (cardId: string) => mockPurchaseUnit(cardId),
	}),
}));

jest.mock("@i18n/i18n", () => ({
	getName: (cardId: string) => mockGetName(cardId),
}));

import { itemDragPurchaseRequested } from "@Systems/Shop/events/itemDragPurchaseRequested";
import * as constants from "@Constants/constants";

describe("itemDragPurchaseRequested", () => {
	beforeEach(() => {
		jest.clearAllMocks();
		mockState.session.team.units = [];
		mockState.session.runStats = undefined;
		mockPurchaseUnit.mockResolvedValue(true);
		mockGetUnitAt.mockReturnValue(() => undefined);
		mockGetCharaById.mockReturnValue({ id: "shop-chara-1" });
	});

	it("rejects drag-purchase when the party is full and no upgrade is possible", async () => {
		mockState.session.team.units = Array.from({ length: constants.MAX_PARTY_SIZE }, (_, index) => ({
			id: `unit-${index}`,
			cardId: `card-${index}`,
			rank: 4,
		}));

		await itemDragPurchaseRequested(
			{ id: "shop-unit", cardId: "mana_crystal" } as never,
			"shop-chara-1",
			{ x: 1, y: 1 },
			10,
			20
		);

		expect(mockPurchaseUnit).not.toHaveBeenCalled();
		expect(mockOnShopPurchaseFailed).toHaveBeenCalledWith({ id: "shop-chara-1" }, { x: 10, y: 20 });
		expect(mockOnPurchaseFailed).toHaveBeenCalledWith("name:mana_crystal", "PARTY_FULL");
	});

	it("rejects drag-purchase when the target slot is occupied", async () => {
		mockState.session.team.units = [{ id: "existing", cardId: "critical_crystal", rank: 1 }];
		mockGetUnitAt.mockReturnValue(() => ({ id: "occupier" }));

		await itemDragPurchaseRequested(
			{ id: "shop-unit", cardId: "mana_crystal" } as never,
			"shop-chara-1",
			{ x: 1, y: 1 },
			10,
			20
		);

		expect(mockPurchaseUnit).not.toHaveBeenCalled();
		expect(mockOnPurchaseFailed).toHaveBeenCalledWith("name:mana_crystal", "SLOT_OCCUPIED");
	});

	it("surfaces server rejection for drag-purchase requests", async () => {
		mockPurchaseUnit.mockResolvedValue(false);

		await itemDragPurchaseRequested(
			{ id: "shop-unit", cardId: "mana_crystal" } as never,
			"shop-chara-1",
			{ x: 2, y: 0 },
			10,
			20
		);

		expect(mockPurchaseUnit).toHaveBeenCalledWith("mana_crystal");
		expect(mockOnPurchaseFailed).toHaveBeenCalledWith("name:mana_crystal", "SERVER_REJECTED");
		expect(mockOnShopPurchaseFailed).toHaveBeenCalledWith({ id: "shop-chara-1" }, { x: 10, y: 20 });
	});

	it("upgrades an existing matching unit after a successful drag-purchase", async () => {
		const existingUnit = { id: "unit-1", cardId: "mana_crystal", rank: 2 };
		mockState.session.team.units = [existingUnit];

		await itemDragPurchaseRequested(
			{ id: "shop-unit", cardId: "mana_crystal" } as never,
			"shop-chara-1",
			{ x: 2, y: 0 },
			10,
			20
		);

		expect(mockUpgradeUnit).toHaveBeenCalledWith(existingUnit);
		expect(mockSummon).not.toHaveBeenCalled();
		expect(mockOnShopPurchaseSuccesful).toHaveBeenCalledWith({ id: "shop-chara-1" });
	});

	it("adds a new unit, summons it, and updates run stats after successful purchase", async () => {
		mockState.session.runStats = { totalUnitsRecruited: 0, unitUsage: {} };

		await itemDragPurchaseRequested(
			{ id: "shop-unit", cardId: "mana_crystal" } as never,
			"shop-chara-1",
			{ x: 2, y: 0 },
			10,
			20
		);

		expect(mockMakeUnit).toHaveBeenCalledWith(constants.FORCE_ID_PLAYER, "mana_crystal", {
			x: 2,
			y: 0,
		});
		expect(mockState.session.team.units).toHaveLength(1);
		expect(mockState.session.team.units[0]).toEqual(
			expect.objectContaining({
				id: "new-mana_crystal",
				cardId: "mana_crystal",
				position: { x: 2, y: 0 },
			})
		);
		expect(mockState.session.runStats).toEqual({
			totalUnitsRecruited: 1,
			unitUsage: { "name:mana_crystal": 1 },
		});
		expect(mockSummon).toHaveBeenCalledWith(
			expect.objectContaining({ id: "new-mana_crystal", cardId: "mana_crystal" }),
			true
		);
		expect(mockOnShopPurchaseSuccesful).toHaveBeenCalledWith({ id: "shop-chara-1" });
	});
});
