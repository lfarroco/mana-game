/**
 * New-run server selection.
 *
 * The mode is the explicit pre-session flag (`setMultiplayerMode`), never the
 * previous session's server-authored `session_type` still sitting in client
 * state. Routing off that stale value sent a single-player new run to the
 * remote server — where it failed with "Multiplayer requires a login" and the
 * Play button silently did nothing. Reachable whenever client state ends a
 * multiplayer run without a reset (e.g. the battleground's 401 bounce).
 */

import { env } from "@Env";
import * as LocalServer from "../../../LocalServer";
import { remoteServer } from "../../../RemoteServer";
import { isMultiplayerMode } from "@lib/multiplayerMode";

import { startNewGame } from "./startNewGame";

jest.mock("../selection", () => ({
	getSelection: jest.fn(() => ({ crystals: [{ id: "critical_crystal" }], currentIndex: 0 })),
}));

jest.mock("@Env", () => ({
	env: {
		// A *stale* multiplayer session left in client state.
		state: {
			session: { seed: "123", session_type: { type: "multiplayer", queueType: "casual" } },
		},
		patchState: jest.fn(),
	},
}));

jest.mock("../../../LocalServer", () => ({ createSession: jest.fn() }));
jest.mock("../../../RemoteServer", () => ({ remoteServer: { createSession: jest.fn() } }));
jest.mock("../../../SessionManager", () => ({ LOCAL_PLAYER_ID: "local_player" }));
jest.mock("@Scenes/AppRouter", () => ({ go: jest.fn(async () => {}) }));
jest.mock("@lib/multiplayerMode", () => ({ isMultiplayerMode: jest.fn() }));

const mockIsMultiplayerMode = isMultiplayerMode as unknown as jest.Mock;
const mockLocalCreate = LocalServer.createSession as unknown as jest.Mock;
const mockRemoteCreate = remoteServer.createSession as unknown as jest.Mock;
const mockedEnv = env as unknown as { patchState: jest.Mock };

describe("startNewGame", () => {
	beforeEach(() => {
		jest.clearAllMocks();
		mockLocalCreate.mockResolvedValue({ id: "local-1", phase: "encounter" });
		mockRemoteCreate.mockResolvedValue({ id: "remote-1", phase: "encounter" });
	});

	it("routes a single-player run to LocalServer even when the stale session is multiplayer", async () => {
		mockIsMultiplayerMode.mockReturnValue(false);

		await startNewGame();

		expect(mockLocalCreate).toHaveBeenCalledWith("local_player", "critical_crystal", "123");
		expect(mockRemoteCreate).not.toHaveBeenCalled();
		expect(mockedEnv.patchState).toHaveBeenCalledWith({
			session: { id: "local-1", phase: "encounter" },
		});
	});

	it("routes a multiplayer run through the remote server", async () => {
		mockIsMultiplayerMode.mockReturnValue(true);

		await startNewGame();

		expect(mockRemoteCreate).toHaveBeenCalledWith("local_player", "critical_crystal", "123");
		expect(mockLocalCreate).not.toHaveBeenCalled();
	});
});
