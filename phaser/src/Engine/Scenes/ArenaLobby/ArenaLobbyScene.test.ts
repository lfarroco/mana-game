import { ArenaLobbyScene } from "@Scenes/ArenaLobby/ArenaLobbyScene";
import { SCENE_KEYS } from "@Constants/constants";
import {
	checkActiveSessionByType,
	enableMultiplayer,
	getCurrentAccountState,
	getPlayerProfile,
	getTopRankedPlayers,
} from "@Multiplayer/MultiplayerManager";

const createdButtons: Array<() => void | Promise<void>> = [];
const createdButtonLabels: string[] = [];
type MockButton = {
	container: {
		destroy: jest.Mock;
		setDepth: jest.Mock;
		setVisible: jest.Mock;
	};
	disable: jest.Mock;
	enable: jest.Mock;
};
const buttonInstances: MockButton[] = [];

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
	createUIButton: jest.fn((label: string, _pos: unknown, onClick: () => void | Promise<void>) => {
		createdButtons.push(onClick);
		createdButtonLabels.push(label);
		const button = {
			container: {
				destroy: jest.fn(),
				setDepth: jest.fn().mockReturnThis(),
				setVisible: jest.fn().mockReturnThis(),
			},
			disable: jest.fn(),
			enable: jest.fn(),
		};
		buttonInstances.push(button);
		return button;
	}),
}));

jest.mock("@Components/Modal", () => ({
	createModal: jest.fn(() => ({
		container: {
			add: jest.fn(),
			destroy: jest.fn(),
		},
		close: jest.fn().mockResolvedValue(undefined),
		onClose: Promise.resolve(),
		panel: {},
	})),
}));

