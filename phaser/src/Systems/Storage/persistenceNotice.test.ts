/**
 * The "your run won't be saved" notice: shown exactly once, on the active
 * screen, and never in a way that can break the game.
 */

import { GameEvent } from "../../Events";
import * as SessionManager from "../../SessionManager";
import { init, resetNoticeForTests } from "./persistenceNotice";

const mockText = {
	setOrigin: jest.fn().mockReturnThis(),
	setDepth: jest.fn().mockReturnThis(),
	setAlpha: jest.fn().mockReturnThis(),
	destroy: jest.fn(),
};

jest.mock("@Env", () => ({
	env: {
		scene: {
			add: { text: jest.fn(() => mockText) },
		},
	},
}));

// The notice animates with the hang-proof helpers; resolve them instantly.
jest.mock("@Utils/animation", () => ({
	tween: jest.fn(async () => {}),
	delay: jest.fn(async () => {}),
}));

jest.mock("@i18n/i18n", () => ({ t: (key: string) => key }));

import { env } from "@Env";

const sceneAddText = (env as unknown as { scene: { add: { text: jest.Mock } } }).scene.add.text;

/** Flush the promise chain the notice schedules (tween → delay → tween). */
const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

describe("persistenceNotice", () => {
	beforeEach(() => {
		jest.clearAllMocks();
		resetNoticeForTests();
		SessionManager.resetPersistenceStateForTests();
	});

	it("shows the notice when the session store reports a failure", async () => {
		const disposers = init();

		await GameEvent.persistenceUnavailable.emit({ operation: "persist", detail: "QuotaExceeded" });
		await flush();

		expect(sceneAddText).toHaveBeenCalledTimes(1);
		expect(sceneAddText.mock.calls[0][2]).toBe("storage.notSaved");

		disposers.forEach((dispose) => dispose());
	});

	it("shows it only once, however many failures arrive", async () => {
		const disposers = init();

		await GameEvent.persistenceUnavailable.emit({ operation: "persist" });
		await GameEvent.persistenceUnavailable.emit({ operation: "remove" });
		await flush();

		expect(sceneAddText).toHaveBeenCalledTimes(1);

		disposers.forEach((dispose) => dispose());
	});

	it("surfaces a failure that happened before it was wired (import-time load)", async () => {
		// The session store can fail while loading the save, before BootScene
		// calls init() — the notice picks that up on the next screen.
		const warn = jest.spyOn(console, "warn").mockImplementation(() => {});
		const setItem = jest.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
			throw new Error("SecurityError");
		});
		SessionManager.createSession(SessionManager.LOCAL_PLAYER_ID, "critical_crystal");
		setItem.mockRestore();

		const disposers = init();
		await GameEvent.screenShown.emit({ name: "title" });
		await flush();

		expect(sceneAddText).toHaveBeenCalledTimes(1);

		disposers.forEach((dispose) => dispose());
		warn.mockRestore();
	});

	it("does nothing on screen changes when persistence is healthy", async () => {
		const disposers = init();

		await GameEvent.screenShown.emit({ name: "title" });
		await GameEvent.screenShown.emit({ name: "battleground" });
		await flush();

		expect(sceneAddText).not.toHaveBeenCalled();

		disposers.forEach((dispose) => dispose());
	});
});
