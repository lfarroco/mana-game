import { ArenaLobbyScene } from "@Scenes/ArenaLobby/ArenaLobbyScene";
import { SCENE_KEYS } from "@Constants/constants";
import {
	checkActiveSessionByType,
	enableMultiplayer,
	getTopRankedPlayers,
} from "@Multiplayer/MultiplayerManager";

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
		return {
			container: {
				destroy: jest.fn(),
				setDepth: jest.fn().mockReturnThis(),
				setVisible: jest.fn().mockReturnThis(),
			},
			disable: jest.fn(),
			enable: jest.fn(),
		};
	}),
}));

jest.mock("@Multiplayer/MultiplayerManager", () => ({
	checkActiveSessionByType: jest.fn(),
	enableMultiplayer: jest.fn(),
	logout: jest.fn(),
	getPlayerProfile: jest.fn(),
	getTopRankedPlayers: jest.fn(),
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
		(checkActiveSessionByType as jest.Mock).mockResolvedValue(true);
		(enableMultiplayer as jest.Mock).mockResolvedValue(undefined);

		const scene = new ArenaLobbyScene() as unknown as ArenaLobbyScene;
		const mockContainer = { setVisible: jest.fn().mockReturnThis(), setDepth: jest.fn().mockReturnThis() };
		scene.add = {
			rectangle: jest.fn(() => ({ setOrigin: jest.fn().mockReturnThis() })),
			text: jest.fn(() => ({ setOrigin: jest.fn().mockReturnThis() })),
			container: jest.fn(() => mockContainer),
		} as unknown as typeof scene.add;
		scene.scene = { start: jest.fn() } as unknown as typeof scene.scene;
		scene.refreshProfile = jest.fn();

		scene.create();

		await createdButtons[0]();

		expect(checkActiveSessionByType).toHaveBeenCalledWith("casual");
		expect(enableMultiplayer).toHaveBeenCalled();
		expect(scene.scene.start).toHaveBeenCalledWith(SCENE_KEYS.BATTLEGROUND, {
			isMultiplayer: true,
			multiplayerQueueType: "casual",
		});
	});

	it("routes to crystal selection when no active session exists", async () => {
		(checkActiveSessionByType as jest.Mock).mockResolvedValue(false);

		const scene = new ArenaLobbyScene() as unknown as ArenaLobbyScene;
		const mockContainer = { setVisible: jest.fn().mockReturnThis(), setDepth: jest.fn().mockReturnThis() };
		scene.add = {
			rectangle: jest.fn(() => ({ setOrigin: jest.fn().mockReturnThis() })),
			text: jest.fn(() => ({ setOrigin: jest.fn().mockReturnThis() })),
			container: jest.fn(() => mockContainer),
		} as unknown as typeof scene.add;
		scene.scene = { start: jest.fn() } as unknown as typeof scene.scene;
		scene.refreshProfile = jest.fn();

		scene.create();

		await createdButtons[0]();

		expect(scene.scene.start).toHaveBeenCalledWith(SCENE_KEYS.CRYSTAL_SELECTION, {
			isMultiplayer: true,
			multiplayerQueueType: "casual",
		});
	});

	it("starts ranked flow when ranked button is clicked", async () => {
		(checkActiveSessionByType as jest.Mock).mockResolvedValue(false);

		const scene = new ArenaLobbyScene() as unknown as ArenaLobbyScene;
		const mockContainer = { setVisible: jest.fn().mockReturnThis(), setDepth: jest.fn().mockReturnThis() };
		scene.add = {
			rectangle: jest.fn(() => ({ setOrigin: jest.fn().mockReturnThis() })),
			text: jest.fn(() => ({ setOrigin: jest.fn().mockReturnThis() })),
			container: jest.fn(() => mockContainer),
		} as unknown as typeof scene.add;
		scene.scene = { start: jest.fn() } as unknown as typeof scene.scene;
		scene.refreshProfile = jest.fn();

		scene.create();

		await createdButtons[1]();

		expect(checkActiveSessionByType).toHaveBeenCalledWith("ranked");
		expect(scene.scene.start).toHaveBeenCalledWith(SCENE_KEYS.CRYSTAL_SELECTION, {
			isMultiplayer: true,
			multiplayerQueueType: "ranked",
		});
	});

	it("opens ranking and requests first page", async () => {
		(getTopRankedPlayers as jest.Mock).mockResolvedValue({
			players: [
				{ id: "p1", username: "Alpha", rating: 1400, matches_played: 20 },
				{ id: "p2", username: "Bravo", rating: 1300, matches_played: 18 },
			],
			page: 1,
			hasNextPage: true,
		});

		const scene = new ArenaLobbyScene() as unknown as ArenaLobbyScene;
		const mockContainer = {
			setVisible: jest.fn().mockReturnThis(),
			setDepth: jest.fn().mockReturnThis(),
			destroy: jest.fn(),
		};
		scene.add = {
			rectangle: jest.fn(() => ({ setOrigin: jest.fn().mockReturnThis() })),
			text: jest.fn(() => ({
				setOrigin: jest.fn().mockReturnThis(),
				setText: jest.fn().mockReturnThis(),
				text: "",
			})),
			container: jest.fn(() => mockContainer),
		} as unknown as typeof scene.add;
		scene.scene = { start: jest.fn() } as unknown as typeof scene.scene;
		scene.refreshProfile = jest.fn();

		scene.create();

		await createdButtons[2]();

		expect(getTopRankedPlayers).toHaveBeenCalledWith(1, 10);
	});
});
