import * as Models from "@game/Models";
import * as GameServer from "./GameServer";
import { Unit } from "@game/Models";
import * as handleShopPhase from "./Screens/Battleground/Phases/Shop/handleShopPhase";
import { onOrbApplied } from "./Screens/Battleground/Phases/OrbShop/handleOrbShopPhase";
import { BattlegroundEvent } from "./Events";
import { env } from "@Env";

async function dispatchAction(
	action: Models.Action
): Promise<Models.ActionResponse> {
	return await GameServer.getServer()
		.handleAction(env.state.session.player_id, action);
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
	const previousPhase = env.state.session.phase;
	const previousTeamUnits = JSON.parse(JSON.stringify(env.state.session.team.units)) as Unit[];

	const previousTeamUnitIds = new Set(previousTeamUnits.map((u) => u.id));

	const { session } = await dispatchAction({
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

	env.state.session = session;

	await handleShopPhase.onUnitPurchased({
		unitId,
		previousTeamUnits,
		shopCharaId,
	});

	BattlegroundEvent.phaseFinished.emit({ previousPhase });

}

export async function sellUnit(unitId: string): Promise<Models.SessionData> {
	const { session } = await dispatchAction({
		type: "discard_unit",
		unitId
	});

	env.state.session = session;

	await handleShopPhase.onUnitSold(unitId);

	return session;
}

export async function skipPhase() {

	const previousPhase = env.state.session.phase;

	const { session } = await dispatchAction(
		{ type: "skip" }
	);

	env.state.session = session;

	BattlegroundEvent.phaseFinished.emit({ previousPhase });

}

export async function selectEncounter(
	encounterId: string
) {
	const previousPhase = env.state.session.phase;
	env.state.session.encounter_history = env.state.session.encounter_history || [];
	env.state.session.encounter_history.push(encounterId);
	const { session, combatState } = await dispatchAction({
		type: "select_encounter",
		encounterId
	});
	env.state.session = session;
	if (combatState) {
		env.state.combatState = combatState;
	}

	BattlegroundEvent.phaseFinished.emit({ previousPhase });
}

export async function applyOrb(
	orbId: string,
	targetUnitId: string
): Promise<Models.SessionData> {
	const previousPhase = env.state.session.phase;

	const { session } = await dispatchAction(
		{
			type: "apply_orb",
			orbId,
			targetUnitId
		});

	env.state.session = session;

	await onOrbApplied({ orbId, targetUnitId, })

	BattlegroundEvent.phaseFinished.emit({ previousPhase });

	return session;
}

export async function completeVictory() {

	const previousPhase = env.state.session.phase;

	const { session } = await dispatchAction(
		{
			type: "victory"
		});
	env.state.session = session;

	BattlegroundEvent.phaseFinished.emit({ previousPhase });
}

export async function completeCombatEncounter() {

	const previousPhase = env.state.session.phase;

	const { wins, losses, round } = env.state.session;
	const { session } = await dispatchAction(
		{
			type: "end_combat"
		});

	env.state.session = session;

	const winDelta = session.wins - wins;
	if (winDelta !== 0)
		BattlegroundEvent.winsChanged.emit({ wins, delta: winDelta })


	const lossesDelta = losses - session.losses;
	if (lossesDelta !== 0)
		BattlegroundEvent.livesChanged.emit({ lives: 4 - session.losses, delta: session.losses - losses })

	const roundDelta = round - session.round;
	if (roundDelta !== 0)
		BattlegroundEvent.roundChanged.emit({ round: session.round, delta: roundDelta })

	BattlegroundEvent.phaseFinished.emit({ previousPhase });
}

export async function updateTeam(
	team: { units: Unit[] }
): Promise<Models.SessionData> {
	const { session } = await dispatchAction(
		{
			type: "update_team",
			team
		});
	return session;
}

export function requestNewRun(): void {
	BattlegroundEvent.newRunRequested.emit(undefined);
}

export function requestMainMenu(): void {
	BattlegroundEvent.mainMenuRequested.emit(undefined);
}

