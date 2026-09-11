/**
 * The run-complete (victory / game-over) screen must always render.
 *
 * Player report: "the victory screen is just gone now". `displayGameComplete`
 * awaits the finished-run save cleanup as its FIRST statement, and that cleanup
 * used to reject on a machine whose storage is blocked or over quota (the
 * session store called `localStorage.removeItem` unguarded) — so the screen
 * never rendered and the player was left on a board the victory/game-over phase
 * had already cleared. The cleanup is now best-effort.
 *
 * Everything the screen paints with is mocked; the invariant under test is that
 * a failing cleanup cannot reject the screen.
 */

import { deleteSavedData } from "@Systems/Storage/deleteSavedData";
import { displayGameComplete } from "./GameCompleteUI";
import type { Unit } from "@game/Models";

jest.mock("@Env", () => {
	const chainable = () => ({
		setOrigin: jest.fn().mockReturnThis(),
		setPosition: jest.fn().mockReturnThis(),
		setAlpha: jest.fn().mockReturnThis(),
	});
	return {
		env: {
			state: {
				session: {
					session_type: { type: "singleplayer" },
					runStats: undefined,
				},
			},
			scene: {
				add: {
					text: jest.fn(chainable),
					rectangle: jest.fn(chainable),
				},
			},
			centeredRect: jest.fn(chainable),
		},
		makeContainer: jest.fn(() => ({ add: jest.fn() })),
		borderedRoundRect: jest.fn(chainable),
	};
});

jest.mock("@Components/Button/UIButton", () => ({
	create: jest.fn(() => ({ container: { setAlpha: jest.fn() } })),
}));
jest.mock("@Utils/environment", () => ({ isElectron: () => false }));
jest.mock("@Systems/AudioManager", () => ({ playMusic: jest.fn() }));
jest.mock("@Systems/AchievementSystem", () => ({ checkVictoryAchievements: jest.fn() }));
jest.mock("@Models/StatsStore", () => ({
	incrementRunsPlayed: jest.fn(),
	recordVictory: jest.fn(),
	updateFurthestInfiniteRound: jest.fn(),
	recordRunStats: jest.fn(),
	save: jest.fn(),
}));
jest.mock("@i18n/i18n", () => ({ t: (key: string) => key }));
jest.mock("@config", () => ({ IS_DEMO: false, GAME_CONFIG: { MAX_VICTORIES: 12 } }));
jest.mock("@Systems/Storage/deleteSavedData", () => ({ deleteSavedData: jest.fn() }));

const mockDeleteSavedData = deleteSavedData as unknown as jest.Mock;

const unitOf = (id: string, isCore: boolean): Unit =>
	({ id, cardId: `card-${id}`, power: 10, rank: 1, isCore }) as unknown as Unit;

describe("displayGameComplete", () => {
	let warn: jest.SpyInstance;

	beforeEach(() => {
		jest.clearAllMocks();
		warn = jest.spyOn(console, "warn").mockImplementation(() => {});
	});

	afterEach(() => {
		warn.mockRestore();
	});

	it("renders the victory screen even when the save cleanup fails", async () => {
		mockDeleteSavedData.mockRejectedValue(new Error("SecurityError: storage denied"));

		const units = [unitOf("core", true), unitOf("ally", false)];

		await expect(displayGameComplete(10, units, false)).resolves.toBeDefined();
		expect(warn).toHaveBeenCalledWith(
			"GameCompleteUI",
			expect.stringContaining("save"),
			expect.any(Error)
		);
	});

	it("renders the game-over screen even when the save cleanup fails", async () => {
		mockDeleteSavedData.mockRejectedValue(new Error("QuotaExceededError"));

		await expect(displayGameComplete(4, [unitOf("core", true)], true)).resolves.toBeDefined();
	});
});
