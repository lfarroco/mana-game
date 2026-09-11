/**
 * Encounter-phase input latch.
 *
 * The encounter cards latch a per-phase `disableInteraction` flag before the
 * dispatch. When the dispatch fails, `dispatchAction` resolves `false` (state
 * unchanged, cards restored) — the latch must be released, otherwise every card
 * is dead for the rest of the phase and the run looks frozen ("I pick an option
 * and the game never advances").
 */

import { env } from "@Env";
import { encounterPhase } from "./Encounter";
import type { BGContext } from "../../BattlegroundScene";

jest.mock("@Env", () => ({
	env: {
		state: {
			session: {
				phase: "encounter",
				options: [{ id: "rest_inn" }],
				team: { units: [] },
			},
		},
		scene: {
			add: {
				text: jest.fn(() => ({ setOrigin: jest.fn() })),
			},
		},
	},
}));

// The phase handler only needs `dispatchAction` from the screen module.
jest.mock("../../BattlegroundScene", () => ({
	dispatchAction: jest.fn(),
}));

jest.mock("@game/content/encounters", () => ({
	ENCOUNTERS: [
		{
			id: "rest_inn",
			nameKey: "encounters.rest_inn.name",
			descriptionKey: "encounters.rest_inn.desc",
			pic: "rest_inn",
		},
	],
}));

jest.mock("@i18n/i18n", () => ({ t: (key: string) => key }));

jest.mock("@Constants", () => ({
	SCREEN_WIDTH: 1920,
	SCREEN_HEIGHT: 1080,
	titleTextConfig: {},
}));

type FakeCard = {
	destroy: jest.Mock;
	onClick: () => void | Promise<void>;
};

jest.mock("@Components/EncounterCard", () => ({
	createEncounterCard: jest.fn((spec: { onClick: () => void | Promise<void> }) => ({
		destroy: jest.fn(),
		onClick: spec.onClick,
	})),
}));

jest.mock("@Components/Button/UIButton", () => ({
	create: jest.fn(() => ({ container: { alpha: 1 }, disable: jest.fn() })),
}));

import { createEncounterCard } from "@Components/EncounterCard";
import { dispatchAction } from "../../BattlegroundScene";

const mockedEnv = env as unknown as { state: { session: { options: { id: string }[] } } };
const mockDispatch = dispatchAction as unknown as jest.Mock;
const mockCreateCard = createEncounterCard as unknown as jest.Mock;

/** The card created by the last `encounterPhase(...)` call. */
function lastCard(): FakeCard {
	const results = mockCreateCard.mock.results;
	return results[results.length - 1].value as FakeCard;
}

describe("encounterPhase option selection", () => {
	beforeEach(() => {
		jest.clearAllMocks();
		mockedEnv.state.session.options = [{ id: "rest_inn" }];
	});

	it("releases the input latch when the dispatch fails, so the player can retry", async () => {
		mockDispatch.mockResolvedValueOnce(false); // failed dispatch
		mockDispatch.mockResolvedValueOnce(true); // retry succeeds

		encounterPhase(true)({} as BGContext);
		expect(mockCreateCard).toHaveBeenCalledTimes(1);
		const card = lastCard();

		await card.onClick();
		expect(mockDispatch).toHaveBeenCalledTimes(1);

		// The failed dispatch restored the UI: the same card must still work.
		await card.onClick();
		expect(mockDispatch).toHaveBeenCalledTimes(2);
	});

	it("keeps the latch while a dispatch is applied (no double-submit)", async () => {
		mockDispatch.mockResolvedValue(true);

		encounterPhase(true)({} as BGContext);
		const card = lastCard();

		await card.onClick();
		await card.onClick();

		expect(mockDispatch).toHaveBeenCalledTimes(1);
	});
});
