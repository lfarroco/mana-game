import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import type { SessionData } from "@Core/Types";

const mockSkipPhase = jest.fn();
const mockGetCardDefinition = jest.fn();
const mockRenderTavernCharas = jest.fn();
const mockEnableShopInteractions = jest.fn();
const mockRefresh = jest.fn();
const mockSlideIn = jest.fn();
const mockSlideOut = jest.fn();

jest.mock("@Core/GameController", () => ({
	skipPhase: (options?: { autoStartPhase?: boolean }) => mockSkipPhase(options),
}));

jest.mock("@Models/Entities/Card", () => ({
	getCardDefinition: (id: string) => mockGetCardDefinition(id),
}));

jest.mock("@Systems/Chara/Chara", () => ({
	hasCharaById: jest.fn(),
	destroy: jest.fn(),
	mustGetCharaById: jest.fn(),
	refreshChara: jest.fn(),
	enableBoardInteractivity: jest.fn(),
}));

jest.mock("@Screens/Battleground/Shop/CharaShop", () => ({
	renderTavernCharas: (cardDefs: unknown[]) => mockRenderTavernCharas(cardDefs),
	enableShopInteractions: (tavernCharas: unknown[]) => mockEnableShopInteractions(tavernCharas),
}));

jest.mock("@Screens/Battleground/Shop/ShopPanel", () => ({
	refresh: (callback: (() => void | Promise<void>) | null) => mockRefresh(callback),
	SlideIn: () => mockSlideIn(),
	SlideOut: () => mockSlideOut(),
}));

import { handleShopPhase } from "./handleShopPhase";

type TestState = {
	session: SessionData;
};

describe("handleShopPhase", () => {
	beforeEach(() => {
		jest.clearAllMocks();

		(globalThis as typeof globalThis & { state: TestState }).state = {
			session: {
				player_id: "player-1",
				phase: "shop",
				seed: "seed-1",
				run_id: "run-1",
				round: 1,
				wins: 0,
				losses: 0,
				gold: 3,
				team: {
					units: [],
					bench: [],
				},
				current_options: [{ id: "unit_a" }, { id: "unit_b" }],
				session_type: { type: "singleplayer" },
			},
		};

		mockGetCardDefinition.mockImplementation((id: string) => ({ id }));
		mockRenderTavernCharas.mockResolvedValue([]);
		mockSlideIn.mockResolvedValue(undefined);
		mockSlideOut.mockResolvedValue(undefined);
	});

	it("uses skipPhase without legacy auto-start during shop skip", async () => {
		const skippedSession = {
			...(globalThis as typeof globalThis & { state: TestState }).state.session,
			phase: "encounter",
			current_options: [{ id: "encounter_a" }],
		} satisfies SessionData;

		let skipCallback: (() => void | Promise<void>) | null = null;
		mockRefresh.mockImplementation((callback: (() => void | Promise<void>) | null) => {
			skipCallback = callback;
		});
		mockSkipPhase.mockResolvedValue(skippedSession);
		mockEnableShopInteractions.mockImplementation(async () => {
			if (!skipCallback) {
				throw new Error("Expected shop skip callback to be registered");
			}

			await skipCallback();
			return { kind: "skipped", session: skippedSession };
		});

		const result = await handleShopPhase();

		expect(mockSkipPhase).toHaveBeenCalledWith({ autoStartPhase: false });
		expect(result).toBe(skippedSession);
		expect(mockSlideIn).toHaveBeenCalledTimes(1);
		expect(mockSlideOut).toHaveBeenCalledTimes(1);
		expect(mockRefresh).toHaveBeenLastCalledWith(null);
	});
});