import { defaultSettings, type PlayerSettings } from "./ClientState";

/**
 * OptionsStore keeps module-level state (`currentOptions`), so each test boots a
 * fresh module instance — mirroring a real game boot where the module starts
 * from `defaultSettings()` and `init()` runs once. `jest.resetModules()` +
 * dynamic import gives us that isolation; the `@Env` / `@Systems/AudioManager`
 * mocks keep the Phaser/Audio dependencies out of the unit test.
 */

let mockEnv: {
	state: { settings: PlayerSettings };
	scene: {
		sound: { volume: number };
		time: { timeScale: number };
		tweens: { timeScale: number };
	};
};

jest.mock("@Env", () => ({
	get env() {
		return mockEnv;
	},
}));

jest.mock("@Systems/AudioManager", () => ({
	onOptionsChanged: jest.fn(),
}));

const STORAGE_KEY = "mana-game-options";

beforeEach(() => {
	localStorage.clear();
	mockEnv = {
		state: { settings: { ...defaultSettings() } },
		scene: {
			sound: { volume: 1 },
			time: { timeScale: 1 },
			tweens: { timeScale: 1 },
		},
	};
	jest.resetModules();
});

const loadOptionsStore = async () => {
	const { getSettings, init } = await import("./OptionsStore");
	return { getSettings, init };
};

describe("OptionsStore boot", () => {
	it("creates the mana-game-options namespace in localStorage with the default settings when it is missing", async () => {
		const { getSettings, init } = await loadOptionsStore();

		expect(localStorage.getItem(STORAGE_KEY)).toBeNull();

		init();

		const stored = JSON.parse(localStorage.getItem(STORAGE_KEY)!) as PlayerSettings;
		expect(stored).toEqual(defaultSettings());
		// The game-speed default (from ClientState.defaultSettings) is 4.
		expect(stored.speed).toBe(4);
		expect(getSettings()).toEqual(defaultSettings());
		expect(mockEnv.state.settings).toEqual(defaultSettings());
		expect(mockEnv.scene.time.timeScale).toBe(4);
		expect(mockEnv.scene.tweens.timeScale).toBe(4);
	});

	it("keeps existing saved options instead of overwriting them on boot", async () => {
		const saved: PlayerSettings = { ...defaultSettings(), speed: 2, music: false };
		localStorage.setItem(STORAGE_KEY, JSON.stringify(saved));

		const { getSettings, init } = await loadOptionsStore();
		init();

		const stored = JSON.parse(localStorage.getItem(STORAGE_KEY)!) as PlayerSettings;
		expect(stored).toEqual(saved);
		expect(getSettings().speed).toBe(2);
		expect(getSettings().music).toBe(false);
		expect(mockEnv.state.settings.speed).toBe(2);
		expect(mockEnv.scene.time.timeScale).toBe(2);
	});

	it("fills in defaults for keys missing from an existing partial namespace without rewriting it", async () => {
		localStorage.setItem(STORAGE_KEY, JSON.stringify({ speed: 2 }));

		const { getSettings, init } = await loadOptionsStore();
		init();

		const stored = JSON.parse(localStorage.getItem(STORAGE_KEY)!) as Partial<PlayerSettings>;
		expect(stored).toEqual({ speed: 2 });
		expect(getSettings().speed).toBe(2);
		expect(getSettings().sound).toBe(true);
		expect(mockEnv.state.settings.sound).toBe(true);
		expect(mockEnv.scene.time.timeScale).toBe(2);
	});
});
