import { ArenaLoginScene } from "@Scenes/ArenaLobby/ArenaLoginScene";
import { SCENE_KEYS } from "@Constants/constants";
import { handleGuestAccountUpgrade } from "@Multiplayer/MultiplayerManager";

jest.mock("phaser", () => ({
	__esModule: true,
	default: {
		Scene: class Scene {},
	},
}));

jest.mock("@Constants/constants", () => ({
	SCREEN_WIDTH: 1920,
	SCREEN_HEIGHT: 1080,
	MIDDLE_SCREEN: { x: 960, y: 540 },
	SCENE_KEYS: {
		ARENA_LOBBY: "ArenaLobbyScene",
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
	createUIButton: jest.fn(() => ({
		container: {
			setVisible: jest.fn().mockReturnThis(),
		},
		disable: jest.fn(),
		enable: jest.fn(),
	})),
}));

jest.mock("@Components/Modal", () => ({
	createModal: jest.fn(),
}));

jest.mock("@Multiplayer/MultiplayerManager", () => ({
	handleAuthLogin: jest.fn(),
	handleAuthRegister: jest.fn(),
	handleAuthGuest: jest.fn(),
	handleGuestAccountUpgrade: jest.fn(),
	handleSteamAuth: jest.fn(),
}));

jest.mock("@Models/Geometry", () => ({
	vec2: jest.fn((x: number, y: number) => ({ x, y })),
}));

jest.mock("@Models/State", () => ({
	setCurrentScene: jest.fn(),
}));

jest.mock("@Utils/environment", () => ({
	isElectron: jest.fn(() => false),
}));

jest.mock("@Utils/Logger", () => ({
	createLogger: jest.fn(() => ({
		error: jest.fn(),
		debug: jest.fn(),
		info: jest.fn(),
		warn: jest.fn(),
	})),
}));

describe("ArenaLoginScene guest upgrade flow", () => {
	beforeEach(() => {
		localStorage.clear();
		jest.clearAllMocks();
	});

	it("routes guest account conversion through the upgrade handler", async () => {
		(handleGuestAccountUpgrade as jest.Mock).mockResolvedValue({
			id: "guest-user-id",
			username: "UpgradedGuest",
			rating: 1000,
			matches_played: 0,
		});

		const scene = new ArenaLoginScene();
		scene.init({
			mode: "convertGuestAccount",
			returnSceneKey: SCENE_KEYS.ARENA_LOBBY,
		});

		const mockFormElement = {
			getChildByName: jest.fn((name: string) => {
				if (name === "email") return { value: "guest@example.com" };
				if (name === "password") return { value: "password123" };
				if (name === "username") return { value: "UpgradedGuest" };
				if (name === "confirm_password") return { value: "password123" };
				return null;
			}),
			node: {
				querySelectorAll: jest.fn(() => []),
			},
		};

		(scene as unknown as { formElement: unknown }).formElement = mockFormElement;
		(scene as unknown as { showModal: (title: string, message: string, onClose?: () => void) => void }).showModal =
			jest.fn((_title: string, _message: string, onClose?: () => void) => onClose?.());
		(scene as unknown as { scene: { start: jest.Mock } }).scene = {
			start: jest.fn(),
		};

		await scene.handleRegister();

		expect(handleGuestAccountUpgrade).toHaveBeenCalledWith(
			"guest@example.com",
			"password123",
			"UpgradedGuest"
		);
		expect(localStorage.getItem("mana_player_id")).toBe("guest-user-id");
		expect(
			(scene as unknown as { scene: { start: jest.Mock } }).scene.start
		).toHaveBeenCalledWith(SCENE_KEYS.ARENA_LOBBY);
	});
});
