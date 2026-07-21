import * as Models from "@game/Models";
import * as GameServer from "./GameServer";
import { Unit } from "@game/Models";
import { ClientState } from "@Models/ClientState";
import * as handleShopPhase from "./Screens/Battleground/Phases/Shop/handleShopPhase";
import { onOrbApplied } from "./Screens/Battleground/Phases/OrbShop/handleOrbShopPhase";

async function dispatchAction(
	clientState: ClientState,
	action: Models.Action
): Promise<Models.ActionResponse> {
	return await GameServer.getServer(clientState)
		.handleAction(clientState, clientState.session.player_id, action);
}

export async function purchaseUnit(
	{
		clientState,
		unitId,
		targetSlot,
		shopCharaId = null,
	}: {
		clientState: ClientState
		unitId: string;
		targetSlot: Vec2 | null;
		shopCharaId?: string | null;
	}
) {
	const previousPhase = clientState.session.phase;
	const previousTeamUnits = JSON.parse(JSON.stringify(clientState.session.team.units)) as Unit[];

	const previousTeamUnitIds = new Set(previousTeamUnits.map((u) => u.id));

	const { session } = await dispatchAction(clientState, {
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

	clientState.session = session;

	await handleShopPhase.onUnitPurchased({
		clientState,
		unitId,
		previousTeamUnits,
		shopCharaId,
	});

	io.screens.battleground.events.phaseFinished.emit({ previousPhase });

}

export async function sellUnit(clientState: ClientState, unitId: string): Promise<Models.SessionData> {
	const { session } = await dispatchAction(clientState, {
		type: "discard_unit",
		unitId
	});

	clientState.session = session;

	await handleShopPhase.onUnitSold(unitId);

	return session;
}

export async function skipPhase(clientState: ClientState) {

	const previousPhase = clientState.session.phase;

	const { session } = await dispatchAction(
		clientState,
		{ type: "skip" }
	);

	clientState.session = session;

	io.screens.battleground.events.phaseFinished.emit({ previousPhase });

}

export async function selectEncounter(
	clientState: ClientState,
	encounterId: string
) {
	const previousPhase = clientState.session.phase;
	clientState.session.encounter_history = clientState.session.encounter_history || [];
	clientState.session.encounter_history.push(encounterId);
	const { session, combatState } = await dispatchAction(
		clientState,
		{
			type: "select_encounter",
			encounterId
		});
	clientState.session = session;
	if (combatState) {
		clientState.combatState = combatState;
	}

	io.screens.battleground.events.phaseFinished.emit({ previousPhase });
}

export async function applyOrb(
	clientState: ClientState,
	orbId: string,
	targetUnitId: string
): Promise<Models.SessionData> {
	const previousPhase = clientState.session.phase;

	const { session } = await dispatchAction(
		clientState,
		{
			type: "apply_orb",
			orbId,
			targetUnitId
		});

	clientState.session = session;

	await onOrbApplied({ clientState, orbId, targetUnitId, })

	io.screens.battleground.events.phaseFinished.emit({ previousPhase });

	return session;
}

export async function completeVictory(clientState: ClientState) {

	const previousPhase = clientState.session.phase;

	const { session } = await dispatchAction(
		clientState,
		{
			type: "victory"
		});
	clientState.session = session;

	io.screens.battleground.events.phaseFinished.emit({ previousPhase });
}

export async function completeCombatEncounter(clientState: ClientState) {

	const previousPhase = clientState.session.phase;

	const { wins, losses, round } = clientState.session;
	const { session } = await dispatchAction(
		clientState,
		{
			type: "end_combat"
		});

	clientState.session = session;

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
	clientState: ClientState,
	team: { units: Unit[] }
): Promise<Models.SessionData> {
	const { session } = await dispatchAction(
		clientState,
		{
			type: "update_team",
			team
		});
	return session;
}

export function requestNewRun(): void {
	io.screens.battleground.events.newRunRequested.emit(undefined);
}

export function requestMainMenu(): void {
	io.screens.battleground.events.mainMenuRequested.emit(undefined);
}

