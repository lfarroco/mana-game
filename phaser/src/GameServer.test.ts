/**
 * Tests for the server-adapter routing.
 *
 * `getServer()` decides per action whether a session runs in-process
 * (`LocalServer`) or over HTTP (`remoteServer`). A session whose `session_type`
 * is missing/unknown must NOT silently become multiplayer: every action would
 * be sent to the game server, fail (no bearer token / no server session), and
 * the battleground would restore the phase exit without advancing — the run
 * freezes with the player's pick already applied (the reported symptom).
 */

const mockEnvState = {
	session: {
		session_type: { type: "singleplayer" } as { type: string; queueType?: string },
	},
};

jest.mock("@Env", () => ({
	env: {
		get state() {
			return mockEnvState;
		},
	},
}));

import * as LocalServer from "./LocalServer";
import { remoteServer } from "./RemoteServer";
import { getServer } from "./GameServer";

type SessionType = { type: string; queueType?: string };

const setSessionType = (sessionType: SessionType | undefined | null): void => {
	mockEnvState.session = { session_type: sessionType as SessionType };
};

describe("getServer", () => {
	let warn: jest.SpyInstance;

	beforeEach(() => {
		warn = jest.spyOn(console, "warn").mockImplementation(() => {});
	});

	afterEach(() => {
		warn.mockRestore();
	});

	it("routes single-player sessions to the local server", () => {
		setSessionType({ type: "singleplayer" });
		expect(getServer()).toBe(LocalServer);
		expect(warn).not.toHaveBeenCalled();
	});

	it("routes multiplayer sessions to the remote server", () => {
		setSessionType({ type: "multiplayer", queueType: "casual" });
		expect(getServer()).toBe(remoteServer);
		expect(warn).not.toHaveBeenCalled();
	});

	it("falls back to the local server (with a warning) when session_type is missing", () => {
		setSessionType(undefined);
		expect(getServer()).toBe(LocalServer);
		expect(warn).toHaveBeenCalled();
	});

	it("falls back to the local server (with a warning) for an unknown session_type", () => {
		setSessionType({ type: "practice" });
		expect(getServer()).toBe(LocalServer);
		expect(warn).toHaveBeenCalled();
	});
});
