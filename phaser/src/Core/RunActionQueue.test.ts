/**
 * Tests for RunActionQueue — the local action-queue/persistence layer used
 * by single-player (deferred-submission) mode.
 *
 * RunActionQueue responsibilities:
 *  - Store the run manifest header (runId, playerId, initialSeed, selectedCrystalId, clientVersion)
 *  - Append actions as ActionEnvelopes with monotonically increasing sequence numbers
 *  - Persist every change to localStorage so the run survives a page refresh
 *  - Reconstruct itself from localStorage on construction
 *  - Finalise / build the complete RunManifest ready for submission
 *  - Clear itself after successful submission to avoid duplicate submits
 */

import { RunActionQueue } from "@Core/RunActionQueue";
import type { ActionEnvelope, RunManifest } from "@Core/Types";

// ----------------------------------------
// localStorage mock
// ----------------------------------------
const localStorageMock = (() => {
	let store: Record<string, string> = {};
	return {
		getItem: (key: string) => store[key] ?? null,
		setItem: (key: string, value: string) => {
			store[key] = value;
		},
		removeItem: (key: string) => {
			delete store[key];
		},
		clear: () => {
			store = {};
		},
		get length() {
			return Object.keys(store).length;
		},
		key: (index: number) => Object.keys(store)[index] ?? null,
	};
})();

Object.defineProperty(global, "localStorage", { value: localStorageMock });

// ----------------------------------------
// Helpers
// ----------------------------------------
const PLAYER = "player-1";
const CRYSTAL = "crystal_core";
const SEED = "seed_abc123";
const VERSION = "1.0.0";

function makeQueue(runId = "run-001"): RunActionQueue {
	return RunActionQueue.start(PLAYER, CRYSTAL, SEED, VERSION, runId);
}

// ----------------------------------------
// Tests
// ----------------------------------------

beforeEach(() => localStorageMock.clear());

describe("RunActionQueue.start", () => {
	it("creates a new queue with sequence starting at 0", () => {
		const q = makeQueue();
		expect(q.length).toBe(0);
		expect(q.runId).toBe("run-001");
	});

	it("persists the manifest header to localStorage immediately", () => {
		makeQueue("run-persist");
		const raw = localStorage.getItem("mana_run_manifest_run-persist");
		expect(raw).not.toBeNull();
		const saved = JSON.parse(raw!) as RunManifest;
		expect(saved.initialSeed).toBe(SEED);
		expect(saved.selectedCrystalId).toBe(CRYSTAL);
		expect(saved.actions).toHaveLength(0);
	});
});

describe("RunActionQueue.resume", () => {
	it("returns null when no persisted run exists", () => {
		expect(RunActionQueue.resume("non-existent-run")).toBeNull();
	});

	it("restores a previously saved queue", () => {
		const q = makeQueue("run-restore");
		q.append("forest_pools");
		q.append("goblin");

		const restored = RunActionQueue.resume("run-restore");
		expect(restored).not.toBeNull();
		expect(restored!.length).toBe(2);
		expect(restored!.runId).toBe("run-restore");
	});
});

describe("RunActionQueue.append", () => {
	it("assigns monotonically increasing sequence numbers starting at 1", () => {
		const q = makeQueue();
		q.append("encounter_forest");
		q.append("buy_unit", { unitId: "goblin" });
		q.append("armory");

		const manifest = q.build();
		expect(manifest.actions.map((a: ActionEnvelope) => a.sequence)).toEqual([1, 2, 3]);
	});

	it("stores teamSnapshot in the envelope when provided", () => {
		const team = { units: [{ id: "u1", cardId: "goblin", position: { x: 0, y: 0 } }] };
		const q = makeQueue("run-snapshot");
		q.append("forest_pools", undefined, team as ActionEnvelope["teamSnapshot"]);

		const manifest = q.build();
		expect(manifest.actions[0].teamSnapshot).toEqual(team);
	});

	it("omits teamSnapshot from the envelope when not provided", () => {
		const q = makeQueue("run-no-snapshot");
		q.append("forest_pools");

		const manifest = q.build();
		expect(manifest.actions[0].teamSnapshot).toBeUndefined();
	});

	it("persists teamSnapshot to localStorage", () => {
		const team = { units: [{ id: "u1", cardId: "goblin", position: { x: 1, y: 2 } }] };
		const q = makeQueue("run-snap-persist");
		q.append("armory", undefined, team as ActionEnvelope["teamSnapshot"]);

		const raw = localStorage.getItem("mana_run_manifest_run-snap-persist");
		const saved = JSON.parse(raw!) as RunManifest;
		expect(saved.actions[0].teamSnapshot).toEqual(team);
		// Restoring from storage also recovers the snapshot
		const restored = RunActionQueue.resume("run-snap-persist");
		expect(restored!.build().actions[0].teamSnapshot).toEqual(team);
	});

	it("persists updated manifest to localStorage after each append", () => {
		const q = makeQueue("run-append");
		q.append("encounter_forest");

		const raw = localStorage.getItem("mana_run_manifest_run-append");
		const saved = JSON.parse(raw!) as RunManifest;
		expect(saved.actions).toHaveLength(1);
		expect(saved.actions[0].actionId).toBe("encounter_forest");
	});
});

describe("RunActionQueue.build", () => {
	it("returns a complete RunManifest with all recorded actions", () => {
		const q = makeQueue("run-build");
		q.append("encounter_a");
		q.append("buy_b", { unitId: "goblin" });

		const manifest = q.build();
		expect(manifest.runId).toBe("run-build");
		expect(manifest.playerId).toBe(PLAYER);
		expect(manifest.selectedCrystalId).toBe(CRYSTAL);
		expect(manifest.initialSeed).toBe(SEED);
		expect(manifest.clientVersion).toBe(VERSION);
		expect(manifest.actions).toHaveLength(2);
	});
});

describe("RunActionQueue.clear", () => {
	it("removes the persisted manifest from localStorage", () => {
		const q = makeQueue("run-clear");
		q.append("encounter_x");
		q.clear();
		expect(localStorage.getItem("mana_run_manifest_run-clear")).toBeNull();
	});

	it("resets the in-memory queue", () => {
		const q = makeQueue("run-clear2");
		q.append("encounter_x");
		q.clear();
		expect(q.length).toBe(0);
	});
});
