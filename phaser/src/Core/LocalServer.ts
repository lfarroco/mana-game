import * as SessionManager from "@Core/SessionManager";
import * as GameLogic from "@Core/GameLogic";
import * as Types from "@Core/Types";

const cloneValue = <T>(value: T): T => {
	if (typeof globalThis.structuredClone === "function") {
		return globalThis.structuredClone(value);
	}

	return JSON.parse(JSON.stringify(value)) as T;
};

function getFallbackOptionsForPhase(phase: Types.PhaseType): Types.PhaseOption[] {
	switch (phase) {
		case "upgrade_core":
			return [
				{ id: "increase_core_max_life" },
				{ id: "upgrade_core_power" },
				{ id: "decrease_core_cooldown" },
			];
		case "add_reaction_core":
			return [
				{ id: "on_100_damage_effect" },
				{ id: "on_crit_effect" },
				{ id: "on_battle_start_effect" },
			];
		default:
			return [];
	}
}

function getCurrentOptions(session: Types.SessionData): Types.PhaseOption[] {
	return session.current_options;
}

export async function createSession(playerId: string, crystalId: string): Promise<Types.SessionData> {
	const session = GameLogic.createInitialSession(playerId, crystalId);
	session.id = `local-${playerId}-${Date.now()}`;
	SessionManager.updateSession(playerId, session);
	return session;
}

export async function getPhaseOptions(playerId: string): Promise<Types.PhaseOptions> {

	const { session } = state;

	const response: Types.PhaseOptions = {
		phase: session.phase as Types.PhaseType,
		round: session.round,
		options: [],
		team: cloneValue(session.team),
		wins: session.wins,
		losses: session.losses,
		runStats: session.runStats,
	};

	switch (session.phase) {
		case "encounter":
			if (session.current_options) {
				response.options = getCurrentOptions(session);
			} else {
				const encOpts = GameLogic.generateEncounterOptions(session);
				response.options = encOpts;
				session.current_options = encOpts;
				SessionManager.updateSession(playerId, session);
			}
			break;

		case "shop":
			if (session.current_options) {
				response.options = getCurrentOptions(session);
			} else {
				const shopOpts = GameLogic.generateShopOptions(session);
				response.options = shopOpts.options;
				session.current_options = shopOpts.options;
				SessionManager.updateSession(playerId, session);
			}
			break;

		case "combat":
			if (state.combatState) {
				response.combatState = cloneValue(state.combatState);
			}
			break;

		case "orb_shop":
		case "upgrade_core":
		case "add_reaction_core":
			if (session.current_options) {
				response.options = getCurrentOptions(session);
			}

			if (response.options.length === 0) {
				const fallbackOptions = getFallbackOptionsForPhase(session.phase as Types.PhaseType);
				if (fallbackOptions.length > 0) {
					response.options = fallbackOptions;
					session.current_options = fallbackOptions;
					SessionManager.updateSession(playerId, session);
				}
			}
			break;
	}

	return response;
}

export async function handleAction(
	playerId: string,
	actionId: string,
	payload?: Types.ActionPayload
): Promise<Types.SessionData> {

	const result = GameLogic.transitionToNextState(
		state.session,
		actionId,
		payload,
	);
	state.session = result.session;
	state.combatState = result.combatState ?? null;

	//eslint-disable-next-line no-console
	console.log("next state:: ", result);

	io.scene.events.emit("sessionUpdated", {
		actionId,
		session: result.session,
	})

	SessionManager.updateSession(playerId, result.session);

	return result.session;

}

export async function getSession(_playerId: string): Promise<Types.SessionData> {
	return Promise.resolve(state.session);
}