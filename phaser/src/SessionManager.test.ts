import {
	createSession,
	deleteSession,
	generateSessionSeed,
	getSession,
	LOCAL_PLAYER_ID,
	STORAGE_PREFIX,
} from "./SessionManager";
import { MAX_SEED_LENGTH } from "@game/session/seed";

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

	it("generates a numeric session seed within the numpad's digit cap", () => {
		const session = createSession(LOCAL_PLAYER_ID, "critical_crystal");

		expect(session.seed).toMatch(/^\d+$/);
		expect(session.seed.length).toBeLessThanOrEqual(MAX_SEED_LENGTH);
		expect(session.initial_seed).toBe(session.seed);
	});

	it("uses a player-entered numeric seed when provided", () => {
		const session = createSession(LOCAL_PLAYER_ID, "critical_crystal", "4242");

		expect(session.seed).toBe("4242");
		expect(session.initial_seed).toBe("4242");
	});

	it("sanitizes an oversized/non-numeric custom seed before use", () => {
		// Non-numeric input collapses to empty → falls back to a generated seed.
		const fromLetters = createSession(LOCAL_PLAYER_ID, "critical_crystal", "abc");
		expect(fromLetters.seed).toMatch(/^\d+$/);

		// Oversized numeric input is capped at MAX_SEED_LENGTH digits.
		const fromLongNumber = createSession(
			LOCAL_PLAYER_ID,
			"critical_crystal",
			"12345678901234567890"
		);
		expect(fromLongNumber.seed).toBe("123456789012");
	});

	it("generateSessionSeed always returns a numeric string", () => {
		for (let i = 0; i < 25; i++) {
			const seed = generateSessionSeed();
			expect(seed).toMatch(/^\d+$/);
			expect(seed.length).toBeLessThanOrEqual(MAX_SEED_LENGTH);
		}
	});
});
