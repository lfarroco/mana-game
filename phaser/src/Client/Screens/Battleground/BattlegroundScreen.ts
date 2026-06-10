import * as Board from "@Models/Board";
import * as Types from "@Core/Types";
import * as SessionManager from "@Core/SessionManager";
import * as AudioManager from "@Systems/AudioManager";
import * as Tooltip from "@Components/Tooltip/Tooltip";
import * as Chara from "@Systems/Chara/Chara";
import * as Encounter from "./Phases/Encounter/Encounter";
import * as handleCombatPhase from "./Phases/Combat/handleCombatPhase";

import * as Components from "./Components";
import * as Phases from "./Phases";
import * as UI from "./Components/UI/UI";
import * as animation from "@Utils/animation";

type BattlegroundScreenEvents = {
	phaseFinished: Types.Event<Types.PhaseType>;
	sessionUpdated: Types.Event<{ session: Types.SessionData, action: Types.Action }>;
	onUnitPurchased: Types.Event<{ session: Types.SessionData, unitId: string }>;
	onShopUnitDragPurchaseFailed: Types.Event<{ shopCharaId: string, dragStartVec: Vec2 }>;
	combatContinueRequested: Types.Event<void>;
	combatReplayRequested: Types.Event<void>;
	combatPauseRequested: Types.Event<void>;
	combatResumeRequested: Types.Event<void>;
}

export let events: BattlegroundScreenEvents;

type SessionHudSnapshot = {
	round: number;
	wins: number;
	lives: number;
};

let previousSessionHudSnapshot: SessionHudSnapshot | null = null;

const createSessionHudSnapshot = (session: Types.SessionData): SessionHudSnapshot => ({
	round: session.round,
	wins: session.wins,
	lives: SessionManager.getRemainingLives(session),
});

function updateHudFromSessionChanges(_previousPhase: Types.PhaseType): void {
	const currentSnapshot = createSessionHudSnapshot(state.session);

	if (!previousSessionHudSnapshot) {
		previousSessionHudSnapshot = currentSnapshot;
		return;
	}

	const winsDelta = currentSnapshot.wins - previousSessionHudSnapshot.wins;
	if (winsDelta !== 0) {
		UI.events.onWinsChanged(currentSnapshot.wins, winsDelta);
	}

	const livesDelta = currentSnapshot.lives - previousSessionHudSnapshot.lives;
	if (livesDelta !== 0) {
		UI.events.onLivesChanged(currentSnapshot.lives, livesDelta);
	}

	if (currentSnapshot.round !== previousSessionHudSnapshot.round) {
		UI.events.onRoundChanged(currentSnapshot.round);
	}

	previousSessionHudSnapshot = currentSnapshot;
}

let initialized = false;
function init() {
	if (initialized) return;
	initialized = true;
	events = {
		phaseFinished: io.createEvent<Types.PhaseType>("phaseFinished"),
		sessionUpdated: io.createEvent<{ session: Types.SessionData, action: Types.Action }>("sessionUpdated"),
		onUnitPurchased: io.createEvent<{ session: Types.SessionData, unitId: string }>("onUnitPurchased"),
		onShopUnitDragPurchaseFailed: io.createEvent<{ shopCharaId: string, dragStartVec: Vec2 }>("onShopUnitDragPurchaseFailed"),
		combatContinueRequested: io.createEvent<void>("combatContinueRequested"),
		combatReplayRequested: io.createEvent<void>("combatReplayRequested"),
		combatPauseRequested: io.createEvent<void>("combatPauseRequested"),
		combatResumeRequested: io.createEvent<void>("combatResumeRequested"),
	};

	events.phaseFinished.listen(handleCurrentPhase);
	events.phaseFinished.listen(updateHudFromSessionChanges);
}

// TODO: should be part of the player board logic
const shouldRefreshPlayerUnit = (unitId: string, expectedPower: number, expectedRank: number): boolean => {
	if (!Chara.hasCharaById(unitId)) {
		return false;
	}

	const renderedUnit = Chara.getUnit(Chara.mustGetCharaById(unitId));
	return renderedUnit.power !== expectedPower || renderedUnit.rank !== expectedRank;
};

// TODO: should be part of the player board logic
const syncPlayerBoardUnits = async (): Promise<void> => {
	const summonPromises = state.session.team.units.map(async (unit, index) => {
		if (!Chara.hasCharaById(unit.id)) {
			await animation.delay(index * 200);
			await Chara.summon(unit, true);
			return;
		}

		if (!shouldRefreshPlayerUnit(unit.id, unit.power, unit.rank)) {
			return;
		}

		const chara = Chara.mustGetCharaById(unit.id);
		Chara.destroy(chara);
		await Chara.summon(unit, true);
	});

	await Promise.all(summonPromises);
};

// const updateSessionState = (nextSession: Types.SessionData) => {
// 	const previousSession = state.session;
// 	const winsDelta = nextSession.wins - previousSession.wins;
// 	const previousLives = SessionManager.getRemainingLives(previousSession);
// 	const nextLives = SessionManager.getRemainingLives(nextSession);
// 	const livesDelta = nextLives - previousLives;

// 	state.session = nextSession;

// 	UIManager.events.onWinsChanged(nextSession.wins, winsDelta);
// 	if (livesDelta !== 0) {
// 		UIManager.events.onLivesChanged(nextLives, livesDelta);
// 	}
// 	UIManager.events.onRoundChanged(nextSession.round);
// 	SessionManager.updateSession(nextSession.player_id, nextSession);
// };

export const create = async () => {

	init();

	Components.create();
	previousSessionHudSnapshot = createSessionHudSnapshot(state.session);

	AudioManager.playMusic("music_battlemap_vetruv");

	Tooltip.init();

	// TODO: input enable/disable should be screen-scoped
	Board.setIsInputEnabled(true);

	// ~~~~~ // ~~~~~ //

	handleCurrentPhase();

};

async function executePhase(
	phase: Types.PhaseType,
) {

	if (phase !== 'combat') {
		await syncPlayerBoardUnits();
	}

	switch (phase) {
		case "encounter":
			return await Encounter.displayOptions();

		case "pre_combat":
			return await Encounter.displayOptions();

		case "combat": {
			return await handleCombatPhase.handleCombatPhase();
		}

		case "shop":
			return Phases.handleShopPhase();

		case "upgrade_core":
			return await Phases.handleUpgradeCorePhase();

		case "add_reaction_core":
			return await Phases.handleAddReactionCorePhase();

		case "orb_shop":
			return await Phases.handleOrbShopPhase();

		case "victory":
			return await Phases.handleVictoryPhase();

		case "game_over":
			return await Phases.handleGameOverPhase();

		default:
			((_: never) => { })(phase)
			return null;
	}
}

async function handleCurrentPhase() {

	//updateSessionState(state.session);

	executePhase(state.session.phase);

	//events.phaseFinished.emit(previousPhase);

}


