import { isMultiplayerMode, setMultiplayerMode } from "./multiplayerMode";

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
