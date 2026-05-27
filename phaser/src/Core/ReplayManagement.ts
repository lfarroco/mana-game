/**
 * Replay and Snapshot Management
 *
 * Handles building replay manifests, snapshots, and replaying recorded runs.
 */

import { SessionData, RunManifest, ReplaySnapshot, CombatState } from "@Core/Types";
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

function getSelectedCrystalId(session: SessionData): string | undefined {
	return session.team.units.find((unit) => unit.isCore)?.cardId;
}

function buildTeamStateSignature(session: SessionData): string {
	return JSON.stringify(
		[...(session.team?.units ?? [])]
			.map((unit) => ({
				cardId: unit.cardId,
				rank: unit.rank,
				bonusPower: unit.bonusPower,
				bonusCritical: unit.bonusCritical,
				maxLife: unit.maxLife,
				isCore: unit.isCore,
				position: unit.position,
			}))
			.sort((left, right) => {
				const cardIdCompare = left.cardId.localeCompare(right.cardId);
				if (cardIdCompare !== 0) {
					return cardIdCompare;
				}

				if (left.rank !== right.rank) {
					return left.rank - right.rank;
				}

				if (left.position.x !== right.position.x) {
					return left.position.x - right.position.x;
				}

				return left.position.y - right.position.y;
			})
	);
}

function getStableUnitOrdering(units: Unit[]) {
	return [...units].sort((left, right) => {
		const coreCompare = Number(right.isCore) - Number(left.isCore);
		if (coreCompare !== 0) {
			return coreCompare;
		}

		const cardIdCompare = left.cardId.localeCompare(right.cardId);
		if (cardIdCompare !== 0) {
			return cardIdCompare;
		}

		if (left.rank !== right.rank) {
			return left.rank - right.rank;
		}

		if ((left.bonusPower ?? 0) !== (right.bonusPower ?? 0)) {
			return (left.bonusPower ?? 0) - (right.bonusPower ?? 0);
		}

		if ((left.maxLife ?? 0) !== (right.maxLife ?? 0)) {
			return (left.maxLife ?? 0) - (right.maxLife ?? 0);
		}

		return 0;
	});
}

function applySavedCombatPositions(baseSession: SessionData, savedSession: SessionData): SessionData {
	const replayUnits = getStableUnitOrdering(baseSession.team.units);
	const savedUnits = getStableUnitOrdering(savedSession.team.units);

	if (replayUnits.length !== savedUnits.length) {
		return baseSession;
	}

	const positionedUnits = replayUnits.map((unit, index) => ({
		...unit,
		position: { ...savedUnits[index].position },
	}));

	return {
		...baseSession,
		team: {
			units: positionedUnits,
		},
	};
}

export function reconstructCombatState(session: SessionData): CombatState | null {
	if (session.phase !== "combat") {
		return null;
	}

	const selectedCrystalId = getSelectedCrystalId(session);
	if (!selectedCrystalId) {
		return null;
	}

	let replaySession = createInitialSession(
		session.player_id,
		selectedCrystalId,
		session.initial_seed
	);
	let reconstructedCombatState: CombatState | null = null;

	for (const entry of session.action_log ?? []) {
		if (entry.actionId === "combat_encounter") {
			replaySession = applySavedCombatPositions(replaySession, session);
		}

		const result = transitionToNextState(replaySession, entry.actionId, entry.payload);
		replaySession = result.session;
		if (result.combatState) {
			reconstructedCombatState = result.combatState;
		}
	}

	if (!reconstructedCombatState) {
		return null;
	}

	const replaySnapshot = buildReplaySnapshot(replaySession);
	const targetSnapshot = buildReplaySnapshot(session);
	const snapshotsMatch = JSON.stringify(replaySnapshot) === JSON.stringify(targetSnapshot);
	const teamStateMatches = buildTeamStateSignature(replaySession) === buildTeamStateSignature(session);

	if (!snapshotsMatch || !teamStateMatches) {
		return null;
	}

	return reconstructedCombatState;
}
