import { beforeEach, describe, expect, it, jest } from "@jest/globals";

const mockUpdateChipText = jest.fn<(id: string, value: string) => void>();
const mockGetCharaById = jest.fn<(id: string) => unknown>();
const mockGetUnit = jest.fn<() => { power: number }>();

const mockState = {
	battleData: {
		units: [] as Array<{ id: string; power: number }>,
	},
	session: {
		phase: "shop",
		team: {
			units: [] as Array<{ id: string; power: number }>,
		},
	},
};

jest.mock("@Components/Chip", () => ({
	createChip: jest.fn(),
	updateChipText: (id: string, value: string) => mockUpdateChipText(id, value),
}));

jest.mock("@Systems/Chara/Chara", () => ({
	getCharaById: (id: string) => mockGetCharaById(id),
	getUnit: () => mockGetUnit(),
}));

jest.mock("@Models/State", () => ({
	getState: () => mockState,
}));

import { updatePowerDisplay } from "@Systems/Chara/PowerDisplay";

describe("PowerDisplay.updatePowerDisplay", () => {
	beforeEach(() => {
		jest.clearAllMocks();
		mockState.battleData.units = [];
		mockState.session.phase = "shop";
		mockState.session.team.units = [];
		mockGetCharaById.mockReturnValue({ id: "chara" });
		mockGetUnit.mockReturnValue({ power: 99 });
	});

	it("prefers the latest session unit state over the cached chara unit", () => {
		mockState.session.team.units = [{ id: "unit-1", power: 42 }];

		updatePowerDisplay("unit-1");

		expect(mockUpdateChipText).toHaveBeenCalledWith("unit-1", "42");
	});

	it("prefers battle state during combat", () => {
		mockState.session.phase = "combat";
		mockState.battleData.units = [{ id: "unit-1", power: 17 }];
		mockState.session.team.units = [{ id: "unit-1", power: 42 }];

		updatePowerDisplay("unit-1");

		expect(mockUpdateChipText).toHaveBeenCalledWith("unit-1", "17");
	});

	it("prefers session state outside combat even if stale battle data exists", () => {
		mockState.battleData.units = [{ id: "unit-1", power: 80 }];
		mockState.session.team.units = [{ id: "unit-1", power: 50 }];

		updatePowerDisplay("unit-1");

		expect(mockUpdateChipText).toHaveBeenCalledWith("unit-1", "50");
	});

	it("falls back to the cached chara unit when no state entry exists", () => {
		updatePowerDisplay("unit-1");

		expect(mockUpdateChipText).toHaveBeenCalledWith("unit-1", "99");
	});
});
