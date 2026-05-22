import { jest } from "@jest/globals";
import { clickNextRound, gameActions } from "Client/Scenes/Debug/DebugController";
import { getGameController } from "@Core/GameControllerFactory";
import { Unit } from "@Models/Entities/Unit";
import { GameController } from "@Core/GameController";
import { ActionPayload } from "@Core/Types";

jest.mock("@Models/Entities/Unit", () => ({
	makeUnit: jest.fn(),
}));
jest.mock("@Models/Geometry", () => ({
	vec2: jest.fn(),
}));
jest.mock("@Models/Entities/Card", () => ({
	getBattleCore: jest.fn(),
}));
jest.mock("@Models/Entities/Force", () => ({
	playerForce: jest.fn(),
	cpuForce: jest.fn(),
}));
jest.mock("@Constants/constants", () => ({
	FORCE_ID_PLAYER: "PLAYER",
	FORCE_ID_CPU: "CPU",
	SCENE_KEYS: { BATTLEGROUND: "BATTLEGROUND" },
	SHOP_ITEM_PURCHASE_COST: 0,
	MAX_PARTY_SIZE: 0,
}));
jest.mock("@Systems/Chara/Chara", () => ({
	getUnit: jest.fn(),
	getId: jest.fn(),
	isShopItem: jest.fn(),
	getCharaById: jest.fn(),
	summon: jest.fn(),
	upgradeUnit: jest.fn(),
}));
jest.mock("@Systems/BattlegroundSystems", () => ({
	Shop: {
		HeroShop: {
			getShopCharaBySlot: jest.fn(),
			getDisplayedHeroCardDefinitions: jest.fn(),
		},
		events: {
			itemClickPurchaseRequested: jest.fn(),
			itemDragPurchaseRequested: jest.fn(),
			ownedUnitSold: jest.fn(),
		},
	},
}));
jest.mock("@Systems/Chara/input", () => ({
	processOwnedUnitMoveRequest: jest.fn(),
}));
jest.mock("../../../Game/effects/startGame", () => ({
	startGame: jest.fn(),
}));
jest.mock("@Scenes/Battleground/PhaseManager", () => ({
	startPhase: jest.fn(),
}));
jest.mock("@Models/State", () => ({
	getState: jest.fn(() => ({ session: { team: { units: [] } } })),
	getCurrentScene: jest.fn(() => ({ scene: { key: "" } })),
}));
jest.mock("@Models/StatsStore", () => ({
	unlockUnit: jest.fn(),
	lockUnit: jest.fn(),
}));
jest.mock("@Scenes/CrystalSelection/CrystalSelectionScene", () => ({
	__esModule: true,
	default: class { },
}));
jest.mock("@Systems/CombatPhase", () => ({
	handleCombatStartExecution: jest.fn(),
}));
jest.mock("@Systems/Encounter", () => ({
	chooseEncounter: jest.fn(),
}));
jest.mock("@Core/PhaseTransitions", () => ({
	getPhaseForHour: jest.fn(),
}));
jest.mock("@Components/UIButton", () => ({
	activeButtons: {},
}));
jest.mock("@Core/Types", () => ({}));
jest.mock("@Core/ServerFactory", () => ({
	getServerAdapter: jest.fn(() => ({})),
}));
jest.mock("@Core/GameControllerFactory", () => ({
	getGameController: jest.fn(),
}));

const mockGetController = getGameController as jest.MockedFunction<typeof getGameController>;

const buildController = (overrides: Partial<ReturnType<typeof mockGetController>> = {}) => ({
	purchaseUnit: jest.fn<(cardId: string, targetSlot?: number) => Promise<boolean>>(),
	sellUnit: jest.fn<(unitId: string) => Promise<boolean>>(),
	skipPhase: jest.fn<() => Promise<boolean>>(),
	selectEncounter: jest.fn<(encounterId: string) => Promise<boolean>>(),
	handleAction: jest.fn<(actionId: string, payload?: ActionPayload) => Promise<boolean>>(),
	updateTeam: jest.fn<(team: { units: Unit[] }) => Promise<boolean>>(),
	notifyGameComplete: jest.fn<() => Promise<boolean>>(),
	isFeatureEnabled: jest.fn<(feature: string) => boolean>(),
	...overrides,
});

describe("DebugController delegation", () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	it.skip("uses GameController to skip phases when advancing rounds", async () => {
		const controller = buildController({
			skipPhase: jest.fn<() => Promise<boolean>>().mockResolvedValue(true),
		});
		mockGetController.mockReturnValue(controller as unknown as GameController);

		const result = await clickNextRound();

		expect(controller.skipPhase).toHaveBeenCalled();
		expect(result).toContain("Requested phase skip");
	});

	it("exposes gameActions to forward purchase operations", async () => {
		const purchaseUnit = jest
			.fn<(cardId: string, targetSlot?: number) => Promise<boolean>>()
			.mockResolvedValue(true);
		const controller = buildController({ purchaseUnit });
		mockGetController.mockReturnValue(controller as unknown as GameController);

		await gameActions.purchaseUnit("hero-card");

		expect(purchaseUnit).toHaveBeenCalledWith("hero-card", undefined);
	});

	it("forwards common game actions through the gameActions wrapper", async () => {
		const sellUnit = jest.fn<(unitId: string) => Promise<boolean>>().mockResolvedValue(true);
		const updateTeam = jest
			.fn<(team: { units: Unit[] }) => Promise<boolean>>()
			.mockResolvedValue(true);
		const handleAction = jest
			.fn<(actionId: string, payload?: ActionPayload) => Promise<boolean>>()
			.mockResolvedValue(true);
		const skipPhase = jest.fn<() => Promise<boolean>>().mockResolvedValue(true);
		const controller = buildController({ sellUnit, updateTeam, handleAction, skipPhase });
		mockGetController.mockReturnValue(controller as unknown as GameController);

		await gameActions.sellUnit("unit-1");
		await gameActions.updateTeam({ units: [] });
		await gameActions.handleAction("custom", { team: { units: [] } });
		await gameActions.skipPhase();

		expect(sellUnit).toHaveBeenCalledWith("unit-1");
		expect(updateTeam).toHaveBeenCalledWith({ units: [] });
		expect(handleAction).toHaveBeenCalledWith("custom", { team: { units: [] } });
		expect(skipPhase).toHaveBeenCalled();
	});
});
