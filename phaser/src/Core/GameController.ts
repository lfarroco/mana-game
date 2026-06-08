import * as Types from "@Core/Types";
import * as GameServer from "@Core/GameServer";
import * as Unit from "@Models/Entities/Unit";

const getCurrentPlayerId = () => state.session.player_id;

async function dispatchAction(
	action: Types.Action
): Promise<Types.SessionData> {
	return await GameServer.getServer().handleAction(getCurrentPlayerId(), action);
}

export async function purchaseUnit(
	unitId: string,
	targetSlot: Vec2 | null
): Promise<Types.SessionData> {
	const success = await dispatchAction({
		type: "recruit_unit",
		unitId,
		targetSlot
	});

	return success;
}

export async function sellUnit(unitId: string): Promise<Types.SessionData> {
	return await dispatchAction({
		type: "discard_unit",
		unitId
	});
}

export async function skipPhase(): Promise<Types.SessionData> {
	return await dispatchAction({
		type: "skip"
	});
}

export async function selectEncounter(encounterId: string): Promise<Types.SessionData> {
	return await dispatchAction({
		type: "select_encounter",
		encounterId
	});
}

export async function handleAction(
	payload: Types.Action
): Promise<Types.SessionData> {
	const success = await dispatchAction(payload);

	return success;
}

export async function applyOrb(
	orbId: string,
	targetUnitId: string
): Promise<Types.SessionData> {
	return await dispatchAction({
		type: "apply_orb",
		orbId,
		targetUnitId
	});
}

export async function completeVictory(): Promise<Types.SessionData> {
	return await dispatchAction({
		type: "victory"
	});
}

export async function completeCombatEncounter(): Promise<Types.SessionData> {
	return await dispatchAction({
		type: "end_combat"
	});
}

export async function updateTeam(
	team: { units: Unit.Unit[] }
): Promise<Types.SessionData> {
	return await dispatchAction({
		type: "update_team",
		team
	});
}

