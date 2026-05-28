import * as Types from "@Core/Types";
import * as GameServer from "@Core/GameServer";
import * as Unit from "@Models/Entities/Unit";

const getServer = () => GameServer.getServer();

const getCurrentPlayerId = () => state.session.player_id;

async function dispatchAction(
	actionId: string,
	payload?: Types.ActionPayload
): Promise<Types.SessionData> {
	return await getServer().handleAction(getCurrentPlayerId(), actionId, payload);
}

export async function purchaseUnit(
	cardId: string,
	targetSlot?: number
): Promise<Types.SessionData> {
	const success = await dispatchAction(
		cardId,
		typeof targetSlot === "number" ? { targetSlot } : undefined,
	);

	return success;
}

export async function sellUnit(unitId: string): Promise<Types.SessionData> {
	return await dispatchAction(
		"discard_unit",
		{ unitId },
	);
}

export async function skipPhase(): Promise<Types.SessionData> {
	// Determine the appropriate skip action based on current phase
	let actionId = "skip";
	if (state.session.phase === "encounter") {
		actionId = "skip_encounter";
	} else if (state.session.phase === "shop") {
		actionId = "skip_shop";
	}

	const success = await dispatchAction(actionId);

	return success;
}

export async function selectEncounter(encounterId: string): Promise<Types.SessionData> {
	return await selectPhaseOption(encounterId);
}

export async function selectPhaseOption(optionId: string): Promise<Types.SessionData> {
	return await dispatchAction(optionId);
}

export async function handleAction(
	actionId: string,
	payload?: Types.ActionPayload
): Promise<Types.SessionData> {
	const success = await dispatchAction(actionId, payload);

	return success;
}

export async function applyOrb(
	orbId: string,
	targetUnitId: string
): Promise<Types.SessionData> {
	return await dispatchAction("apply_orb", { orbId, targetUnitId });
}

export async function completeVictory(): Promise<Types.SessionData> {
	return await dispatchAction("victory");
}

export async function getCurrentPhaseOptions(): Promise<Types.PhaseOptions> {
	return await getServer().getPhaseOptions(getCurrentPlayerId());
}

export async function getCurrentCombatState(): Promise<Types.CombatState | null> {
	const phaseOptions = await getCurrentPhaseOptions();
	return phaseOptions.combatState ?? null;
}

export async function updateTeam(
	team: { units: Unit.Unit[] }
): Promise<Types.SessionData> {
	return await dispatchAction(
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
