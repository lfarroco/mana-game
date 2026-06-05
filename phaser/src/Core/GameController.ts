import * as Types from "@Core/Types";
import * as GameServer from "@Core/GameServer";
import * as Unit from "@Models/Entities/Unit";

const getCurrentPlayerId = () => state.session.player_id;

async function dispatchAction(
	actionId: string,
	payload?: Types.ActionPayload
): Promise<Types.SessionData> {
	return await GameServer.getServer().handleAction(getCurrentPlayerId(), actionId, payload);
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
	return await dispatchAction("skip");
}

export async function selectEncounter(encounterId: string): Promise<Types.SessionData> {
	return await dispatchAction(encounterId);
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

export async function updateTeam(
	team: { units: Unit.Unit[] }
): Promise<Types.SessionData> {
	return await dispatchAction(
		"update_team",
		{ team }
	);
}

