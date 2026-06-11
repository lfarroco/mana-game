import * as Types from "@Core/Types";
import * as GameServer from "@Core/GameServer";
import * as Unit from "@Models/Entities/Unit";
import * as State from "@Models/State";

const getCurrentPlayerId = () => state.session.player_id;

async function dispatchAction(
	action: Types.Action
): Promise<Types.SessionData> {
	return await GameServer.getServer().handleAction(getCurrentPlayerId(), action);
}

export async function purchaseUnit(
	unitId: string,
	targetSlot: Vec2 | null
) {
	const previousPhase = state.session.phase;

	const session = await dispatchAction({
		type: "recruit_unit",
		unitId,
		targetSlot
	});

	state.session = session;

	io.screens.battleground.events.onUnitPurchased.emit({
		session,
		unitId
	});

	io.screens.battleground.events.phaseFinished.emit(previousPhase);

}

export async function sellUnit(unitId: string): Promise<Types.SessionData> {
	return await dispatchAction({
		type: "discard_unit",
		unitId
	});
}

export async function skipPhase() {

	const previousPhase = state.session.phase;

	const session = await dispatchAction({
		type: "skip"
	});

	state.session = session;

	io.screens.battleground.events.phaseFinished.emit(previousPhase);

}

export async function selectEncounter(encounterId: string) {
	const previousPhase = state.session.phase;
	const session = await dispatchAction({
		type: "select_encounter",
		encounterId
	});
	state.session = session;
	io.screens.battleground.events.phaseFinished.emit(previousPhase);
}

export async function handleAction(
	payload: Types.Action
): Promise<Types.SessionData> {
	const success = await dispatchAction(payload);

	io.screens.battleground.events.sessionUpdated.emit({
		action: payload,
		session: success,
	});

	return success;
}

export async function applyOrb(
	orbId: string,
	targetUnitId: string
): Promise<Types.SessionData> {
	const previousPhase = state.session.phase;

	const session = await dispatchAction({
		type: "apply_orb",
		orbId,
		targetUnitId
	});

	state.session = session;

	io.screens.battleground.events.orbApplied.emit({
		session,
		orbId,
		targetUnitId,
	});

	io.screens.battleground.events.phaseFinished.emit(previousPhase);

	return session;
}

export async function completeVictory() {

	const previousPhase = state.session.phase;

	const session = await dispatchAction({
		type: "victory"
	});
	state.session = session;

	io.screens.battleground.events.phaseFinished.emit(previousPhase);
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

	io.screens.battleground.events.phaseFinished.emit(previousPhase);
}

export async function updateTeam(
	team: { units: Unit.Unit[] }
): Promise<Types.SessionData> {
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

