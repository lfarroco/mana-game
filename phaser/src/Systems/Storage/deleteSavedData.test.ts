import { deleteSavedData } from "./deleteSavedData";
import * as SessionManager from "../../SessionManager";

/**
 * deleteSavedData depends on the `env` singleton (which needs a Phaser scene in
 * the real app). We mock just the state it reads so the real
 * `SessionManager` delete path is exercised end-to-end.
 */
let mockEnvState: {
	session: {
		player_id: string;
		session_type: { type: "singleplayer" | "multiplayer" };
	} | null;
};

jest.mock("@Env", () => ({
	env: {
		get state() {
			return mockEnvState;
		},
	},
}));

describe("deleteSavedData", () => {
	beforeEach(() => {
		localStorage.clear();
		SessionManager.deleteSession("p1");
		mockEnvState = {
			session: {
				player_id: "p1",
				session_type: { type: "singleplayer" },
			},
		};
	});

	it("deletes the persisted single-player session so it can't be resumed", async () => {
		SessionManager.createSession("p1", "critical_crystal");
		expect(localStorage.getItem(SessionManager.STORAGE_PREFIX + "p1")).not.toBeNull();

		await deleteSavedData();

		expect(localStorage.getItem(SessionManager.STORAGE_PREFIX + "p1")).toBeNull();
		expect(SessionManager.getSession("p1")).toBeNull();
	});

	it("does nothing when there is no current session player_id", async () => {
		mockEnvState = { session: null };
		const warn = jest.spyOn(console, "warn").mockImplementation(() => {});

		await deleteSavedData();

		expect(warn).toHaveBeenCalledWith(
			"deleteSavedData",
			"[deleteSavedData] No session found to delete"
		);
		expect(SessionManager.getSession("p1")).toBeNull();
		warn.mockRestore();
	});

	it("does not delete anything for multiplayer — the server owns the session lifecycle", async () => {
		// Simulate a finished multiplayer run still held in client state so the
		// game-over screen can render. The finished session must NOT be removed
		// client-side and no server delete is issued (the server already marked
		// the run finished and no longer serves it).
		mockEnvState = {
			session: {
				player_id: "p1",
				session_type: { type: "multiplayer" },
			},
		};
		SessionManager.createSession("p1", "critical_crystal");

		await deleteSavedData();

		expect(SessionManager.getSession("p1")).not.toBeNull();
		expect(localStorage.getItem(SessionManager.STORAGE_PREFIX + "p1")).not.toBeNull();
	});
});
