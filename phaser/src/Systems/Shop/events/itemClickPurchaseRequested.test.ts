import { beforeEach, describe, expect, it, jest } from "@jest/globals";

const mockPurchaseUnit = jest.fn<(cardId: string) => Promise<boolean>>();
const mockProcessPurchase =
	jest.fn<
		(
			session: unknown,
			cardId: string,
			shopCharaId: string,
			dragStartPosition: { x: number; y: number }
		) => { success: boolean; events: unknown[]; error?: string }
	>();
const mockEmitSystemEvent = jest.fn<(event: unknown) => Promise<void>>();
const mockGetName = jest.fn<(cardId: string) => string>((cardId: string) => `name:${cardId}`);

const mockState = {
	session: {
		team: { units: [] },
	},
};

jest.mock("@Models/State", () => ({
	getState: () => mockState,
}));

jest.mock("@Core/GameControllerFactory", () => ({
	getGameController: () => ({
		purchaseUnit: (cardId: string) => mockPurchaseUnit(cardId),
	}),
}));

jest.mock("@Systems/Shop/PureShop", () => ({
	processPurchase: (
		session: unknown,
		cardId: string,
		shopCharaId: string,
		dragStartPosition: { x: number; y: number }
	) => mockProcessPurchase(session, cardId, shopCharaId, dragStartPosition),
}));

jest.mock("@Engine/Visualizer", () => ({
	emitSystemEvent: (event: unknown) => mockEmitSystemEvent(event),
}));

jest.mock("@i18n/i18n", () => ({
	getName: (cardId: string) => mockGetName(cardId),
}));

import { itemClickPurchaseRequested } from "@Systems/Shop/events/itemClickPurchaseRequested";

describe("itemClickPurchaseRequested", () => {
	beforeEach(() => {
		jest.clearAllMocks();
		mockEmitSystemEvent.mockResolvedValue(undefined);
		mockPurchaseUnit.mockResolvedValue(true);
	});

	it("emits all validation failure events without contacting the controller", async () => {
		const purchaseFailed = { type: "PurchaseFailed", reason: "PARTY_FULL" };
		const secondEvent = { type: "Telemetry" };
		mockProcessPurchase.mockReturnValue({
			success: false,
			events: [purchaseFailed, secondEvent],
			error: "PARTY_FULL",
		});

		await itemClickPurchaseRequested(
			{ id: "shop-unit", cardId: "mana_crystal" } as never,
			"shop-chara-1",
			10,
			20
		);

		expect(mockPurchaseUnit).not.toHaveBeenCalled();
		expect(mockEmitSystemEvent).toHaveBeenCalledTimes(2);
		expect(mockEmitSystemEvent).toHaveBeenNthCalledWith(1, purchaseFailed);
		expect(mockEmitSystemEvent).toHaveBeenNthCalledWith(2, secondEvent);
	});

	it("emits a server rejection event when the controller rejects the purchase", async () => {
		mockProcessPurchase.mockReturnValue({
			success: true,
			events: [],
		});
		mockPurchaseUnit.mockResolvedValue(false);

		await itemClickPurchaseRequested(
			{ id: "shop-unit", cardId: "mana_crystal" } as never,
			"shop-chara-1",
			10,
			20
		);

		expect(mockPurchaseUnit).toHaveBeenCalledWith("mana_crystal");
		expect(mockEmitSystemEvent).toHaveBeenCalledWith(
			expect.objectContaining({
				type: "PurchaseFailed",
				cardId: "mana_crystal",
				unitName: "name:mana_crystal",
				reason: "SERVER_REJECTED",
				shopCharaId: "shop-chara-1",
				dragStartPosition: { x: 10, y: 20 },
			})
		);
	});

	it("delegates successful purchases entirely to the controller/server flow", async () => {
		mockProcessPurchase.mockReturnValue({
			success: true,
			events: [],
		});
		mockPurchaseUnit.mockResolvedValue(true);

		await itemClickPurchaseRequested(
			{ id: "shop-unit", cardId: "mana_crystal" } as never,
			"shop-chara-1",
			10,
			20
		);

		expect(mockPurchaseUnit).toHaveBeenCalledWith("mana_crystal");
		expect(mockEmitSystemEvent).not.toHaveBeenCalled();
	});
});
