import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { handleMultiplayerPhase } from "@Scenes/Battleground/MultiplayerPhaseManager";
import type { PhaseTransport } from "@Scenes/Battleground/MultiplayerPhaseManager";
import { getPhaseOptions } from "@Multiplayer/MultiplayerManager";
import * as ResultsUI from "@Scenes/Battleground/Results/ResultsUI";
import { openOrbShop } from "@Systems/Shop/OrbShop";

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
const mockOpenOrbShop = openOrbShop as jest.MockedFunction<typeof openOrbShop>;

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
		} as unknown as Parameters<typeof handleMultiplayerPhase>[0];

		await handleMultiplayerPhase(state);

		expect(ResultsUI.displayGameCompleteResults).toHaveBeenCalledWith(state, true);
		expect(ResultsUI.slideIn).toHaveBeenCalled();
	});

	it("uses injected transport for local-mode compatible phase handling", async () => {
		const getPhaseOptionsMock: jest.MockedFunction<PhaseTransport["getPhaseOptions"]> = jest.fn(
			async () => ({
				phase: "game_over",
				round: 2,
				options: [],
				team: { units: [] },
				wins: 1,
				losses: 4,
			})
		);
		const sendOptionSelectionMock: jest.MockedFunction<PhaseTransport["sendOptionSelection"]> =
			jest.fn(async () => true);

		const localTransport: PhaseTransport = {
			getPhaseOptions: getPhaseOptionsMock,
			sendOptionSelection: sendOptionSelectionMock,
		};

		const state = {
			session: {
				phase: "encounter",
				current_options: null,
				team: { units: [] },
				wins: 0,
				losses: 0,
				round: 1,
			},
			battleData: { units: [] },
		} as unknown as Parameters<typeof handleMultiplayerPhase>[0];

		await handleMultiplayerPhase(state, localTransport);

		expect(localTransport.getPhaseOptions).toHaveBeenCalledTimes(1);
		expect(ResultsUI.displayGameCompleteResults).toHaveBeenCalledWith(state, true);
	});

	it("forwards orb actions through injected transport", async () => {
		const getPhaseOptionsMock: jest.MockedFunction<PhaseTransport["getPhaseOptions"]> = jest.fn();
		getPhaseOptionsMock
			.mockResolvedValueOnce({
				phase: "orb_shop",
				round: 2,
				options: [{ id: "upgrade_orb" }],
				team: { units: [] },
				wins: 1,
				losses: 0,
			})
			.mockResolvedValueOnce({
				phase: "game_over",
				round: 2,
				options: [],
				team: { units: [] },
				wins: 1,
				losses: 4,
			});

		const sendOptionSelectionMock: jest.MockedFunction<PhaseTransport["sendOptionSelection"]> =
			jest.fn(async () => true);

		const localTransport: PhaseTransport = {
			getPhaseOptions: getPhaseOptionsMock,
			sendOptionSelection: sendOptionSelectionMock,
		};

		mockOpenOrbShop.mockImplementation(async (_state, _orbIds, applyOrb) => {
			if (applyOrb) {
				await applyOrb("upgrade_orb", "core-id");
			}
		});

		const state = {
			session: {
				phase: "encounter",
				current_options: null,
				team: { units: [] },
				wins: 0,
				losses: 0,
				round: 1,
			},
			battleData: { units: [] },
		} as unknown as Parameters<typeof handleMultiplayerPhase>[0];

		await handleMultiplayerPhase(state, localTransport);

		expect(localTransport.sendOptionSelection).toHaveBeenCalledWith("apply_orb", {
			orbId: "upgrade_orb",
			targetUnitId: "core-id",
			team: state.session.team,
		});
		expect(localTransport.sendOptionSelection).toHaveBeenCalledWith("orb_shop_done");
		expect(localTransport.getPhaseOptions).toHaveBeenCalledTimes(2);
	});
});
