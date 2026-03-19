import * as GameLogic from "@Core/GameLogic";
import { TransitionToNextStateOptions } from "@Core/GameLogic";
import { SessionData, ActionPayload, RunManifest } from "@Core/Types";
import { Unit } from "@Models/Entities/Unit";

// MultiplayerLogic provides a class interface for the GameLogic functions
// for backward compatibility with Supabase functions
export class MultiplayerLogic {
	static createInitialSession(playerId: string, selectedCrystalId?: string) {
		return GameLogic.createInitialSession(playerId, selectedCrystalId);
	}

	static validateAndApplyTeamUpdate(session: SessionData, newTeam: { units: Unit[] }) {
		return GameLogic.validateAndApplyTeamUpdate(session, newTeam);
	}

	static resolveAction(session: SessionData, actionId: string, payload?: ActionPayload) {
		return GameLogic.resolveAction(session, actionId, payload);
	}

	static transitionToNextState(
		session: SessionData,
		actionId: string,
		payload?: ActionPayload,
		options?: TransitionToNextStateOptions
	) {
		return GameLogic.transitionToNextState(session, actionId, payload, options);
	}

	static replayManifest(manifest: RunManifest) {
		return GameLogic.replayManifest(manifest);
	}

	static buildReplaySnapshot(session: SessionData) {
		return GameLogic.buildReplaySnapshot(session);
	}
}
