import { ArenaLobbyScene } from "@Scenes/ArenaLobby/ArenaLobbyScene";
import { SCENE_KEYS } from "@Constants/constants";
import { checkActiveSession, enableMultiplayer } from "@Multiplayer/MultiplayerManager";

const createdButtons: Array<() => void | Promise<void>> = [];

jest.mock("@Constants/constants", () => ({
	SCREEN_WIDTH: 1920,
	SCREEN_HEIGHT: 1080,
	MIDDLE_SCREEN: { x: 960, y: 540 },
	SCENE_KEYS: {
		ARENA_LOBBY: "ArenaLobbyScene",
		BATTLEGROUND: "BattlegroundScene",
		CRYSTAL_SELECTION: "CrystalSelectionScene",
		ARENA_LOGIN: "ArenaLoginScene",
		TITLE: "TitleScene",
	},
}));

jest.mock("@PhaserIO", () => ({
	Text: jest.fn(() => ({
		setPosition: jest.fn().mockReturnThis(),
		setOrigin: jest.fn().mockReturnThis(),
		setText: jest.fn().mockReturnThis(),
	})),
}));

jest.mock("@Components/UIButton", () => ({
	createUIButton: jest.fn((_label: string, _pos: unknown, onClick: () => void | Promise<void>) => {
		createdButtons.push(onClick);
		return { container: { destroy: jest.fn() } };
	}),
}));

jest.mock("@Multiplayer/MultiplayerManager", () => ({
	checkActiveSession: jest.fn(),
	enableMultiplayer: jest.fn(),
	logout: jest.fn(),
	getPlayerProfile: jest.fn(),
}));

jest.mock("@Models/State", () => ({
	setCurrentScene: jest.fn(),
}));

jest.mock("@i18n/i18n", () => ({
	t: jest.fn((key: string) => key),
}));

jest.mock("@Models/Geometry", () => ({
	vec2: jest.fn((x: number, y: number) => ({ x, y })),
}));

describe("ArenaLobbyScene", () => {
	beforeEach(() => {
		createdButtons.length = 0;
		jest.clearAllMocks();
	});

	it("starts battleground in multiplayer mode when active session exists", async () => {
		(checkActiveSession as jest.Mock).mockResolvedValue(true);
		(enableMultiplayer as jest.Mock).mockResolvedValue(undefined);

		const scene = new ArenaLobbyScene() as any;
		scene.add = {
			rectangle: jest.fn(() => ({ setOrigin: jest.fn().mockReturnThis() })),
		};
		scene.scene = { start: jest.fn() };
		scene.refreshProfile = jest.fn();

		scene.create();

		await createdButtons[0]();

		expect(enableMultiplayer).toHaveBeenCalled();
		expect(scene.scene.start).toHaveBeenCalledWith(SCENE_KEYS.BATTLEGROUND, {
			isMultiplayer: true,
		});
	});

	it("routes to crystal selection when no active session exists", async () => {
		(checkActiveSession as jest.Mock).mockResolvedValue(false);

		const scene = new ArenaLobbyScene() as any;
		scene.add = {
			rectangle: jest.fn(() => ({ setOrigin: jest.fn().mockReturnThis() })),
		};
		scene.scene = { start: jest.fn() };
		scene.refreshProfile = jest.fn();

		scene.create();

		await createdButtons[0]();

		expect(scene.scene.start).toHaveBeenCalledWith(SCENE_KEYS.CRYSTAL_SELECTION, {
			isArena: true,
		});
	});
});
