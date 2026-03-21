import { describe, expect, it, beforeEach, jest } from "@jest/globals";
import { createRemoteGameController } from "@Core/RemoteGameController";
import { getState } from "@Models/State";
import { sendOptionSelection, sendTeamUpdate } from "@Multiplayer/MultiplayerManager";

jest.mock("@Multiplayer/MultiplayerManager", () => ({
	sendOptionSelection: jest.fn(),
	sendTeamUpdate: jest.fn(),
	__esModule: true,
}));

jest.mock("@Models/State", () => ({
	getState: jest.fn(),
	__esModule: true,
}));

jest.mock("@Scenes/Battleground/PhaseManager", () => ({
	handlePhaseEnded: jest.fn(),
	__esModule: true,
}));

jest.mock("@Systems/Shop/ShopPanel", () => ({
	slideOut: jest.fn(),
	__esModule: true,
}));

const mockGetState = getState as jest.MockedFunction<typeof getState>;
const mockSendOptionSelection = sendOptionSelection as jest.MockedFunction<
	typeof sendOptionSelection
>;

describe("RemoteGameController.notifyGameComplete", () => {
	beforeEach(() => {
		jest.clearAllMocks();
		mockSendOptionSelection.mockResolvedValue(true);
	});

	it("does not send an extra transition when the run is already game over", async () => {
		mockGetState.mockReturnValue({
			session: { phase: "game_over" },
		} as ReturnType<typeof getState>);

		const controller = createRemoteGameController();
		const result = await controller.notifyGameComplete("game_over");

		expect(result).toBe(true);
		expect(mockSendOptionSelection).not.toHaveBeenCalled();
	});

	it("still forwards completion actions before the run is terminal", async () => {
		mockGetState.mockReturnValue({
			session: { phase: "combat" },
		} as ReturnType<typeof getState>);

		const controller = createRemoteGameController();
		await controller.notifyGameComplete("combat_done");

		expect(mockSendOptionSelection).toHaveBeenCalledWith("combat_done");
	});

	it("keeps team updates delegated through the multiplayer manager", async () => {
		const mockSendTeamUpdate = sendTeamUpdate as jest.MockedFunction<typeof sendTeamUpdate>;
		mockSendTeamUpdate.mockResolvedValue(true);
		mockGetState.mockReturnValue({
			session: { phase: "shop" },
		} as ReturnType<typeof getState>);

		const controller = createRemoteGameController();
		await controller.updateTeam({ units: [] });

		expect(mockSendTeamUpdate).toHaveBeenCalledWith({ units: [] });
	});
});
