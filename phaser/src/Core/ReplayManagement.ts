/**
 * Replay and Snapshot Management
 *
 * Handles building replay manifests, snapshots, and replaying recorded runs.
 */

import * as Types from "@Core/Types";
import * as Unit from "@Models/Entities/Unit";
import * as SessionTransitions from "./SessionTransitions";
import * as SessionManagement from "./SessionManagement";

const cloneValue = <T>(value: T): T => {
	if (typeof globalThis.structuredClone === "function") {
		return globalThis.structuredClone(value);
	}

	return JSON.parse(JSON.stringify(value)) as T;
};

export type ReplayManifestOptions = {
	/**
	 * Server-generated enemy teams, indexed by combat order (0-based).
	 * When provided, each combat uses the stored team instead of generating a new one.
	 * This is the canonical team used to validate the run on the server.
	 */
	enemyTeams?: Unit.Unit[][];
};

/**
 * Replay a complete run from a RunManifest and return the final session.
 *
 * Reconstructs a fresh session from the manifest's initialSeed and selectedCrystalId,
 * then applies every ActionEnvelope in sequence order via transitionToNextState.
 * The resulting session can be compared against client-reported snapshot to validate the run.
 */
export function replayManifest(manifest: Types.RunManifest): {
	session: Types.SessionData;
	rejectReason?: string;
} {
	// Validate that actions are in order with no gaps
	for (let i = 0; i < manifest.actions.length; i++) {
		if (manifest.actions[i].sequence !== i + 1) {
			return {
				session: SessionManagement.createInitialSession(
					manifest.playerId,
					manifest.selectedCrystalId,
					manifest.initialSeed
				),
				rejectReason: `Action sequence gap: expected ${i + 1}, got ${manifest.actions[i].sequence}`,
			};
		}
	}

	let session = SessionManagement.createInitialSession(
		manifest.playerId,
		manifest.selectedCrystalId,
		manifest.initialSeed
	);

	// Assign a stable ID derived from the run manifest so the replayed session
	// is identifiable separately from in-progress client sessions.
	session.id = `replay-${manifest.runId}`;

	for (const envelope of manifest.actions) {

		const next = SessionTransitions.transitionToNextState(
			session,
			envelope.action,
		);
		session = next;
	}

	return { session };
}

/**
 * Build a ReplaySnapshot — the canonical, minimal description of a session
 * used as the comparison contract between client and server.
 */
export function buildReplaySnapshot(session: Types.SessionData): Types.ReplaySnapshot {
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

function getSelectedCrystalId(session: Types.SessionData): string | undefined {
	return session.team.units.find((unit) => unit.isCore)?.cardId;
}

function buildTeamStateSignature(session: Types.SessionData): string {
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

				if (left.position[0] !== right.position[0]) {
					return left.position[0] - right.position[0];
				}

				return left.position[1] - right.position[1];
			})
	);
}

function getStableUnitOrdering(units: Unit.Unit[]) {
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

function applySavedCombatPositions(baseSession: Types.SessionData, savedSession: Types.SessionData): Types.SessionData {
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

function reconstructCombatState(session: Types.SessionData): Types.CombatState | null {
	if (session.phase !== "combat") {
		return null;
	}

	const selectedCrystalId = getSelectedCrystalId(session);
	if (!selectedCrystalId) {
		return null;
	}

	let replaySession = SessionManagement.createInitialSession(
		session.player_id,
		selectedCrystalId,
		session.initial_seed
	);
	let reconstructedCombatState: Types.CombatState | null = null;

	for (const entry of session.action_log ?? []) {
		if (entry.action.type === "start_combat") {
			replaySession = applySavedCombatPositions(replaySession, session);
		}

		const result = SessionTransitions.transitionToNextState(replaySession, entry.action);
		replaySession = result;
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

export function constructCombatState(
	session: Types.SessionData,
	existingCombatState?: Types.CombatState | null
): Types.CombatState | null {
	if (session.phase !== "combat") {
		return null;
	}

	if (session.combatState) {
		return cloneValue(session.combatState);
	}

	if (existingCombatState) {
		return cloneValue(existingCombatState);
	}

	return reconstructCombatState(session);
}
