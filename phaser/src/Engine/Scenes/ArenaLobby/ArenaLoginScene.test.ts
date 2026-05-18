import { ArenaLoginScene } from "@Scenes/ArenaLobby/ArenaLoginScene";
import { SCENE_KEYS } from "@Constants/constants";
import {
	getCurrentAccountState,
	handlePasswordResetRequest,
	handleGuestAccountUpgrade,
	handleRegisteredAccountUpdate,
} from "@Multiplayer/MultiplayerManager";
import { CloudsBackground } from "@Components/cloudBackground/CloudsBackground";

const createdButtons: Array<{
	label: string;
	position: { x: number; y: number };
	width?: number;
	onClick: () => void;
}> = [];

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
	createUIButton: jest.fn((label: string, position: { x: number; y: number }, onClick: () => void, width?: number) => {
		createdButtons.push({ label, position, width, onClick });
		return {
			container: {
				setVisible: jest.fn().mockReturnThis(),
			},
			disable: jest.fn(),
			enable: jest.fn(),
		};
	}),
}));

jest.mock("@Components/cloudBackground/CloudsBackground", () => ({
	CloudsBackground: jest.fn(() => ({
		destroy: jest.fn(),
	})),
}));

jest.mock("@Components/Modal", () => ({
	createModal: jest.fn(),
}));

jest.mock("@i18n/i18n", () => ({
	t: jest.fn((key: string) => key),
}));

