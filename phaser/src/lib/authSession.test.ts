import { DEFAULT_SERVER_URL, readServerUrl } from "./authSession";

/**
 * Unit tests for the shared auth-session helpers (docs/auth.md).
 *
 * `readServerUrl` is consumed by the Steam, itch.io, and RemoteServer paths.
 * It must read `process.env.MANA_SERVER_URL` DIRECTLY — webpack's
 * DefinePlugin replaces that exact expression with the baked literal at build
 * time, so a `typeof process` guard would silently break browser builds
 * (webpack 5 has no `process`). These tests lock in the read behavior.
 */

describe("readServerUrl", () => {
	const original = process.env.MANA_SERVER_URL;

	afterEach(() => {
		if (original === undefined) {
			delete process.env.MANA_SERVER_URL;
		} else {
			process.env.MANA_SERVER_URL = original;
		}
	});

	it("returns MANA_SERVER_URL when set", () => {
		process.env.MANA_SERVER_URL = "https://api.example.com";
		expect(readServerUrl()).toBe("https://api.example.com");
	});

	it("falls back to the default server URL when unset", () => {
		delete process.env.MANA_SERVER_URL;
		expect(readServerUrl()).toBe(DEFAULT_SERVER_URL);
	});

	it("falls back to the default server URL for whitespace-only values", () => {
		process.env.MANA_SERVER_URL = "   ";
		expect(readServerUrl()).toBe(DEFAULT_SERVER_URL);
	});
});
