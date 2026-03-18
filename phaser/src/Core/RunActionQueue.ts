import type { ActionEnvelope, ActionPayload, RunManifest } from "@Core/Types";

const STORAGE_KEY_PREFIX = "mana_run_manifest_";

/**
 * Local action-queue / persistence layer for single-player deferred-submission
 * mode.
 *
 * A `RunActionQueue` tracks all player actions taken during a PVE run so that
 * the complete ordered manifect can be submitted to the server at the end of
 * the run for deterministic replay-verification.
 *
 * Usage:
 *   const q = RunActionQueue.start(playerId, crystalId, initialSeed, version, runId);
 *   q.append("forest_pools");
 *   q.append("buy_unit", { unitId: "goblin" });
 *   const manifest = q.build();
 *   // ... submit manifest to server ...
 *   q.clear();
 *
 * The queue persists itself to localStorage after every mutation so the run
 * survives a page refresh or crash.  Use `RunActionQueue.resume(runId)` to
 * reconstruct the queue from storage.
 */
export class RunActionQueue {
	private readonly _runId: string;
	private readonly _playerId: string;
	private readonly _crystalId: string;
	private readonly _initialSeed: string;
	private readonly _clientVersion: string;
	private _actions: ActionEnvelope[];

	private constructor(
		runId: string,
		playerId: string,
		crystalId: string,
		initialSeed: string,
		clientVersion: string,
		actions: ActionEnvelope[]
	) {
		this._runId = runId;
		this._playerId = playerId;
		this._crystalId = crystalId;
		this._initialSeed = initialSeed;
		this._clientVersion = clientVersion;
		this._actions = actions;
	}

	// -----------------------------------------------------------------------
	// Factory methods
	// -----------------------------------------------------------------------

	/** Start a brand-new run queue and persist it to localStorage. */
	static start(
		playerId: string,
		selectedCrystalId: string,
		initialSeed: string,
		clientVersion: string,
		runId: string
	): RunActionQueue {
		const q = new RunActionQueue(
			runId,
			playerId,
			selectedCrystalId,
			initialSeed,
			clientVersion,
			[]
		);
		q._persist();
		return q;
	}

	/**
	 * Attempt to restore a queue from localStorage.
	 * Returns `null` if no persisted data exists for the given run ID.
	 */
	static resume(runId: string): RunActionQueue | null {
		const raw = localStorage.getItem(STORAGE_KEY_PREFIX + runId);
		if (!raw) return null;

		const manifest = JSON.parse(raw) as RunManifest;
		return new RunActionQueue(
			manifest.runId,
			manifest.playerId,
			manifest.selectedCrystalId,
			manifest.initialSeed,
			manifest.clientVersion,
			manifest.actions
		);
	}

	// -----------------------------------------------------------------------
	// Properties
	// -----------------------------------------------------------------------

	get runId(): string {
		return this._runId;
	}

	get length(): number {
		return this._actions.length;
	}

	// -----------------------------------------------------------------------
	// Mutation
	// -----------------------------------------------------------------------

	/** Record a player action and persist the updated manifest. */
	append(actionId: string, payload?: ActionPayload): void {
		const envelope: ActionEnvelope = {
			sequence: this._actions.length + 1,
			actionId,
			...(payload !== undefined ? { payload } : {}),
		};
		this._actions = [...this._actions, envelope];
		this._persist();
	}

	/** Remove the persisted manifest from localStorage and reset in-memory state. */
	clear(): void {
		localStorage.removeItem(STORAGE_KEY_PREFIX + this._runId);
		this._actions = [];
	}

	// -----------------------------------------------------------------------
	// Manifest
	// -----------------------------------------------------------------------

	/** Return the complete `RunManifest` ready for server submission. */
	build(): RunManifest {
		return {
			runId: this._runId,
			playerId: this._playerId,
			selectedCrystalId: this._crystalId,
			initialSeed: this._initialSeed,
			clientVersion: this._clientVersion,
			actions: [...this._actions],
		};
	}

	// -----------------------------------------------------------------------
	// Internal
	// -----------------------------------------------------------------------

	private _persist(): void {
		localStorage.setItem(STORAGE_KEY_PREFIX + this._runId, JSON.stringify(this.build()));
	}
}