jest.mock("@Multiplayer/MultiplayerManager", () => ({
	handleAuthLogin: jest.fn(),
	handleAuthRegister: jest.fn(),
	handleAuthGuest: jest.fn(),
	handlePasswordResetRequest: jest.fn(),
	handleGuestAccountUpgrade: jest.fn(),
	handleRegisteredAccountUpdate: jest.fn(),
	getCurrentAccountState: jest.fn(),
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
		createdButtons.length = 0;
		jest.clearAllMocks();
	});

	it("renders the login form with labeled inputs and split secondary actions", () => {
		const scene = new ArenaLoginScene();
		const forgotPasswordButton = { addEventListener: jest.fn(), disabled: false };
		const createdDomElement = {
			destroy: jest.fn(),
			setVisible: jest.fn().mockReturnThis(),
			setOrigin: jest.fn().mockReturnThis(),
			getChildByName: jest.fn(),
			node: {
				querySelector: jest.fn(() => forgotPasswordButton),
				querySelectorAll: jest.fn(() => []),
			},
		};
		const createFromHTML = jest.fn(() => createdDomElement);
		const mockContainer = {
			add: jest.fn(),
			removeAll: jest.fn(),
			setVisible: jest.fn().mockReturnThis(),
			setDepth: jest.fn().mockReturnThis(),
		};

		scene.add = {
			rectangle: jest.fn(() => ({
				setOrigin: jest.fn().mockReturnThis(),
				setStrokeStyle: jest.fn().mockReturnThis(),
			})),
			container: jest.fn(() => mockContainer),
			text: jest.fn(() => ({
				setOrigin: jest.fn().mockReturnThis(),
			})),
			dom: jest.fn(() => ({
				createFromHTML,
			})),
		} as unknown as typeof scene.add;
		scene.scene = { start: jest.fn() } as unknown as typeof scene.scene;

		scene.create();

		const firstCreateCall = createFromHTML.mock.calls[0] as unknown[] | undefined;
		const formHtml = String(firstCreateCall?.[0] ?? "");
		expect(CloudsBackground).toHaveBeenCalledWith({
			customColors: expect.any(Object),
			timeScale: 0.9,
		});
		expect(formHtml).toContain("Email");
		expect(formHtml).toContain('placeholder="Enter email"');
		expect(formHtml).toContain("Password");
		expect(formHtml).toContain('placeholder="Enter password"');
		expect(formHtml).toContain("Forgot Password");
		expect(forgotPasswordButton.addEventListener).toHaveBeenCalledWith("click", expect.any(Function));

		expect(createdButtons.map(button => button.label)).toEqual(["Login", "Register", "Play as Guest", "ui.menu.back"]);
		expect(createdButtons.map(button => button.width)).toEqual([404, 194, 194, 404]);
		expect(createdButtons[0].position.y).toBe(470);
		expect(createdButtons[1].position.y).toBe(createdButtons[2].position.y);
		expect(createdButtons[1].position.x).toBeLessThan(createdButtons[2].position.x);
	});

	it("switches to the forgot password form when the link is clicked", () => {
		const scene = new ArenaLoginScene();
		let forgotPasswordHandler: ((event: { preventDefault: () => void }) => void) | undefined;
		const forgotPasswordButton = {
			addEventListener: jest.fn((_event: string, handler: (event: { preventDefault: () => void }) => void) => {
				forgotPasswordHandler = handler;
			}),
			disabled: false,
		};
		const createdDomElement = {
			destroy: jest.fn(),
			setVisible: jest.fn().mockReturnThis(),
			setOrigin: jest.fn().mockReturnThis(),
			getChildByName: jest.fn(),
			node: {
				querySelector: jest.fn(() => forgotPasswordButton),
				querySelectorAll: jest.fn(() => []),
			},
		};
		const createFromHTML = jest.fn(() => createdDomElement);
		const mockContainer = {
			add: jest.fn(),
			removeAll: jest.fn(),
			setVisible: jest.fn().mockReturnThis(),
			setDepth: jest.fn().mockReturnThis(),
		};

		scene.add = {
			rectangle: jest.fn(() => ({
				setOrigin: jest.fn().mockReturnThis(),
				setStrokeStyle: jest.fn().mockReturnThis(),
			})),
			container: jest.fn(() => mockContainer),
			text: jest.fn(() => ({
				setOrigin: jest.fn().mockReturnThis(),
			})),
			dom: jest.fn(() => ({
				createFromHTML,
			})),
		} as unknown as typeof scene.add;
		scene.scene = { start: jest.fn() } as unknown as typeof scene.scene;

		scene.create();
		forgotPasswordHandler?.({ preventDefault: jest.fn() });

		const forgotPasswordFormHtml = String((createFromHTML.mock.calls[1] as unknown[] | undefined)?.[0] ?? "");
		expect(forgotPasswordFormHtml).toContain("Email");
		expect(forgotPasswordFormHtml).toContain('placeholder="Enter email"');
		expect(createdButtons.slice(-2).map(button => button.label)).toEqual(["Cancel", "Submit"]);
		expect(createdButtons.slice(-2).map(button => button.width)).toEqual([194, 194]);
		expect(createdButtons[createdButtons.length - 2].position.y).toBe(470);
		expect(createdButtons[createdButtons.length - 2].position.x).toBeLessThan(
			createdButtons[createdButtons.length - 1].position.x
		);
	});

	it("submits forgot password requests through the auth manager", async () => {
		(handlePasswordResetRequest as jest.Mock).mockResolvedValue(undefined);

		const scene = new ArenaLoginScene();
		const mockFormElement = {
			getChildByName: jest.fn((name: string) => {
				if (name === "email") return { value: "player@example.com" };
				return null;
			}),
			node: {
				querySelectorAll: jest.fn(() => []),
			},
		};

		(scene as unknown as { formElement: unknown }).formElement = mockFormElement;
		(scene as unknown as { isForgotPasswordMode: boolean }).isForgotPasswordMode = true;
		(scene as unknown as { showModal: (title: string, message: string, onClose?: () => void) => void }).showModal =
			jest.fn((_title: string, _message: string, onClose?: () => void) => onClose?.());
		const setLoading = jest.fn();
		const renderForm = jest.fn();
		(scene as unknown as { setLoading: jest.Mock }).setLoading = setLoading;
		(scene as unknown as { renderForm: jest.Mock }).renderForm = renderForm;

		await (
			scene as unknown as {
				handleForgotPasswordSubmit: () => Promise<void>;
			}
		).handleForgotPasswordSubmit();

		expect(handlePasswordResetRequest).toHaveBeenCalledWith("player@example.com");
		expect(setLoading.mock.calls).toEqual([[true], [false]]);
		expect(renderForm).toHaveBeenCalled();
		expect((scene as unknown as { isForgotPasswordMode: boolean }).isForgotPasswordMode).toBe(false);
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
		const setLoading = jest.fn();
		(scene as unknown as { setLoading: jest.Mock }).setLoading = setLoading;
		(scene as unknown as { scene: { start: jest.Mock } }).scene = {
			start: jest.fn(),
		};

		await scene.handleRegister();

		expect(handleGuestAccountUpgrade).toHaveBeenCalledWith(
			"guest@example.com",
			"password123",
			"UpgradedGuest"
		);
		expect(setLoading.mock.calls).toEqual([[true], [false]]);
		expect(localStorage.getItem("mana_player_id")).toBe("guest-user-id");
		expect(
			(scene as unknown as { scene: { start: jest.Mock } }).scene.start
		).toHaveBeenCalledWith(SCENE_KEYS.ARENA_LOBBY);
	});

	it("routes registered account edits through the update handler", async () => {
		(handleRegisteredAccountUpdate as jest.Mock).mockResolvedValue({
			id: "registered-user-id",
			username: "RenamedUser",
			rating: 1200,
			matches_played: 4,
		});
		(getCurrentAccountState as jest.Mock).mockResolvedValue({
			isGuest: false,
			username: "OriginalUser",
			email: "original@example.com",
		});

		const scene = new ArenaLoginScene();
		scene.init({
			mode: "manageAccount",
			returnSceneKey: SCENE_KEYS.ARENA_LOBBY,
		});
		const mockFormElement = {
			getChildByName: jest.fn((name: string) => {
				if (name === "username") return { value: "RenamedUser" };
				return null;
			}),
			node: {
				querySelectorAll: jest.fn(() => []),
			},
		};

		(scene as unknown as { formElement: unknown }).formElement = mockFormElement;
		(scene as unknown as { showModal: (title: string, message: string, onClose?: () => void) => void }).showModal =
			jest.fn((_title: string, _message: string, onClose?: () => void) => onClose?.());
		const setLoading = jest.fn();
		(scene as unknown as { setLoading: jest.Mock }).setLoading = setLoading;
		(scene as unknown as { scene: { start: jest.Mock } }).scene = {
			start: jest.fn(),
		};

		await scene.handleRegister();

		expect(handleRegisteredAccountUpdate).toHaveBeenCalledWith("RenamedUser");
		expect(setLoading.mock.calls).toEqual([[true], [false]]);
		expect(
			(scene as unknown as { scene: { start: jest.Mock } }).scene.start
		).toHaveBeenCalledWith(SCENE_KEYS.ARENA_LOBBY);
	});
});
