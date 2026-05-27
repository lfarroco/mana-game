import { beforeEach, describe, expect, it, jest } from "@jest/globals";

const mockHandleAction = jest.fn();
const mockOpenUpgradeCorePhase = jest.fn();

jest.mock("@Core/GameServer", () => ({
	getServer: () => ({
		handleAction: mockHandleAction,
	}),
}));

jest.mock("../Shop/EffectCardShop", () => ({
	openUpgradeCorePhase: (
		titleText: string,
		encounters: string[],
		onSkip?: () => void | Promise<void>
	) => mockOpenUpgradeCorePhase(titleText, encounters, onSkip),
}));

import { handleAddReactionCorePhase } from "./handleAddReactionCorePhase";

describe("handleAddReactionCorePhase", () => {
	beforeEach(() => {
		jest.clearAllMocks();
		(globalThis as typeof globalThis & { state: unknown }).state = {
			session: {
				player_id: "player-1",
				phase: "add_reaction_core",
				current_options: [{ id: "on_crit_effect" }, { id: "on_battle_start_effect" }],
			},
		};
	});

	it("completes the phase after a successful reaction selection", async () => {
		const selectedSession = {
			player_id: "player-1",
			phase: "add_reaction_core",
			current_options: [{ id: "on_crit_effect" }, { id: "on_battle_start_effect" }],
		};
		const nextSession = {
			player_id: "player-1",
			phase: "encounter",
			current_options: [{ id: "encounter-a" }],
		};

		mockOpenUpgradeCorePhase.mockImplementation(async () => {
			(globalThis as typeof globalThis & { state: { session: unknown } }).state.session = selectedSession;
		});
		mockHandleAction.mockResolvedValue(nextSession);

		const result = await handleAddReactionCorePhase();

		expect(mockOpenUpgradeCorePhase).toHaveBeenCalledWith(
			"effectCardShop.title",
			["on_crit_effect", "on_battle_start_effect"],
			expect.any(Function)
		);
		expect(mockHandleAction).toHaveBeenCalledWith("player-1", "add_reaction_core_done");
		expect(result).toBe(nextSession);
	});

	it("does not submit the completion action twice when skipped", async () => {
		const nextSession = {
			player_id: "player-1",
			phase: "encounter",
			current_options: [{ id: "encounter-a" }],
		};

		mockHandleAction.mockResolvedValue(nextSession);
		mockOpenUpgradeCorePhase.mockImplementation(async (_title, _encounters, onSkip) => {
			await onSkip?.();
		});

		const result = await handleAddReactionCorePhase();

		expect(mockHandleAction).toHaveBeenCalledTimes(1);
		expect(mockHandleAction).toHaveBeenCalledWith("player-1", "add_reaction_core_done");
		expect(result).toBe(nextSession);
	});
});