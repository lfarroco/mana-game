import * as Types from "@Core/Types";
import * as GameServer from "@Core/GameServer";
import * as Unit from "@Models/Entities/Unit";

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

export async function skipPhase(): Promise<Types.SessionData> {
	const server = GameServer.getServer();

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
	payload?: Types.ActionPayload
): Promise<Types.SessionData> {
	const server = GameServer.getServer();

	const success = await server.handleAction(
		state.session.player_id,
		actionId,
		payload
	);

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
