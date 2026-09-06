import { isMultiplayerMode, resolveMultiplayerEntry, setMultiplayerMode } from "./multiplayerMode";

describe("multiplayerMode", () => {
	beforeEach(() => {
		setMultiplayerMode(false);
	});

	it("defaults to single-player mode", () => {
		expect(isMultiplayerMode()).toBe(false);
	});

	it("reflects an explicitly enabled multiplayer mode", () => {
		setMultiplayerMode(true);
		expect(isMultiplayerMode()).toBe(true);
	});

	it("can be turned back off", () => {
		setMultiplayerMode(true);
		setMultiplayerMode(false);
		expect(isMultiplayerMode()).toBe(false);
	});
});

describe("resolveMultiplayerEntry", () => {
	it("goes straight to the lobby when a session is stored (any provider)", () => {
		expect(resolveMultiplayerEntry(true, false)).toBe("lobby");
		expect(resolveMultiplayerEntry(true, true)).toBe("lobby");
	});

	it("uses the Steam auto-login on Electron without a session", () => {
		expect(resolveMultiplayerEntry(false, true)).toBe("steam_login");
	});

	it("routes through the login screen off Electron without a session", () => {
		expect(resolveMultiplayerEntry(false, false)).toBe("login_screen");
	});
});
