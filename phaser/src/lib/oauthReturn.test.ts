import { OAUTH_RELAY_MESSAGE_TYPE, parseOAuthRelayPayload, readRelayOrigin } from "./oauthReturn";

/**
 * Unit tests for the shared OAuth-return plumbing used by the itch.io and
 * Google login flows (the relay page's cross-origin postMessage).
 */

describe("parseOAuthRelayPayload", () => {
	it("extracts an itch access_token + state", () => {
		expect(parseOAuthRelayPayload("access_token=tok&state=abc")).toEqual({
			token: "tok",
			state: "abc",
		});
	});

	it("extracts a Google id_token + state", () => {
		expect(parseOAuthRelayPayload("id_token=jwt&state=abc")).toEqual({
			token: "jwt",
			state: "abc",
		});
	});

	it("prefers access_token when both are present", () => {
		expect(parseOAuthRelayPayload("id_token=jwt&access_token=tok")).toEqual({
			token: "tok",
			state: undefined,
		});
	});

	it("returns null when no token is present", () => {
		expect(parseOAuthRelayPayload("")).toBeNull();
		expect(parseOAuthRelayPayload("error=access_denied&state=abc")).toBeNull();
		expect(parseOAuthRelayPayload("state=abc")).toBeNull();
	});
});

describe("readRelayOrigin", () => {
	it("returns the server origin (the relay's origin)", () => {
		expect(readRelayOrigin("https://api.manabattle.com")).toBe("https://api.manabattle.com");
		expect(readRelayOrigin("http://127.0.0.1:8787")).toBe("http://127.0.0.1:8787");
	});

	it("returns an empty string for a malformed server URL", () => {
		expect(readRelayOrigin("not a url")).toBe("");
	});
});

describe("OAUTH_RELAY_MESSAGE_TYPE", () => {
	it("is the relay page's postMessage type", () => {
		expect(OAUTH_RELAY_MESSAGE_TYPE).toBe("mana-oauth-return");
	});
});
