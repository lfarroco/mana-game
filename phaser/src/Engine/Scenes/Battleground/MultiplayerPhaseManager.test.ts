import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { handleMultiplayerPhase } from "@Scenes/Battleground/MultiplayerPhaseManager";
import type { PhaseTransport } from "@Scenes/Battleground/MultiplayerPhaseManager";
import { getPhaseOptions } from "@Multiplayer/MultiplayerManager";
import * as ResultsUI from "@Scenes/Battleground/Results/ResultsUI";
import { createBrowserCombatEffects } from "@Scenes/Battleground/BrowserCombatEffects";
import { createCombatPlaybackController } from "@Scenes/Battleground/CombatPlaybackController";
import { openOrbShop } from "@Systems/Shop/OrbShop";
import { createUIButton } from "@Components/UIButton";
import { getBattleCore } from "@Models/Entities/Card";
import { getCharaById } from "@Systems/Chara/Chara";
import { setEnemyBoardVisible } from "@Models/Board";
import { shatter } from "@Systems/Chara/Animations";
import { updateMultiplayerPlayerNamesDisplay } from "@Scenes/Battleground/Components/multiplayerPlayerNamesDisplay";
import * as Encounter from "@Systems/Encounter";

jest.mock("@Multiplayer/MultiplayerManager", () => ({
	getPhaseOptions: jest.fn(),
	sendOptionSelection: jest.fn(),
	__esModule: true,
}));

