import * as Models from "@game/Models";
import * as GameServer from "./GameServer";
import { Unit } from "@game/Models";
import * as State from "@Models/ClientState";
import * as handleShopPhase from "./Screens/Battleground/Phases/Shop/handleShopPhase";
import { onOrbApplied } from "./Screens/Battleground/Phases/OrbShop/handleOrbShopPhase";

async function dispatchAction(
	clientState: State.ClientState,
	action: Models.Action
): Promise<Models.ActionResponse> {
	return await GameServer.getServer()
		.handleAction(clientState.session.player_id, action);
}

export async function purchaseUnit(
	{
		clientState,
		unitId,
		targetSlot,
		shopCharaId = null,
	}: {
		clientState: State.ClientState
		unitId: string;
		targetSlot: Vec2 | null;
		shopCharaId?: string | null;
	}
) {
	const previousPhase = state.session.phase;
	const previousTeamUnits = JSON.parse(JSON.stringify(state.session.team.units)) as Unit[];

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

	state.session = session;

	await handleShopPhase.onUnitPurchased({
		clientState,
		unitId,
		previousTeamUnits,
		shopCharaId,
	});

	io.screens.battleground.events.phaseFinished.emit({ previousPhase });

}

export async function sellUnit(clientState: State.ClientState, unitId: string): Promise<Models.SessionData> {
	const { session } = await dispatchAction(clientState, {
		type: "discard_unit",
		unitId
	});

	state.session = session;

	await handleShopPhase.onUnitSold(unitId);

	return session;
}

export async function skipPhase(clientState: State.ClientState) {

	const previousPhase = state.session.phase;

	const { session } = await dispatchAction(
		clientState,
		{ type: "skip" }
	);

	state.session = session;

	io.screens.battleground.events.phaseFinished.emit({ previousPhase });

}

export async function selectEncounter(
	clientState: State.ClientState,
	encounterId: string
) {
	const previousPhase = state.session.phase;
	state.session.encounter_history = state.session.encounter_history || [];
	state.session.encounter_history.push(encounterId);
	const { session, combatState } = await dispatchAction(
		clientState,
		{
			type: "select_encounter",
			encounterId
		});
	state.session = session;
	if (combatState) {
		state.combatState = combatState;
	}

	io.screens.battleground.events.phaseFinished.emit({ previousPhase });
}

export async function applyOrb(
	clientState: State.ClientState,
	orbId: string,
	targetUnitId: string
): Promise<Models.SessionData> {
	const previousPhase = state.session.phase;

	const { session } = await dispatchAction(
		clientState,
		{
			type: "apply_orb",
			orbId,
			targetUnitId
		});

	state.session = session;

	await onOrbApplied({ clientState, orbId, targetUnitId, })

	io.screens.battleground.events.phaseFinished.emit({ previousPhase });

	return session;
}

export async function completeVictory(clientState: State.ClientState) {

	const previousPhase = state.session.phase;

	const { session } = await dispatchAction(
		clientState,
		{
			type: "victory"
		});
	state.session = session;

	io.screens.battleground.events.phaseFinished.emit({ previousPhase });
}

export async function completeCombatEncounter(clientState: State.ClientState) {

	const previousPhase = state.session.phase;

	const { wins, losses, round } = state.session;
	const { session } = await dispatchAction(
		clientState,
		{
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
	clientState: State.ClientState,
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
	State.resetState();
	io.screens.battleground.events.newRunRequested.emit(undefined);
}

export function requestMainMenu(): void {
	State.resetState();
	io.screens.battleground.events.mainMenuRequested.emit(undefined);
}

