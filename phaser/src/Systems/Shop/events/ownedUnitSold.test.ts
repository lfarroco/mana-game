import { beforeEach, describe, expect, it, jest } from "@jest/globals";

const mockSellUnit = jest.fn<(unitId: string) => void>();
const mockGetCharaById = jest.fn<(unitId: string) => { destroy: () => void } | undefined>();
const mockDiscardHide = jest.fn<() => void>();
const mockEmitSystemEvent = jest.fn<(event: unknown) => void>();

const mockProcessSale = jest.fn<
	(
		session: { team: { units: Array<{ id: string }> } },
		unitId: string
	) => Array<{ type: string; unitId: string }>
>((session: { team: { units: Array<{ id: string }> } }, unitId: string) => {
	const existingUnit = session.team.units.find((unit) => unit.id === unitId);
	return existingUnit ? [{ type: "UnitSold", unitId }] : [];
});

const mockRemoveUnitFromUnits = jest.fn<
	(units: Array<{ id: string }>, unitId: string) => Array<{ id: string }>
>((units: Array<{ id: string }>, unitId: string) => units.filter((unit) => unit.id !== unitId));

const mockState = {
	session: {
		team: {
			units: [] as Array<{ id: string; cardId: string }>,
		},
	},
};

jest.mock("@Models/State", () => ({
	getState: () => mockState,
}));

jest.mock("@Systems/Chara/Chara", () => ({
	getCharaById: (unitId: string) => mockGetCharaById(unitId),
}));

jest.mock("@Systems/Shop/DiscardZone", () => ({
	hide: () => mockDiscardHide(),
}));

jest.mock("@Core/GameControllerFactory", () => ({
	getGameController: () => ({
		sellUnit: (unitId: string) => mockSellUnit(unitId),
	}),
}));

jest.mock("@Systems/Shop/PureShop", () => ({
	processSale: (session: { team: { units: Array<{ id: string }> } }, unitId: string) =>
		mockProcessSale(session, unitId),
	removeUnitFromUnits: (units: Array<{ id: string }>, unitId: string) =>
		mockRemoveUnitFromUnits(units, unitId),
}));

jest.mock("@Engine/Visualizer", () => ({
	emitSystemEvent: (event: unknown) => mockEmitSystemEvent(event),
}));

import { ownedUnitSold } from "@Systems/Shop/events/ownedUnitSold";

describe("ownedUnitSold", () => {
	beforeEach(() => {
		jest.clearAllMocks();
		mockState.session.team.units = [{ id: "unit-1", cardId: "mana_crystal" }];
		mockGetCharaById.mockReturnValue({ destroy: jest.fn() });
	});

	it("sells the unit, emits the sale event, removes local state, and cleans up visuals", () => {
		ownedUnitSold("unit-1");

		expect(mockSellUnit).toHaveBeenCalledWith("unit-1");
		expect(mockProcessSale).toHaveBeenCalledWith(mockState.session, "unit-1");
		expect(mockEmitSystemEvent).toHaveBeenCalledWith({ type: "UnitSold", unitId: "unit-1" });
		expect(mockState.session.team.units).toEqual([]);

		const soldChara = mockGetCharaById.mock.results[0].value as { destroy: () => void };
		expect(soldChara.destroy).toHaveBeenCalled();
		expect(mockDiscardHide).toHaveBeenCalled();
	});
});
