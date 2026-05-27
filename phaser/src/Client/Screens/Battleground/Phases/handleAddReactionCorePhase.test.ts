import { beforeEach, describe, expect, it, jest } from "@jest/globals";

const mockOpenUpgradeCorePhase = jest.fn();

type TestState = {
	session: {
		player_id: string;
		phase: string;
		current_options: { id: string }[];
	};
};

jest.mock("../Shop/EffectCardShop", () => ({
	openUpgradeCorePhase: (
		titleText: string,
		encounters: string[],
		onSkip?: () => void | Promise<void>,
		onUpgradeApplied?: (nextSession: unknown) => void | Promise<void>
	) => mockOpenUpgradeCorePhase(titleText, encounters, onSkip, onUpgradeApplied),
}));

import { handleAddReactionCorePhase } from "./handleAddReactionCorePhase";

describe("handleAddReactionCorePhase", () => {
	beforeEach(() => {
		jest.clearAllMocks();
		(globalThis as typeof globalThis & { state: TestState }).state = {
			session: {
				player_id: "player-1",
				phase: "add_reaction_core",
				current_options: [{ id: "on_crit_effect" }, { id: "on_battle_start_effect" }],
			},
		};
	});

	it("completes the phase after a successful reaction selection", async () => {
		const nextSession = {
			player_id: "player-1",
			phase: "encounter",
			current_options: [{ id: "encounter-a" }],
		};

		mockOpenUpgradeCorePhase.mockImplementation(async (...args: unknown[]) => {
			const onUpgradeApplied = args[3] as ((nextSession: unknown) => void | Promise<void>) | undefined;
			await onUpgradeApplied?.(nextSession);
		});

		const result = await handleAddReactionCorePhase();

		expect(mockOpenUpgradeCorePhase).toHaveBeenCalledWith(
			"effectCardShop.title",
			["on_crit_effect", "on_battle_start_effect"],
			undefined,
			expect.any(Function)
		);
		expect(result).toBe(nextSession);
	});

	it("returns the current session when no selection is applied", async () => {
		mockOpenUpgradeCorePhase.mockImplementation(async () => undefined);

		const result = await handleAddReactionCorePhase();

		expect(result).toBe((globalThis as typeof globalThis & { state: TestState }).state.session);
	});
});