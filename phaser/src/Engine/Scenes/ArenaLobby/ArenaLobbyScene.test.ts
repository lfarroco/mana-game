import { ArenaLobbyScene } from "@Scenes/ArenaLobby/ArenaLobbyScene";
import { SCENE_KEYS } from "@Constants/constants";
import { createModal } from "@Components/Modal";
import {
	checkActiveSessionByType,
	enableMultiplayer,
	getCurrentAccountState,
	getPlayerProfile,
	getTopRankedPlayers,
} from "@Multiplayer/MultiplayerManager";

const createdButtons: Array<() => void | Promise<void>> = [];
const createdButtonLabels: string[] = [];
const createdButtonPositions: Array<{ x: number; y: number }> = [];
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
	defaultTextConfig: {
		fontSize: "20px",
		color: "white",
		fontFamily: "Arimo",
		stroke: "black",
		strokeThickness: 4,
		align: "center",
	},
	titleTextConfig: {
		fontSize: "28px",
		color: "white",
		fontFamily: "Arimo",
		stroke: "black",
		strokeThickness: 14,
		fontStyle: "bold",
		align: "center",
	},
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
		setVisible: jest.fn().mockReturnThis(),
		setColor: jest.fn().mockReturnThis(),
	})),
}));

jest.mock("@Components/UIButton", () => ({
	createUIButton: jest.fn((
		label: string,
		pos: { x: number; y: number },
		onClick: () => void | Promise<void>,
		_width?: number
	) => {
		createdButtons.push(onClick);
		createdButtonLabels.push(label);
		createdButtonPositions.push(pos);
		const button = {
			container: {
				destroy: jest.fn(),
				scene: {},
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

jest.mock("@Components/cloudBackground/CloudsBackground", () => ({
	CloudsBackground: jest.fn(() => ({
		destroy: jest.fn(),
	})),
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
		createdButtonPositions.length = 0;
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

	it("sizes the lobby panel to contain the action buttons", () => {
		const rectangle = jest.fn(() => createMockRectangle());
		const scene = new ArenaLobbyScene() as unknown as ArenaLobbyScene;
		const mockContainer = { setVisible: jest.fn().mockReturnThis(), setDepth: jest.fn().mockReturnThis() };
		scene.add = {
			rectangle,
			text: jest.fn(() => createMockText()),
			container: jest.fn(() => mockContainer),
		} as unknown as typeof scene.add;
		scene.scene = { start: jest.fn() } as unknown as typeof scene.scene;
		scene.refreshProfile = jest.fn();

		scene.create();

		const rectangleCalls = rectangle.mock.calls as unknown as Array<[number, number, number, number]>;
		const lobbyCardCall = rectangleCalls.find(
			([x, y, width, height]) => x === 960 && y === 530 && width === 560 && height === 760
		);
		expect(lobbyCardCall).toBeDefined();

		const lobbyButtonPositions = createdButtonPositions.slice(0, 5);
		const topMostButtonY = Math.min(...lobbyButtonPositions.map(({ y }) => y));
		const bottomMostButtonEdge = Math.max(...lobbyButtonPositions.map(({ y }) => y + 30));
		const cardTop = 530 - 760 / 2;
		const cardBottom = 530 + 760 / 2;

		expect(topMostButtonY - cardTop).toBeLessThanOrEqual(340);
		expect(bottomMostButtonEdge).toBeLessThanOrEqual(cardBottom);
	});

	it("renders lobby profile values without input-style boxes", () => {
		const rectangle = jest.fn(() => createMockRectangle());
		const scene = new ArenaLobbyScene() as unknown as ArenaLobbyScene;
		const mockContainer = { setVisible: jest.fn().mockReturnThis(), setDepth: jest.fn().mockReturnThis() };
		scene.add = {
			rectangle,
			text: jest.fn(() => createMockText()),
			container: jest.fn(() => mockContainer),
		} as unknown as typeof scene.add;
		scene.scene = { start: jest.fn() } as unknown as typeof scene.scene;
		scene.refreshProfile = jest.fn();

		scene.create();

		const rectangleCalls = rectangle.mock.calls as unknown as Array<[number, number, number, number]>;
		const fieldBoxCalls = rectangleCalls.filter(([, , width, height]) => width === 404 && height === 58);

		expect(fieldBoxCalls).toHaveLength(0);
	});

	it("does not render the old lobby accent line above the profile", () => {
		const rectangle = jest.fn(() => createMockRectangle());
		const scene = new ArenaLobbyScene() as unknown as ArenaLobbyScene;
		const mockContainer = { setVisible: jest.fn().mockReturnThis(), setDepth: jest.fn().mockReturnThis() };
		scene.add = {
			rectangle,
			text: jest.fn(() => createMockText()),
			container: jest.fn(() => mockContainer),
		} as unknown as typeof scene.add;
		scene.scene = { start: jest.fn() } as unknown as typeof scene.scene;
		scene.refreshProfile = jest.fn();

		scene.create();

		const rectangleCalls = rectangle.mock.calls as unknown as Array<[number, number, number, number]>;
		const accentLineCalls = rectangleCalls.filter(([, , width, height]) => width === 220 && height === 4);

		expect(accentLineCalls).toHaveLength(0);
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

	it("uses a taller leaderboard modal so all 10 rows fit vertically", async () => {
		(getTopRankedPlayers as jest.Mock).mockResolvedValue({
			players: Array.from({ length: 10 }, (_, index) => ({
				id: `p${index + 1}`,
				username: `Player${index + 1}`,
				rating: 1500 - index * 10,
				matches_played: 20 - index,
			})),
			page: 1,
			hasNextPage: false,
		});

		const rectangle = jest.fn(() => createMockRectangle());
		const scene = new ArenaLobbyScene() as unknown as ArenaLobbyScene;
		const mockContainer = {
			setVisible: jest.fn().mockReturnThis(),
			setDepth: jest.fn().mockReturnThis(),
			destroy: jest.fn(),
		};
		scene.add = {
			rectangle,
			text: jest.fn(() => createMockText()),
			container: jest.fn(() => mockContainer),
		} as unknown as typeof scene.add;
		scene.scene = { start: jest.fn() } as unknown as typeof scene.scene;
		scene.refreshProfile = jest.fn();

		scene.create();

		await createdButtons[2]();

		expect(createModal).toHaveBeenCalledWith(
			expect.objectContaining({
				height: 940,
			})
		);

		const rectangleCalls = rectangle.mock.calls as unknown as Array<[number, number, number, number]>;
		const leaderboardAccentCall = rectangleCalls.find(
			([x, y, width, height]) => x === 0 && y === -270 && width === 280 && height === 4
		);
		const rankingHeaderCall = rectangleCalls.find(
			([x, y, width, height]) => x === 0 && y === -290 && width === 920 && height === 44
		);
		const rankingTableCardCall = rectangleCalls.find(
			([x, y, width, height]) => x === 0 && y === -90 && width === 960 && height === 520
		);

		expect(leaderboardAccentCall).toBeUndefined();
		expect(rankingHeaderCall).toBeDefined();
		expect(rankingTableCardCall).toBeDefined();
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

		expect(createdButtonLabels).toContain("ACCOUNT");
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

	it("resets stale button references when the lobby scene is created again", () => {
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
		const firstCreateButtons = buttonInstances.slice();

		scene.create();

		firstCreateButtons.forEach(button => {
			expect(button.disable).toHaveBeenCalledTimes(1);
		});
	});
});
