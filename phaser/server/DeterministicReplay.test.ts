/**
 * @jest-environment node
 *
 * Golden determinism tests — verify that replaying a RunManifest through
 * `GameLogic.replayManifest` produces a session state identical to the one
 * that was produced live by the same ordered sequence of actions.
 *
 * These tests serve as a correctness gate before we trust the deferred
 * end-of-run submission path.  If they fail, the browser and server would
 * disagree on the final run outcome.
 */

import { registerCollection } from "../src/Models/Entities/Card";
import { BASE_COLLECTION_DATA } from "../src/Data/BaseCollection";
import * as GameLogic from "../src/Core/GameLogic";
import { RunActionQueue } from "../src/Core/RunActionQueue";
import type { SessionData } from "../src/Core/Types";

jest.mock("../src/i18n/i18n", () => ({
	t: (key: string) => key,
	getName: (key: string) => key,
	initialize: () => {},
	setLocale: () => {},
	getCurrentLocale: () => "en",
	getAvailableLocales: () => ["en"],
	getNativeName: () => "English",
}));

// ----------------------------------------
// localStorage stub
// ----------------------------------------
const _store: Record<string, string> = {};
Object.defineProperty(global, "localStorage", {
	value: {
		getItem: (k: string) => _store[k] ?? null,
		setItem: (k: string, v: string) => {
			_store[k] = v;
		},
		removeItem: (k: string) => {
			delete _store[k];
		},
		clear: () => {
			Object.keys(_store).forEach((k) => delete _store[k]);
		},
		get length() {
			return Object.keys(_store).length;
		},
		key: (i: number) => Object.keys(_store)[i] ?? null,
	},
});

// ----------------------------------------
// Polyfill
// ----------------------------------------
if (typeof global.structuredClone === "undefined") {
	global.structuredClone = <T>(obj: T): T => JSON.parse(JSON.stringify(obj)) as T;
}

beforeAll(() => {
	registerCollection(BASE_COLLECTION_DATA);
});

// ----------------------------------------
// Helpers
// ----------------------------------------

const PLAYER = "test-player-golden";
const CRYSTAL = "crystal_core";
const SEED = "golden_seed_001";
const VERSION = "test-1.0.0";
const RUN_ID = "golden-run-001";

/**
 * Drive a session forward through a fixed number of non-combat actions, recording
 * each action into the provided queue.  Stops early if the session reaches a
 * terminal phase (victory / game_over) or a combat phase (to keep the test fast).
 * Returns the final live session state.
 */
function driveSession(session: SessionData, queue: RunActionQueue, maxActions = 6): SessionData {
	const specialEncounters = ["upgrade_unit", "power_distributor", "power_absorber"];
	let current = session;
	let taken = 0;

	while (taken < maxActions) {
		const phase = current.phase;
		if (phase === "victory" || phase === "game_over" || phase === "combat") break;

		const opts = Array.isArray(current.current_options)
			? current.current_options
			: ((current.current_options as { options: unknown[] } | null)?.options ?? []);

		if (!Array.isArray(opts) || opts.length === 0) break;

		// Pick the first non-special option so results are predictable
		const opt =
			(opts as Array<{ id: string }>).find((o) => !specialEncounters.includes(o.id)) ??
			(opts as Array<{ id: string }>)[0];

		const { session: next } = GameLogic.transitionToNextState(current, opt.id);
		queue.append(opt.id);
		current = next;
		taken++;
	}

	return current;
}

// ----------------------------------------
// Tests
// ----------------------------------------

describe("Deterministic replay – replayManifest", () => {
	it("produces an identical ReplaySnapshot when replayed from the same manifest", () => {
		// 1. Initialise a live session with an explicit seed
		const queue = RunActionQueue.start(PLAYER, CRYSTAL, SEED, VERSION, RUN_ID);
		const liveSession = GameLogic.createInitialSession(PLAYER, CRYSTAL, SEED);

		// 2. Drive the session forward and record every action
		const finalLiveSession = driveSession(liveSession, queue, 6);
		const liveSnapshot = GameLogic.buildReplaySnapshot(finalLiveSession);

		// 3. Build the manifest and replay it server-side
		const manifest = queue.build();
		const { session: replayedSession, rejectReason } = GameLogic.replayManifest(manifest);

		expect(rejectReason).toBeUndefined();

		const replaySnapshot = GameLogic.buildReplaySnapshot(replayedSession);

		// 4. Both snapshots must be identical
		expect(replaySnapshot).toEqual(liveSnapshot);
	});

	it("replayManifest produces the same seed progression as the live session", () => {
		const queue = RunActionQueue.start(PLAYER, CRYSTAL, SEED, VERSION, `${RUN_ID}-seed`);
		const liveSession = GameLogic.createInitialSession(PLAYER, CRYSTAL, SEED);

		const finalLive = driveSession(liveSession, queue, 4);

		const manifest = queue.build();
		const { session: replayed } = GameLogic.replayManifest(manifest);

		expect(replayed.seed).toBe(finalLive.seed);
	});

	it("detects a sequence gap and returns a rejectReason", () => {
		const queue = RunActionQueue.start(PLAYER, CRYSTAL, SEED, VERSION, `${RUN_ID}-gap`);
		const liveSession = GameLogic.createInitialSession(PLAYER, CRYSTAL, SEED);
		driveSession(liveSession, queue, 3);

		const manifest = queue.build();
		// Corrupt sequence numbers to simulate a gap
		const corrupted = {
			...manifest,
			actions: manifest.actions.map((a, i) => ({ ...a, sequence: i + 2 })), // starts at 2 instead of 1
		};

		const { rejectReason } = GameLogic.replayManifest(corrupted);
		expect(rejectReason).toMatch(/sequence gap/i);
	});

	it("replay of empty action list produces an identical initial snapshot", () => {
		const emptyManifest = {
			runId: "empty-run",
			playerId: PLAYER,
			selectedCrystalId: CRYSTAL,
			initialSeed: SEED,
			clientVersion: VERSION,
			actions: [],
		};

		const { session: replayed } = GameLogic.replayManifest(emptyManifest);
		const fresh = GameLogic.createInitialSession(PLAYER, CRYSTAL, SEED);

		expect(GameLogic.buildReplaySnapshot(replayed)).toEqual(GameLogic.buildReplaySnapshot(fresh));
	});
});
