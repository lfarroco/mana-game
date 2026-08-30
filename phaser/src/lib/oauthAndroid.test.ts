import {
	consumeLaunchReturn,
	createOAuthAndroid,
	parseOAuthReturnUrl,
	readOAuthRelayUri,
} from "./oauthAndroid";

/**
 * Unit tests for the Android (Capacitor) OAuth transport
 * (docs/android-multiplayer.md). Pure helpers are tested directly; the
 * Capacitor-plugin defaults are replaced with injected stubs via
 * `createOAuthAndroid`.
 */

describe("parseOAuthReturnUrl", () => {
	it("extracts id_token and state from a Google deep-link return", () => {
		expect(parseOAuthReturnUrl("com.manabattle.app://oauth#id_token=abc&state=xyz")).toEqual({
			credential: "abc",
			state: "xyz",
		});
	});

	it("extracts access_token from an itch deep-link return", () => {
		expect(parseOAuthReturnUrl("com.manabattle.app://oauth#access_token=tok")).toEqual({
			credential: "tok",
			state: undefined,
		});
	});

	it("returns null for URLs without a hash or credential", () => {
		expect(parseOAuthReturnUrl("com.manabattle.app://oauth")).toBeNull();
		expect(parseOAuthReturnUrl("com.manabattle.app://oauth#error=denied")).toBeNull();
		expect(parseOAuthReturnUrl("")).toBeNull();
	});
});

describe("readOAuthRelayUri", () => {
	it("points at the game server's relay page", () => {
		expect(readOAuthRelayUri("https://api.manabattle.com")).toBe(
			"https://api.manabattle.com/oauth/callback"
		);
	});
});

describe("createOAuthAndroid", () => {
	it("consumes a stashed cold-start return without opening the browser", async () => {
		const openExternal = jest.fn(async (_url: string) => {});
		const waitForReturn = jest.fn(async () => ({ credential: "returned" }));
		const transport = createOAuthAndroid({
			openExternal,
			waitForReturn,
			consumeLaunchReturn: () => ({ credential: "launch-token", state: "s0" }),
		});

		const credential = await transport.runOAuthAndroid("https://auth.example", {
			state: "s0",
		});

		expect(credential).toBe("launch-token");
		expect(openExternal).not.toHaveBeenCalled();
		expect(waitForReturn).not.toHaveBeenCalled();
	});

	it("opens the authorize URL and waits for the deep-link return", async () => {
		const openExternal = jest.fn(async (_url: string) => {});
		const waitForReturn = jest.fn(async (opts: { state?: string }) => ({
			credential: "returned-token",
			state: opts.state,
		}));
		const transport = createOAuthAndroid({
			openExternal,
			waitForReturn,
			consumeLaunchReturn: () => null,
		});

		const credential = await transport.runOAuthAndroid("https://auth.example?x=1", {
			state: "state-1",
			timeoutMs: 5000,
		});

		expect(credential).toBe("returned-token");
		expect(openExternal).toHaveBeenCalledWith("https://auth.example?x=1");
		expect(waitForReturn).toHaveBeenCalledWith({ state: "state-1", timeoutMs: 5000 });
	});
});

describe("consumeLaunchReturn", () => {
	it("clears the stash on read", () => {
		// Module-level stash is only settable via the Capacitor launch-URL
		// capture (not exercised in jsdom) — reading an empty stash is a no-op.
		expect(consumeLaunchReturn()).toBeNull();
		expect(consumeLaunchReturn()).toBeNull();
	});
});
