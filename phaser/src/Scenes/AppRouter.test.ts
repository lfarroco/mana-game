/**
 * AppRouter tests — the navigation core that replaced the ScreenManager.
 *
 * These focus on the failure mode players reported: navigation must always
 * proceed even when a screen transition (the camera fade) never completes, and
 * rapid requests must coalesce instead of interleaving.
 */

import { env } from "@Env";
import { FADE_MS, go, registerLegacyNavigator, type LegacyNavigator } from "./AppRouter";

jest.mock("@Env", () => ({ env: { scene: null } }));

// ScreenScene extends the (globally provided) Phaser.Scene at import time; the
// router only needs it for an `instanceof` readiness check, so a stub class is
// enough and keeps this suite free of Phaser.
jest.mock("./ScreenScene", () => ({ ScreenScene: class ScreenScene {} }));

// The router's fake scenes never construct real Phaser objects, but the fade /
// ready helpers read the event-name constants off the global Phaser namespace.
beforeAll(() => {
	(globalThis as unknown as { Phaser: unknown }).Phaser = {
		Cameras: { Scene2D: { Events: { FADE_OUT_COMPLETE: "camera-fade-out-complete" } } },
		Scenes: { Events: { CREATE: "create" } },
	};
});

type FakeCamera = {
	once: (event: string, cb: () => void) => void;
	fade: jest.Mock;
	/** Simulate the camera emitting FADE_OUT_COMPLETE. */
	complete: () => void;
	/** Simulate a fade that never completes (interrupted by a scene restart). */
	silent: () => void;
};

type FakeScene = {
	sys: { settings: { key: string } };
	input: { enabled: boolean };
	cameras: { main: FakeCamera };
	scene: { get: (key: string) => unknown; start: jest.Mock };
};

function makeCamera(): FakeCamera {
	let listeners: (() => void)[] = [];
	let autoComplete = true;
	return {
		once: (_event, cb) => {
			listeners.push(cb);
		},
		fade: jest.fn(() => {
			// Real Phaser emits FADE_OUT_COMPLETE asynchronously; resolving on
			// the next microtask keeps the tests deterministic.
			if (autoComplete) {
				const pending = listeners;
				listeners = [];
				void Promise.resolve().then(() => pending.forEach((cb) => cb()));
			}
		}),
		complete: () => {
			const pending = listeners;
			listeners = [];
			pending.forEach((cb) => cb());
		},
		silent: () => {
			autoComplete = false;
		},
	};
}

function makeScene(key: string): FakeScene {
	return {
		sys: { settings: { key } },
		input: { enabled: true },
		cameras: { main: makeCamera() },
		scene: { get: () => undefined, start: jest.fn() },
	};
}

function setScene(scene: FakeScene | null): void {
	(env as unknown as { scene: FakeScene | null }).scene = scene;
}

function makeNavigator(overrides: Partial<LegacyNavigator> = {}): LegacyNavigator {
	return {
		go: jest.fn(async () => {}),
		current: () => null,
		dispose: jest.fn(async () => {}),
		...overrides,
	};
}

beforeEach(() => {
	jest.useFakeTimers();
	registerLegacyNavigator(makeNavigator());
});

afterEach(() => {
	jest.runOnlyPendingTimers();
	jest.useRealTimers();
});

describe("AppRouter.go", () => {
	it("ignores a navigation with no active scene", async () => {
		setScene(null);
		const warn = jest.spyOn(console, "warn").mockImplementation(() => {});
		await go("title");
		expect(warn).toHaveBeenCalledWith(expect.stringContaining("no active scene"));
		warn.mockRestore();
	});

	it("drops a navigation to the scene that is already active", async () => {
		const title = makeScene("title");
		setScene(title);

		await go("title");

		expect(title.scene.start).not.toHaveBeenCalled();
	});

	it("fades the outgoing scene out, locks its input and starts the legacy host", async () => {
		const title = makeScene("title");
		setScene(title);

		await go("battleground");

		expect(title.cameras.main.fade).toHaveBeenCalled();
		expect(title.input.enabled).toBe(false);
		expect(title.scene.start).toHaveBeenCalledWith("legacy", {
			route: "battleground",
			params: undefined,
		});
	});

	it("forwards route params into the legacy host", async () => {
		const title = makeScene("title");
		setScene(title);

		await go("battleground", { crystalId: "crystal_red" });

		expect(title.scene.start).toHaveBeenCalledWith("legacy", {
			route: "battleground",
			params: { crystalId: "crystal_red" },
		});
	});

	it("starts a migrated scene directly, passing its params as scene data", async () => {
		const title = makeScene("title");
		setScene(title);

		await go("options", { tab: "graphics" });

		expect(title.scene.start).toHaveBeenCalledWith("options", { tab: "graphics" });
	});

	it("delegates a legacy route to the legacy navigator when the host is already active", async () => {
		const host = makeScene("legacy");
		setScene(host);
		const navigator = makeNavigator();
		registerLegacyNavigator(navigator);

		await go("battleground");

		expect(navigator.go).toHaveBeenCalledWith("battleground", undefined);
		expect(host.scene.start).not.toHaveBeenCalled();
	});

	it("starts the title scene when leaving the legacy host", async () => {
		const host = makeScene("legacy");
		setScene(host);

		await go("title");

		expect(host.scene.start).toHaveBeenCalledWith("title", {});
	});

	it("coalesces rapid navigations — only the latest queued target runs", async () => {
		const title = makeScene("title");
		setScene(title);

		const first = go("options");
		const second = go("crystals");
		const third = go("multiplayer_lobby");

		await Promise.all([first, second, third]);

		// The first started immediately; the middle request is dropped and the
		// latest queued target runs after it.
		expect(title.scene.start).toHaveBeenCalledTimes(2);
		expect(title.scene.start).toHaveBeenNthCalledWith(1, "options", {});
		expect(title.scene.start).toHaveBeenNthCalledWith(2, "multiplayer_lobby", {});
	});

	it("proceeds even when the camera fade never completes (hang-proof)", async () => {
		const title = makeScene("title");
		title.cameras.main.silent();
		setScene(title);

		let settled = false;
		const navigation = go("battleground").then(() => {
			settled = true;
		});

		// Let the microtask queue drain: the fade is still pending.
		await Promise.resolve();
		await Promise.resolve();
		expect(settled).toBe(false);
		expect(title.scene.start).not.toHaveBeenCalled();

		// The bounded timeout releases navigation anyway.
		jest.advanceTimersByTime(FADE_MS + 250);
		await navigation;

		expect(settled).toBe(true);
		expect(title.scene.start).toHaveBeenCalledWith("legacy", {
			route: "battleground",
			params: undefined,
		});
	});
});
