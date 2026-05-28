import * as Types from "@Core/Types";
import * as PhaseManager from "Client/Screens/Battleground/PhaseManager";
import * as GameServer from "@Core/GameServer";
import * as Unit from "@Models/Entities/Unit";

type ActionExecutionOptions = {
	autoStartPhase?: boolean;
};

export async function purchaseUnit(
	cardId: string,
	targetSlot?: number
): Promise<Types.SessionData> {
	const server = GameServer.getServer();
	const success = await server.handleAction(
		state.session.player_id,
		cardId,
		typeof targetSlot === "number" ? { targetSlot } : undefined,
	);

	return success;
}

export async function sellUnit(unitId: string): Promise<Types.SessionData> {
	const server = GameServer.getServer();
	return await server.handleAction(
		state.session.player_id,
		"discard_unit",
		{ unitId },
	);
}

export async function skipPhase(
	options: ActionExecutionOptions = {}
): Promise<Types.SessionData> {
	const server = GameServer.getServer();
	const { autoStartPhase = true } = options;

	// Determine the appropriate skip action based on current phase
	let actionId = "skip";
	if (state.session.phase === "encounter") {
		actionId = "skip_encounter";
	} else if (state.session.phase === "shop") {
		actionId = "skip_shop";
	}

	const success = await server.handleAction(
		state.session.player_id,
		actionId,
	);

	if (success && autoStartPhase) {
		await PhaseManager.startPhase();
	}

	return success;
}

export async function selectEncounter(encounterId: string): Promise<Types.SessionData> {
	const server = GameServer.getServer();
	const response = await server.handleAction(
		state.session.player_id, // TODO: remove arg
		encounterId,
	);

	return response;
}

export async function handleAction(
	actionId: string,
	payload?: Types.ActionPayload,
	options: ActionExecutionOptions = {}
): Promise<Types.SessionData> {
	const server = GameServer.getServer();
	const { autoStartPhase = true } = options;
	const inUpgradePhase = state.session.phase === "upgrade_core";
	const inReactionPhase = state.session.phase === "add_reaction_core";
	const isInPhaseUpgradeSelection =
		(inUpgradePhase &&
			["increase_core_max_life", "upgrade_core_power", "decrease_core_cooldown"].includes(
				actionId
			)) ||
		(inReactionPhase &&
			[
				"on_100_damage_effect",
				"on_ally_death_effect",
				"on_crit_effect",
				"on_battle_start_effect",
			].includes(actionId));

	const success = await server.handleAction(
		state.session.player_id,
		actionId,
		payload
	);

	if (success && !isInPhaseUpgradeSelection && autoStartPhase) {
		await PhaseManager.startPhase();
	}

	return success;
}

export async function updateTeam(
	team: { units: Unit.Unit[] }
): Promise<Types.SessionData> {
	const server = GameServer.getServer();
	return await server.handleAction(
		state.session.player_id,
		"update_team",
		{ team }
	);
}



/**
 * Features that can be enabled/disabled based on game mode.
 */
export type GameFeature =
	| "new_run_button" // Allow starting a new run from menu
	| "infinite_mode" // Allow entering infinite mode after victory
	| "skip_encounter" // Allow skipping encounters
	| "seed_selection"; // Allow selecting custom seeds
