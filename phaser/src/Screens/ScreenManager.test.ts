import { createScreenManager, getScreenManager, resetScreenManager, setScreenManager, ScreenModule } from "./ScreenManager";
import { GameEvent } from "../Events";

// ---------------------------------------------------------------------------
// Mocks — ScreenManager depends on env (Phaser scene) and GameEvent.
// ---------------------------------------------------------------------------

jest.mock("@Env", () => ({
	env: {
		scene: {
			input: {
				enabled: true,
				setDefaultCursor: jest.fn(),
			},
			children: { removeAll: jest.fn() },
			tweens: { killAll: jest.fn() },
			time: { removeAllEvents: jest.fn() },
		},
		fadeOut: jest.fn(async () => { }),
		fadeIn: jest.fn(async () => { }),
	},
}));

// GameEvent is a real module (no Phaser deps) — clear listeners between tests.
beforeEach(() => {
	GameEvent.screenShown.clear();
	GameEvent.screenHidden.clear();
	resetScreenManager();
});

// ---------------------------------------------------------------------------
// Fakes
// ---------------------------------------------------------------------------

const makeScreen = (name: string, overrides?: Partial<ScreenModule>): ScreenModule => ({
	name,
	init: jest.fn(),
	create: jest.fn(async () => { }),
	destroy: jest.fn(),
	...overrides,
});

const makeManager = (overrides?: {
	title?: Partial<ScreenModule>;
	options?: Partial<ScreenModule>;
}) => createScreenManager({
	screens: {
		title: makeScreen("title", overrides?.title),
		battleground: makeScreen("battleground"),
		crystals: makeScreen("crystals"),
		options: makeScreen("options", overrides?.options),
	},
});

describe("createScreenManager", () => {
	it("navigates to a screen and emits screenShown", async () => {
		const manager = makeManager();
		const shown = jest.fn();
		GameEvent.screenShown.listen(shown);

		await manager.go("title");

		expect(shown).toHaveBeenCalledWith({ name: "title" });
		expect(manager.current()?.name).toBe("title");
	});

	it("emits screenHidden and destroys the outgoing screen on transition", async () => {
		const title = makeScreen("title");
		const crystals = makeScreen("crystals");
		const manager = createScreenManager({
			screens: {
				title,
				battleground: makeScreen("battleground"),
				crystals,
				options: makeScreen("options"),
			},
		});
		const hidden = jest.fn();
		GameEvent.screenHidden.listen(hidden);

		await manager.go("title");
		await manager.go("crystals");

		expect(hidden).toHaveBeenCalledWith({ name: "title" });
		expect(title.destroy).toHaveBeenCalledTimes(1);
		expect(manager.current()?.name).toBe("crystals");
	});

	it("skips navigation when already on the target screen", async () => {
		const title = makeScreen("title");
		const manager = createScreenManager({
			screens: {
				title,
				battleground: makeScreen("battleground"),
				crystals: makeScreen("crystals"),
				options: makeScreen("options"),
			},
		});

		await manager.go("title");
		await manager.go("title");

		expect(title.create).toHaveBeenCalledTimes(1);
	});

	it("coalesces rapid navigations — only the latest target runs", async () => {
		const title = makeScreen("title");
		const crystals = makeScreen("crystals");
		const manager = createScreenManager({
			screens: {
				title,
				battleground: makeScreen("battleground"),
				crystals,
				options: makeScreen("options"),
			},
		});

		// Fire three navigations back-to-back; the middle one should be skipped.
		const p1 = manager.go("title");
		const p2 = manager.go("crystals");
		const p3 = manager.go("title");

		await Promise.all([p1, p2, p3]);

		expect(manager.current()?.name).toBe("title");
		expect(crystals.create).not.toHaveBeenCalled();
	});

	it("deep-links to a phase when the route carries params", async () => {
		const go = jest.fn(async () => { });
		const currentPhase = jest.fn(() => "audio");
		const manager = makeManager({
			options: { go, currentPhase },
		});

		await manager.go("options", { tab: "graphics" });

		expect(go).toHaveBeenCalledWith("graphics");
	});

	it("skips the deep-link when the screen is already on the target phase", async () => {
		const go = jest.fn(async () => { });
		const currentPhase = jest.fn(() => "graphics");
		const manager = makeManager({
			options: { go, currentPhase },
		});

		await manager.go("options", { tab: "graphics" });

		expect(go).not.toHaveBeenCalled();
	});

	it("does not deep-link when the screen has no phase support", async () => {
		const manager = makeManager(); // options has no go/currentPhase
		await manager.go("options", { tab: "graphics" });
		expect(manager.current()?.name).toBe("options");
	});
});

describe("ScreenManager singleton", () => {
	it("getScreenManager() throws before setScreenManager()", () => {
		expect(() => getScreenManager()).toThrow("ScreenManager not initialized");
	});

	it("setScreenManager() registers the manager for getScreenManager()", () => {
		const manager = makeManager();
		setScreenManager(manager);
		expect(getScreenManager()).toBe(manager);
	});
});