jest.mock("@Models/State", () => ({
	getCurrentScene: jest.fn(() => ({ add: { existing: jest.fn() } })),
	getState: jest.fn(() => ({ session: { team: { units: [] } }, battleData: { units: [] } })),
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
	getAllCharas: jest.fn().mockReturnValue([]),
	getUnit: jest.fn(),
	destroy: jest.fn(),
	hasCharaById: jest.fn().mockReturnValue(false),
	refreshUnit: jest.fn(async () => undefined),
	summon: jest.fn().mockResolvedValue({} as never),
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
	syncPlayerPersistentForceStats: jest.fn((state: unknown) => state),
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
	registerCollection: jest.fn(),
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
	isVisible: jest.fn().mockReturnValue(false),
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
jest.mock("@Scenes/Battleground/PhaseManager", () => ({
	resetBoard: jest.fn(async () => undefined),
	__esModule: true,
}));
jest.mock("@UI/components/multiplayerPlayerNamesDisplay", () => ({
	updateMultiplayerPlayerNamesDisplay: jest.fn(),
	__esModule: true,
}));

const mockGetPhaseOptions = getPhaseOptions as jest.MockedFunction<typeof getPhaseOptions>;
const mockCreateBrowserCombatEffects =
	createBrowserCombatEffects as jest.MockedFunction<typeof createBrowserCombatEffects>;
const mockCreateCombatPlaybackController =
	createCombatPlaybackController as jest.MockedFunction<typeof createCombatPlaybackController>;
const mockOpenOrbShop = openOrbShop as jest.MockedFunction<typeof openOrbShop>;
const mockCreateUIButton = createUIButton as jest.MockedFunction<typeof createUIButton>;
const mockGetBattleCore = getBattleCore as jest.MockedFunction<typeof getBattleCore>;
const mockGetCharaById = getCharaById as jest.MockedFunction<typeof getCharaById>;
const mockSetEnemyBoardVisible = setEnemyBoardVisible as jest.MockedFunction<
	typeof setEnemyBoardVisible
>;
const mockShatter = shatter as jest.MockedFunction<typeof shatter>;
const mockUpdateMultiplayerPlayerNamesDisplay =
	updateMultiplayerPlayerNamesDisplay as jest.MockedFunction<
		typeof updateMultiplayerPlayerNamesDisplay
	>;
const mockEncounterOpen = Encounter.open as jest.MockedFunction<typeof Encounter.open>;

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
		} as unknown as Awaited<ReturnType<typeof getPhaseOptions>>);

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

	it("keeps the enemy board visible until after combat-end animations run", async () => {
		const capturedEffects: {
			onCombatEnd?: (
				state: unknown,
				outcome: "player_won" | "player_lost",
				combatStates?: { forceStatsState: unknown }
			) => void;
		} = {};

		mockGetPhaseOptions.mockResolvedValue({
			phase: "combat",
			round: 3,
			options: [{ id: "combat_done" }],
			team: {
				units: [{ id: "player-1", force: "player", position: { x: 0, y: 0 } }],
			},
			combatState: {
				enemyTeam: [{ id: "enemy-core", force: "cpu", position: { x: 0, y: 0 }, isCore: true }],
				logs: [],
				seed: "test-seed",
				units: [
					{ id: "player-1", force: "player", position: { x: 0, y: 0 } },
					{ id: "enemy-core", force: "cpu", position: { x: 0, y: 0 }, isCore: true },
				],
			},
		} as unknown as Awaited<ReturnType<typeof getPhaseOptions>>);

		mockCreateBrowserCombatEffects.mockImplementation(() => capturedEffects as never);
		mockCreateCombatPlaybackController.mockReturnValue({
			getEnv: () => ({ combatStates: {} }),
		} as never);
		mockGetBattleCore.mockReturnValue(() => ({ id: "enemy-core" }) as never);
		mockGetCharaById.mockReturnValue({ id: "enemy-chara" } as never);
		mockShatter.mockResolvedValue(undefined);

		const state = {
			session: {
				phase: "combat",
				current_options: null,
				team: { units: [{ id: "player-1", force: "player", position: { x: 0, y: 0 } }] },
				wins: 0,
				losses: 0,
				round: 2,
			},
			battleData: { units: [] },
		} as unknown as Parameters<typeof handleMultiplayerPhase>[0];

		await handleMultiplayerPhase(state);

		expect(capturedEffects.onCombatEnd).toBeDefined();

		void capturedEffects.onCombatEnd?.(state, "player_won", { forceStatsState: {} });
		await Promise.resolve();
		await Promise.resolve();

		expect(mockShatter).toHaveBeenCalled();
		expect(mockSetEnemyBoardVisible).toHaveBeenCalledWith(true);
		expect(mockSetEnemyBoardVisible).not.toHaveBeenCalledWith(false);
		const forceStatsModule = jest.requireMock("@Scenes/Battleground/ForceStats") as {
			destroyForceStats: jest.Mock;
			syncPlayerPersistentForceStats: jest.Mock;
		};
		expect(forceStatsModule.destroyForceStats).toHaveBeenCalledTimes(1);
		expect(forceStatsModule.syncPlayerPersistentForceStats).toHaveBeenCalledTimes(1);
	});

	it("shows Ready on initial resumed combat and starts playback only after click", async () => {
		let onReadyClick: (() => void) | undefined;

		mockGetPhaseOptions.mockResolvedValue({
			phase: "combat",
			round: 3,
			options: [{ id: "combat_done" }],
			team: {
				units: [{ id: "player-1", force: "player", position: { x: 0, y: 0 } }],
			},
			combatState: {
				enemyTeam: [{ id: "enemy-core", force: "cpu", position: { x: 0, y: 0 }, isCore: true }],
				logs: [],
				seed: "test-seed",
				units: [
					{ id: "player-1", force: "player", position: { x: 0, y: 0 } },
					{ id: "enemy-core", force: "cpu", position: { x: 0, y: 0 }, isCore: true },
				],
			},
		} as unknown as Awaited<ReturnType<typeof getPhaseOptions>>);

		mockCreateUIButton.mockImplementation((_label, _position, callback) => {
			onReadyClick = callback;
			return {
				container: {
					setDepth: jest.fn(),
					destroy: jest.fn(),
				},
			} as never;
		});

		mockCreateBrowserCombatEffects.mockReturnValue({} as never);
		mockCreateCombatPlaybackController.mockReturnValue({
			getEnv: () => ({ combatStates: {} }),
		} as never);

		const state = {
			session: {
				phase: "combat",
				current_options: null,
				team: { units: [{ id: "player-1", force: "player", position: { x: 0, y: 0 } }] },
				wins: 0,
				losses: 0,
				round: 2,
			},
			battleData: { units: [] },
		} as unknown as Parameters<typeof handleMultiplayerPhase>[0];

		await handleMultiplayerPhase(state, undefined, { showReadyOnInitialCombat: true });

		expect(mockCreateUIButton).toHaveBeenCalledTimes(1);
		expect(mockCreateCombatPlaybackController).not.toHaveBeenCalled();
		expect(onReadyClick).toBeDefined();

		onReadyClick?.();
		await Promise.resolve();

		expect(mockCreateCombatPlaybackController).toHaveBeenCalledTimes(1);
	});

	it("updates the combat opponent label from multiplayer combat state", async () => {
		mockGetPhaseOptions.mockResolvedValue({
			phase: "combat",
			round: 3,
			options: [{ id: "combat_done", label: "Continue" }],
			team: { units: [] },
			combatState: {
				units: [],
				enemyTeam: [],
				logs: [],
				seed: "seed-1",
				enemyPlayerName: "RivalMage",
			},
		} as unknown as Awaited<ReturnType<typeof getPhaseOptions>>);
		mockCreateBrowserCombatEffects.mockReturnValue({} as never);
		mockCreateCombatPlaybackController.mockImplementation(() => ({ start: jest.fn() }) as never);

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

		await handleMultiplayerPhase(state);

		expect(mockUpdateMultiplayerPlayerNamesDisplay).toHaveBeenCalledWith({
			enemyName: "RivalMage",
		});
	});

	it("recreates existing board charas when the server updates a unit with the same id", async () => {
		const oldUnit = {
			id: "unit-1",
			force: "player",
			position: { x: 0, y: 0 },
			rank: 2,
			power: 50,
		};
		const updatedUnit = {
			...oldUnit,
			rank: 3,
			power: 100,
		};
		const existingChara = { id: "chara-1" };
		const charaModule = jest.requireMock("@Systems/Chara/Chara") as {
			getAllCharas: jest.Mock;
			getUnit: jest.Mock;
			destroy: jest.Mock;
			hasCharaById: jest.Mock;
			create: jest.Mock;
			refreshUnit: jest.Mock;
			summon: jest.Mock;
		};

		mockGetPhaseOptions.mockResolvedValue({
			phase: "encounter",
			round: 3,
			options: [{ id: "combat_encounter" }],
			team: { units: [updatedUnit] },
			wins: 2,
			losses: 1,
		} as unknown as Awaited<ReturnType<typeof getPhaseOptions>>);

		charaModule.getAllCharas.mockReturnValue([existingChara]);
		charaModule.getUnit.mockReturnValue(oldUnit);
		charaModule.hasCharaById.mockImplementation((...args: unknown[]) => args[0] === updatedUnit.id);

		const state = {
			session: {
				phase: "shop",
				current_options: null,
				team: { units: [oldUnit] },
				wins: 0,
				losses: 0,
				round: 1,
			},
			battleData: { units: [] },
		} as unknown as Parameters<typeof handleMultiplayerPhase>[0];

		await handleMultiplayerPhase(state);

		expect(charaModule.refreshUnit).toHaveBeenCalledWith(updatedUnit);
		expect(charaModule.destroy).not.toHaveBeenCalledWith(existingChara);
		expect(charaModule.create).not.toHaveBeenCalledWith(updatedUnit);
		expect(charaModule.summon).not.toHaveBeenCalled();
		expect(mockEncounterOpen).toHaveBeenCalledWith(state, ["combat_encounter"]);
	});
});
