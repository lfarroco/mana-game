import { jest } from "@jest/globals";
import { handleCombatEnded } from "@Systems/ResultsPhase";
import { State } from "@Models/State";

const mockDisplayResults = jest.fn();
const mockSlideIn = jest.fn<() => Promise<void>>().mockResolvedValue(undefined);
const mockResetBoard = jest.fn<() => Promise<void>>().mockResolvedValue(undefined);
const mockHandleAction = jest.fn<() => Promise<boolean>>().mockResolvedValue(true);
const mockStartPhase = jest.fn();
const mockProcessVictory = jest.fn();
const mockProcessDefeat = jest.fn();
const mockSaveGameData = jest.fn();

jest.mock("@Utils/animation", () => ({
	delay: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
}));

jest.mock("@Systems/AudioManager", () => ({
	playSoundEffect: jest.fn(),
}));

jest.mock("@Scenes/Battleground/Results/ResultsUI", () => ({
	displayResults: (...args: unknown[]) => mockDisplayResults(...args),
	slideIn: () => mockSlideIn(),
}));

jest.mock("@Systems/PrestigeSystem", () => ({
	processVictory: () => mockProcessVictory(),
	processDefeat: () => mockProcessDefeat(),
}));

jest.mock("@Scenes/Battleground/PhaseManager", () => ({
	resetBoard: (...args: unknown[]) =>
		mockResetBoard(...(args as Parameters<typeof mockResetBoard>)),
	getServerAdapter: () => ({
		handleAction: (...args: unknown[]) =>
			mockHandleAction(...(args as Parameters<typeof mockHandleAction>)),
	}),
	getPlayerId: () => "player-1",
	startPhase: (...args: unknown[]) => mockStartPhase(...args),
}));

jest.mock("@Game/effects/saveGameData", () => ({
	saveGameData: () => mockSaveGameData(),
}));

jest.mock("@Game/effects/deleteSavedData", () => ({
	deleteSavedData: jest.fn(),
}));

jest.mock("@Models/StatsStore", () => ({
	recordUnitUsage: jest.fn(),
	checkMostPowerfulUnit: jest.fn(),
	save: jest.fn(),
}));

jest.mock("@Constants/constants", () => ({
	FORCE_ID_PLAYER: "PLAYER",
}));

jest.mock("@i18n/i18n", () => ({
	t: (key: string) => key,
	getName: (cardId: string) => cardId,
}));

jest.mock("@Scenes/Battleground/RunCombatIO", () => ({
	replayCombat: jest.fn(),
	storeCombatResult: jest.fn(),
}));

jest.mock("@Models/State", () => ({
	getCurrentScene: jest.fn(() => ({ add: { existing: jest.fn() } })),
}));

const createState = (): State => ({
	savedGames: [],
	session: {
		id: "session-1",
		player_id: "player-1",
		phase: "combat",
		round: 1,
		step: 4,
		seed: "seed-1",
		initial_seed: "seed-1",
		action_log: [],
		wins: 0,
		losses: 0,
		team: { units: [] },
		current_options: null,
	},
	battleData: {
		forces: [],
		grid: [],
		units: [
			{
				id: "unit-1",
				cardId: "quickstone",
				pic: "quickstone.png",
				force: "PLAYER",
				position: { x: 0, y: 0 },
				power: 10,
				bonusPower: 0,
				life: 10,
				maxLife: 10,
				cooldown: 100,
				critical: 0,
				evade: 0,
				rank: 1,
				shield: 0,
				effects: [],
				reactions: [],
				charge: 0,
				refresh: 0,
				hasted: 0,
				slowed: 0,
				isCore: false,
			},
		],
	},
});

describe("ResultsPhase", () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	it("does not increment round locally before the server advances after a victory", async () => {
		const state = createState();
		let continueCallback: (() => Promise<void>) | undefined;

		mockDisplayResults.mockImplementation((...args: unknown[]) => {
			continueCallback = args[2] as () => Promise<void>;
		});

		await handleCombatEnded(state, "player_won");

		expect(mockProcessVictory).toHaveBeenCalled();
		expect(state.session.round).toBe(1);
		expect(continueCallback).toBeDefined();

		await continueCallback?.();

		expect(state.session.round).toBe(1);
		expect(mockSaveGameData).toHaveBeenCalled();
		expect(mockResetBoard).toHaveBeenCalledWith(true);
		expect(mockHandleAction).toHaveBeenCalledWith("player-1", "combat_done");
		expect(mockStartPhase).toHaveBeenCalledWith(state);
	});

	it("uses victory action to continue infinite mode once the win threshold is reached", async () => {
		const state = createState();
		state.session.wins = 10;
		let continueCallback: (() => Promise<void>) | undefined;

		mockDisplayResults.mockImplementation((...args: unknown[]) => {
			continueCallback = args[2] as () => Promise<void>;
		});

		await handleCombatEnded(state, "player_won");
		expect(continueCallback).toBeDefined();

		await continueCallback?.();

		expect(mockHandleAction).toHaveBeenCalledWith("player-1", "victory");
		expect(mockStartPhase).toHaveBeenCalledWith(state);
	});

	it("does not increment round locally before the server advances after a defeat", async () => {
		const state = createState();
		let continueCallback: (() => Promise<void>) | undefined;

		mockDisplayResults.mockImplementation((...args: unknown[]) => {
			continueCallback = args[2] as () => Promise<void>;
		});

		await handleCombatEnded(state, "player_lost");

		expect(mockProcessDefeat).toHaveBeenCalled();
		expect(state.session.round).toBe(1);
		expect(continueCallback).toBeDefined();

		await continueCallback?.();

		expect(state.session.round).toBe(1);
		expect(mockSaveGameData).toHaveBeenCalled();
		expect(mockResetBoard).toHaveBeenCalledWith(true);
		expect(mockHandleAction).toHaveBeenCalledWith("player-1", "combat_done");
		expect(mockStartPhase).toHaveBeenCalledWith(state);
	});

	it("treats both_won as a victory flow", async () => {
		const state = createState();
		let continueCallback: (() => Promise<void>) | undefined;

		mockDisplayResults.mockImplementation((...args: unknown[]) => {
			continueCallback = args[2] as () => Promise<void>;
		});

		await handleCombatEnded(state, "both_won");

		expect(mockProcessVictory).toHaveBeenCalled();
		expect(continueCallback).toBeDefined();

		await continueCallback?.();

		expect(mockHandleAction).toHaveBeenCalledWith("player-1", "combat_done");
		expect(mockStartPhase).toHaveBeenCalledWith(state);
	});
});