jest.mock("@Multiplayer/MultiplayerManager", () => ({
	checkActiveSessionByType: jest.fn(),
	enableMultiplayer: jest.fn(),
	logout: jest.fn(),
	getPlayerProfile: jest.fn(),
	getCurrentAccountState: jest.fn(),
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

const createMockRectangle = () => ({
	setOrigin: jest.fn().mockReturnThis(),
	setStrokeStyle: jest.fn().mockReturnThis(),
	setVisible: jest.fn().mockReturnThis(),
	setFillStyle: jest.fn().mockReturnThis(),
});

const createMockText = () => ({
	setOrigin: jest.fn().mockReturnThis(),
	setText: jest.fn().mockReturnThis(),
	setVisible: jest.fn().mockReturnThis(),
	setColor: jest.fn().mockReturnThis(),
	text: "",
});

describe("ArenaLobbyScene", () => {
	beforeEach(() => {
		createdButtons.length = 0;
		createdButtonLabels.length = 0;
		buttonInstances.length = 0;
		jest.clearAllMocks();
	});

	it("starts battleground in multiplayer mode when active session exists", async () => {
		(checkActiveSessionByType as jest.Mock).mockResolvedValue(true);
		(enableMultiplayer as jest.Mock).mockResolvedValue(undefined);

		const scene = new ArenaLobbyScene() as unknown as ArenaLobbyScene;
		const mockContainer = { setVisible: jest.fn().mockReturnThis(), setDepth: jest.fn().mockReturnThis() };
		scene.add = {
			rectangle: jest.fn(() => createMockRectangle()),
			text: jest.fn(() => createMockText()),
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
			rectangle: jest.fn(() => createMockRectangle()),
			text: jest.fn(() => createMockText()),
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
			rectangle: jest.fn(() => createMockRectangle()),
			text: jest.fn(() => createMockText()),
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
			rectangle: jest.fn(() => createMockRectangle()),
			text: jest.fn(() => createMockText()),
			container: jest.fn(() => mockContainer),
		} as unknown as typeof scene.add;
		scene.scene = { start: jest.fn() } as unknown as typeof scene.scene;
		scene.refreshProfile = jest.fn();

		scene.create();

		await createdButtons[2]();

		expect(getTopRankedPlayers).toHaveBeenCalledWith(1, 10);
		expect(buttonInstances[6].container.setVisible).toHaveBeenCalledWith(false);
		expect(buttonInstances[6].disable).toHaveBeenCalled();
		expect(buttonInstances[7].container.setVisible).toHaveBeenCalledWith(true);
		expect(buttonInstances[7].enable).toHaveBeenCalled();
	});

	it("hides next button on the last ranking page", async () => {
		(getTopRankedPlayers as jest.Mock).mockResolvedValue({
			players: [
				{ id: "p1", username: "Alpha", rating: 1400, matches_played: 20 },
			],
			page: 3,
			hasNextPage: false,
		});

		const scene = new ArenaLobbyScene() as unknown as ArenaLobbyScene;
		const mockContainer = {
			setVisible: jest.fn().mockReturnThis(),
			setDepth: jest.fn().mockReturnThis(),
			destroy: jest.fn(),
		};
		scene.add = {
			rectangle: jest.fn(() => createMockRectangle()),
			text: jest.fn(() => createMockText()),
			container: jest.fn(() => mockContainer),
		} as unknown as typeof scene.add;
		scene.scene = { start: jest.fn() } as unknown as typeof scene.scene;
		scene.refreshProfile = jest.fn();

		scene.create();

		await createdButtons[2]();

		expect(buttonInstances[6].container.setVisible).toHaveBeenCalledWith(true);
		expect(buttonInstances[6].enable).toHaveBeenCalled();
		expect(buttonInstances[7].container.setVisible).toHaveBeenCalledWith(false);
		expect(buttonInstances[7].disable).toHaveBeenCalled();
	});

	it("shows the account button for guest players and routes to conversion", async () => {
		localStorage.setItem("mana_player_id", "guest-user-id");
		(getPlayerProfile as jest.Mock).mockResolvedValue({
			id: "guest-user-id",
			username: "Guest",
			rating: 1000,
			matches_played: 0,
		});
		(getCurrentAccountState as jest.Mock).mockResolvedValue({
			isGuest: true,
		});

		const scene = new ArenaLobbyScene() as unknown as ArenaLobbyScene;
		const mockContainer = { setVisible: jest.fn().mockReturnThis(), setDepth: jest.fn().mockReturnThis() };
		scene.add = {
			rectangle: jest.fn(() => createMockRectangle()),
			text: jest.fn(() => createMockText()),
			container: jest.fn(() => mockContainer),
		} as unknown as typeof scene.add;
		scene.scene = { start: jest.fn() } as unknown as typeof scene.scene;

		scene.create();
		await scene.refreshProfile();

		expect(createdButtonLabels).toContain("Account");
		expect(buttonInstances[3].container.setVisible).toHaveBeenCalledWith(true);

		await createdButtons[3]();

		expect(scene.scene.start).toHaveBeenCalledWith(SCENE_KEYS.ARENA_LOGIN, {
			mode: "convertGuestAccount",
			returnSceneKey: SCENE_KEYS.ARENA_LOBBY,
		});
	});

	it("shows the account button for registered players and routes to account management", async () => {
		localStorage.setItem("mana_player_id", "registered-user-id");
		(getPlayerProfile as jest.Mock).mockResolvedValue({
			id: "registered-user-id",
			username: "RegisteredUser",
			rating: 1450,
			matches_played: 12,
		});
		(getCurrentAccountState as jest.Mock).mockResolvedValue({
			isGuest: false,
			username: "RegisteredUser",
			email: "registered@example.com",
		});

		const scene = new ArenaLobbyScene() as unknown as ArenaLobbyScene;
		const mockContainer = { setVisible: jest.fn().mockReturnThis(), setDepth: jest.fn().mockReturnThis() };
		scene.add = {
			rectangle: jest.fn(() => createMockRectangle()),
			text: jest.fn(() => createMockText()),
			container: jest.fn(() => mockContainer),
		} as unknown as typeof scene.add;
		scene.scene = { start: jest.fn() } as unknown as typeof scene.scene;

		scene.create();
		await scene.refreshProfile();

		expect(buttonInstances[3].container.setVisible).toHaveBeenCalledWith(true);

		await createdButtons[3]();

		expect(scene.scene.start).toHaveBeenCalledWith(SCENE_KEYS.ARENA_LOGIN, {
			mode: "manageAccount",
			returnSceneKey: SCENE_KEYS.ARENA_LOBBY,
		});
	});
});
