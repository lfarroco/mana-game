import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { handleMultiplayerPhase } from "@Scenes/Battleground/MultiplayerPhaseManager";
import { getPhaseOptions } from "@Multiplayer/MultiplayerManager";
import * as ResultsUI from "@Scenes/Battleground/Results/ResultsUI";

jest.mock("@Multiplayer/MultiplayerManager", () => ({
	getPhaseOptions: jest.fn(),
	sendOptionSelection: jest.fn(),
	__esModule: true,
}));

jest.mock("@Models/State", () => ({
	getCurrentScene: jest.fn(() => ({ add: { existing: jest.fn() } })),
	__esModule: true,
}));

jest.mock("@Systems/Encounter", () => ({ open: jest.fn(), __esModule: true }));
jest.mock("@Scenes/Battleground/BrowserCombatEffects", () => ({
	createBrowserCombatEffects: jest.fn(),
	__esModule: true,
}));
jest.mock("@Scenes/Battleground/CombatPlaybackController", () => ({
	createCombatPlaybackController: jest.fn(),
	__esModule: true,
}));
jest.mock("@Systems/Chara/Chara", () => ({
	clearAll: jest.fn(),
	create: jest.fn(),
	enableTooltip: jest.fn(),
	getCharaById: jest.fn(),
	__esModule: true,
}));
jest.mock("@Components/UIButton", () => ({ createUIButton: jest.fn(), __esModule: true }));
jest.mock("@i18n/i18n", () => ({ t: jest.fn((key: string) => key), __esModule: true }));
jest.mock("@Models/Geometry", () => ({ vec2: jest.fn(), __esModule: true }));
jest.mock("@Models/Board", () => ({
	setIsInputEnabled: jest.fn(),
	setEnemyBoardVisible: jest.fn(),
	__esModule: true,
}));
jest.mock("@Scenes/Battleground/Results/ResultsUI", () => ({
	displayResults: jest.fn(),
	displayGameCompleteResults: jest.fn(),
	slideIn: jest.fn(),
	__esModule: true,
}));
jest.mock("@Systems/Chara/Animations", () => ({ shatter: jest.fn(), __esModule: true }));
jest.mock("@Scenes/Battleground/ForceStats", () => ({
	destroyForceStats: jest.fn((state: unknown) => state),
	__esModule: true,
}));
jest.mock("@Systems/CombatSystemStates", () => ({
	updateForceStatsState: jest.fn(),
	__esModule: true,
}));
jest.mock("@Models/Entities/Unit", () => ({ resetUnitStats: jest.fn(), __esModule: true }));
jest.mock("@Models/Entities/Card", () => ({
	getBattleCore: jest.fn(),
	getCardDefinition: jest.fn(),
	__esModule: true,
}));
jest.mock("@Utils/animation", () => ({ delay: jest.fn(), __esModule: true }));
jest.mock("@Systems/Shop/OrbShop", () => ({ openOrbShop: jest.fn(), __esModule: true }));
jest.mock("@UI/components/livesDisplay", () => ({
	updateLivesDisplay: jest.fn(),
	__esModule: true,
}));
jest.mock("@UI/components/roundDisplay", () => ({
	updateRoundDisplay: jest.fn(),
	__esModule: true,
}));
jest.mock("@UI/components/winsDisplay", () => ({ updateWinsDisplay: jest.fn(), __esModule: true }));
jest.mock("@Systems/Shop/CharaShop", () => ({ renderTavernCharas: jest.fn(), __esModule: true }));
jest.mock("@Systems/Shop/ShopPanel", () => ({
	create: jest.fn(),
	slideIn: jest.fn(),
	slideOut: jest.fn(),
	__esModule: true,
}));
jest.mock("@Core/GameControllerFactory", () => ({
	getGameController: jest.fn(() => ({ isFeatureEnabled: jest.fn(() => false) })),
	__esModule: true,
}));
jest.mock("@Systems/Shop/EffectCardShop", () => ({
	openUpgradeCorePhase: jest.fn(),
	__esModule: true,
}));

const mockGetPhaseOptions = getPhaseOptions as jest.MockedFunction<typeof getPhaseOptions>;

describe("MultiplayerPhaseManager terminal phases", () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	it("shows the game-complete UI for game over instead of the placeholder match-result overlay", async () => {
		mockGetPhaseOptions.mockResolvedValue({
			phase: "game_over",
			round: 7,
			options: [],
			team: { units: [] },
			wins: 3,
			losses: 4,
		} as Awaited<ReturnType<typeof getPhaseOptions>>);

		const state = {
			session: {
				phase: "combat",
				current_options: null,
				team: { units: [] },
				wins: 0,
				losses: 0,
				round: 1,
			},
			battleData: { units: [] },
		} as Parameters<typeof handleMultiplayerPhase>[0];

		await handleMultiplayerPhase(state);

		expect(ResultsUI.displayGameCompleteResults).toHaveBeenCalledWith(state, true);
		expect(ResultsUI.slideIn).toHaveBeenCalled();
	});
});
