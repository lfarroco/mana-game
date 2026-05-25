import * as GameController from "@Core/GameController";
import * as Types from "@Core/Types";
import * as PhaseManager from "Client/Screens/Battleground/PhaseManager";
import * as GameServer from "@Core/GameServer";
import * as Unit from "@Models/Entities/Unit";
import * as ShopPanel from "@Systems/Shop/ShopPanel";

export async function purchaseUnit(
	cardId: string,
	_targetSlot?: number
): Promise<boolean> {
	const server = GameServer.getServer();
	const success = await server.handleAction(
		state.session.player_id,
		cardId,
	);

	if (success) {

		await ShopPanel.slideOut();
		await PhaseManager.startPhase();
	}

	return success;
}

export async function sellUnit(unitId: string): Promise<boolean> {
	const server = GameServer.getServer();
	return await server.handleAction(
		state.session.player_id,
		"discard_unit",
		{ unitId },
	);
}

export async function skipPhase(): Promise<boolean> {
	const server = GameServer.getServer();

	// Determine the appropriate skip action based on current phase
	let actionId = "skip";
	if (state.session.phase === "encounter") {
		actionId = "skip_encounter";
	} else if (state.session.phase === "shop") {
		actionId = "skip_shop";
	} else if (state.session.phase === "orb_shop") {
		actionId = "orb_shop_done";
	} else if (state.session.phase === "upgrade_core") {
		actionId = "upgrade_core_done";
	} else if (state.session.phase === "add_reaction_core") {
		actionId = "add_reaction_core_done";
	}

	const success = await server.handleAction(
		state.session.player_id,
		actionId,
	);

	if (success) {
		await PhaseManager.startPhase();
	}

	return success;
}

export async function selectEncounter(encounterId: string): Promise<boolean> {
	const server = GameServer.getServer();
	const success = await server.handleAction(
		state.session.player_id, // TODO: remove arg
		encounterId,
	);

	console.log(">>>", success)

	if (success) {
		await PhaseManager.startPhase();
	}

	return success;
}

export async function handleAction(actionId: string, payload?: Types.ActionPayload): Promise<boolean> {
	const server = GameServer.getServer();
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

	if (success && !isInPhaseUpgradeSelection) {
		await PhaseManager.startPhase();
	}

	return success;
}

export async function updateTeam(
	team: { units: Unit.Unit[] }
): Promise<boolean> {
	const server = GameServer.getServer();
	return await server.handleAction(
		state.session.player_id,
		"update_team",
		{ team }
	);
}

export async function notifyGameComplete(_actionId: string): Promise<boolean> {
	// In single-player, no server notification is needed for game completion
	// Just return true to allow the UI to proceed
	return true;
}

export function isFeatureEnabled(_feature: GameController.GameFeature): boolean {
	// In single-player mode, all features are enabled
	return true;
}

/**
 * Features that can be enabled/disabled based on game mode.
 */
export type GameFeature =
	| "new_run_button" // Allow starting a new run from menu
	| "infinite_mode" // Allow entering infinite mode after victory
	| "skip_encounter" // Allow skipping encounters
	| "seed_selection"; // Allow selecting custom seeds
