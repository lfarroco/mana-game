import {
	createSession,
	deleteSession,
	generateSessionSeed,
	getPersistenceFailure,
	getSession,
	hasPersistenceFailed,
	LOCAL_PLAYER_ID,
	resetPersistenceStateForTests,
	STORAGE_PREFIX,
	updateSession,
} from "./SessionManager";
import { GameEvent } from "./Events";
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

	describe("storage failures", () => {
		let warn: jest.SpyInstance;

		beforeEach(() => {
			warn = jest.spyOn(console, "warn").mockImplementation(() => {});
			// The failure flag is sticky per launch; reset it so each case starts
			// from a clean signal (the emit-count assertions depend on it).
			resetPersistenceStateForTests();
		});

		afterEach(() => {
			warn.mockRestore();
		});

		it("does not throw when persisting fails (quota exceeded / storage blocked)", () => {
			// A raw write failure used to reject the whole action *after* its
			// state had been applied — the choice was registered but the phase
			// never advanced (see GameServer / dispatchAction).
			const setItem = jest.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
				throw new Error("QuotaExceededError");
			});

			expect(() => createSession(LOCAL_PLAYER_ID, "critical_crystal")).not.toThrow();
			// The run continues in memory even when it cannot be persisted.
			expect(getSession(LOCAL_PLAYER_ID)).not.toBeNull();
			expect(warn).toHaveBeenCalled();

			setItem.mockRestore();
		});

		it("does not throw when reading or removing fails", () => {
			const getItem = jest.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
				throw new Error("SecurityError");
			});
			const removeItem = jest.spyOn(Storage.prototype, "removeItem").mockImplementation(() => {
				throw new Error("SecurityError");
			});

			createSession(LOCAL_PLAYER_ID, "critical_crystal");
			expect(() => deleteSession(LOCAL_PLAYER_ID)).not.toThrow();

			getItem.mockRestore();
			removeItem.mockRestore();
		});

		it("signals the failure once so the player can be told the run won't be saved", () => {
			const setItem = jest.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
				throw new Error("QuotaExceededError");
			});
			const failures: { operation: string; detail?: string }[] = [];
			const dispose = GameEvent.persistenceUnavailable.listen((payload) => {
				failures.push(payload);
			});

			createSession(LOCAL_PLAYER_ID, "critical_crystal");
			updateSession(LOCAL_PLAYER_ID, createSession(LOCAL_PLAYER_ID, "critical_crystal"));

			// One signal per launch, with the operation that failed — a notice on
			// every action would be unplayable.
			expect(failures).toHaveLength(1);
			expect(failures[0].detail).toContain("QuotaExceededError");
			expect(hasPersistenceFailed()).toBe(true);
			expect(getPersistenceFailure()?.operation).toContain("persist");

			dispose();
			setItem.mockRestore();
		});
	});
});
