import * as Models from "@game/Models";
import * as GameServer from "@Core/GameServer";
import { Unit } from "@game/Models";
import * as State from "@Models/ClientState";
import * as handleShopPhase from "@Screens/Battleground/Phases/Shop/handleShopPhase";
import { onOrbApplied } from "@Screens/Battleground/Phases/OrbShop/handleOrbShopPhase";

const getCurrentPlayerId = () => state.session.player_id;

async function dispatchAction(
	action: Models.Action
): Promise<Models.SessionData> {
	return await GameServer.getServer().handleAction(getCurrentPlayerId(), action);
}

export async function purchaseUnit(
	{
		unitId,
		targetSlot,
		shopCharaId = null,
	}: {
		unitId: string;
		targetSlot: Vec2 | null;
		shopCharaId?: string | null;
	}
) {
	const previousPhase = state.session.phase;
	const previousTeamUnits = JSON.parse(JSON.stringify(state.session.team.units)) as Unit[];

	const previousTeamUnitIds = new Set(previousTeamUnits.map((u) => u.id));

	const session = await dispatchAction({
		type: "recruit_unit",
		unitId,
		targetSlot
	});

	const wasUpgrade = previousTeamUnits.some((u) => u.cardId === unitId);
	const didAddUnit = session.team.units.find(
		(u) => u.cardId === unitId && !previousTeamUnitIds.has(u.id)
	);

	// TODO: check if this is necessary
	if (!wasUpgrade && !didAddUnit) {
		// Purchase silently failed (e.g., board is full) — skip UI playback.
		return;
	}

	state.session = session;

	await handleShopPhase.onUnitPurchased({
		session,
		unitId,
		previousTeamUnits,
		shopCharaId,
	});

	io.screens.battleground.events.phaseFinished.emit({ previousPhase });

}

export async function sellUnit(unitId: string): Promise<Models.SessionData> {
	const session = await dispatchAction({
		type: "discard_unit",
		unitId
	});

	state.session = session;

	await handleShopPhase.onUnitSold(unitId);

	return session;
}

export async function skipPhase() {

	const previousPhase = state.session.phase;

	const session = await dispatchAction({
		type: "skip"
	});

	state.session = session;

	io.screens.battleground.events.phaseFinished.emit({ previousPhase });

}

export async function selectEncounter(encounterId: string) {
	const previousPhase = state.session.phase;
	state.session.encounter_history = state.session.encounter_history || [];
	state.session.encounter_history.push(encounterId);
	const session = await dispatchAction({
		type: "select_encounter",
		encounterId
	});
	state.session = session;

	io.screens.battleground.events.phaseFinished.emit({ previousPhase });
}

export async function applyOrb(
	orbId: string,
	targetUnitId: string
): Promise<Models.SessionData> {
	const previousPhase = state.session.phase;

	const session = await dispatchAction({
		type: "apply_orb",
		orbId,
		targetUnitId
	});

	state.session = session;

	await onOrbApplied({ session, orbId, targetUnitId, })

	io.screens.battleground.events.phaseFinished.emit({ previousPhase });

	return session;
}

export async function completeVictory() {

	const previousPhase = state.session.phase;

	const session = await dispatchAction({
		type: "victory"
	});
	state.session = session;

	io.screens.battleground.events.phaseFinished.emit({ previousPhase });
}

export async function completeCombatEncounter() {

	const previousPhase = state.session.phase;

	const { wins, losses, round } = state.session;
	const session = await dispatchAction({
		type: "end_combat"
	});

	state.session = session;

	const { events } = io.screens.battleground;

	const winDelta = session.wins - wins;
	if (winDelta !== 0)
		events.onWinsChanged.emit({ wins, delta: winDelta })


	const lossesDelta = losses - session.losses;
	if (lossesDelta !== 0)
		events.onLivesChanged.emit({ lives: 4 - session.losses, delta: session.losses - losses })

	const roundDelta = round - session.round;
	if (roundDelta !== 0)
		events.onRoundChanged.emit({ round: session.round, delta: roundDelta })

	io.screens.battleground.events.phaseFinished.emit({ previousPhase });
}

export async function updateTeam(
	team: { units: Unit[] }
): Promise<Models.SessionData> {
	return await dispatchAction({
		type: "update_team",
		team
	});
}

export function requestNewRun(): void {
	State.resetState();
	io.screens.battleground.events.newRunRequested.emit(undefined);
}

export function requestMainMenu(): void {
	State.resetState();
	io.screens.battleground.events.mainMenuRequested.emit(undefined);
}

