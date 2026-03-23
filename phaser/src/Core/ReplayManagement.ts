/**
 * Replay and Snapshot Management
 *
 * Handles building replay manifests, snapshots, and replaying recorded runs.
 */

import { SessionData, RunManifest, ReplaySnapshot } from "@Core/Types";
import { Unit } from "@Models/Entities/Unit";
import { transitionToNextState } from "./SessionTransitions";
import { createInitialSession, validateAndApplyTeamUpdate } from "./SessionManagement";

export type ReplayManifestOptions = {
	/**
	 * Server-generated enemy teams, indexed by combat order (0-based).
	 * When provided, each combat uses the stored team instead of generating a new one.
	 * This is the canonical team used to validate the run on the server.
	 */
	enemyTeams?: Unit[][];
};

/**
 * Replay a complete run from a RunManifest and return the final session.
 *
 * Reconstructs a fresh session from the manifest's initialSeed and selectedCrystalId,
 * then applies every ActionEnvelope in sequence order via transitionToNextState.
 * The resulting session can be compared against client-reported snapshot to validate the run.
 */
export function replayManifest(manifest: RunManifest, replayOptions?: ReplayManifestOptions): {
	session: SessionData;
	rejectReason?: string;
} {
	// Validate that actions are in order with no gaps
	for (let i = 0; i < manifest.actions.length; i++) {
		if (manifest.actions[i].sequence !== i + 1) {
			return {
				session: createInitialSession(
					manifest.playerId,
					manifest.selectedCrystalId,
					manifest.initialSeed
				),
				rejectReason: `Action sequence gap: expected ${i + 1}, got ${manifest.actions[i].sequence}`,
			};
		}
	}

	let session = createInitialSession(
		manifest.playerId,
		manifest.selectedCrystalId,
		manifest.initialSeed
	);

	// Assign a stable ID derived from the run manifest so the replayed session
	// is identifiable separately from in-progress client sessions.
	session.id = `replay-${manifest.runId}`;

	let combatIndex = 0;

	for (const envelope of manifest.actions) {
		// Restore the board arrangement the player had set up before this decision.
		// Board moves are never stored as separate log entries;
		// instead each decision envelope carries a snapshot of the team state at decision time.
		if (envelope.teamSnapshot) {
			const { team, valid } = validateAndApplyTeamUpdate(session, envelope.teamSnapshot);
			if (valid) {
				session = { ...session, team };
			}
		}

		let combatEnemyTeamOptions: { combatEnemyTeam?: Unit[] } | undefined;
		if (envelope.actionId === "combat_encounter") {
			const storedTeam = replayOptions?.enemyTeams?.[combatIndex];
			if (storedTeam !== undefined) {
				combatEnemyTeamOptions = { combatEnemyTeam: storedTeam };
			}
			combatIndex++;
		}

		const { session: next } = transitionToNextState(
			session,
			envelope.actionId,
			envelope.payload,
			combatEnemyTeamOptions
		);
		session = next;
	}

	return { session };
}

/**
 * Build a ReplaySnapshot — the canonical, minimal description of a session
 * used as the comparison contract between client and server.
 */
export function buildReplaySnapshot(session: SessionData): ReplaySnapshot {
	const teamUnitIds = [...(session.team?.units ?? [])].map((u) => u.cardId).sort();

	return {
		phase: session.phase,
		round: session.round,
		step: session.step,
		wins: session.wins,
		losses: session.losses,
		seed: session.seed,
		teamUnitIds,
	};
}
