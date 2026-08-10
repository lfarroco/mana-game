import { createSession, deleteSession, getSession, LOCAL_PLAYER_ID, STORAGE_PREFIX } from "./SessionManager";

describe("SessionManager", () => {
	beforeEach(() => {
		localStorage.clear();
		// SessionManager keeps an in-memory map across tests — drop the local player slot.
		deleteSession(LOCAL_PLAYER_ID);
	});

	it("persists a created session to localStorage", () => {
		const session = createSession(LOCAL_PLAYER_ID, "critical_crystal");

		expect(getSession(LOCAL_PLAYER_ID)).toBe(session);
		expect(localStorage.getItem(STORAGE_PREFIX + LOCAL_PLAYER_ID)).not.toBeNull();
	});

	it("deleteSession removes the in-memory entry and the localStorage save", () => {
		createSession(LOCAL_PLAYER_ID, "critical_crystal");
		expect(localStorage.getItem(STORAGE_PREFIX + LOCAL_PLAYER_ID)).not.toBeNull();

		deleteSession(LOCAL_PLAYER_ID);

		expect(getSession(LOCAL_PLAYER_ID)).toBeNull();
		expect(localStorage.getItem(STORAGE_PREFIX + LOCAL_PLAYER_ID)).toBeNull();
	});
});
