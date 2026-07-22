import * as Board from "@Components/Board/Board";
import * as Models from "@game/Models";
import * as AudioManager from "@Systems/AudioManager";
import * as Tooltip from "@Components/Tooltip/Tooltip";
import * as Chara from "@Systems/Chara/Chara";
import * as Encounter from "./Phases/Encounter/Encounter";
import * as handleCombatPhase from "./Phases/Combat/handleCombatPhase";

import * as Components from "./Components";
import * as Phases from "./Phases";
import * as animation from "@Utils/animation";
import { getRemainingLives } from "../../SessionManager";
import { ClientState, initialState } from "@Models/ClientState";
import { env } from "../../Env";

const BATTLEGROUND_EXIT_EVENT = "battleground:exit";

const emitBattlegroundExit = () => {
	io.scene.events.emit(BATTLEGROUND_EXIT_EVENT);
};

const transitionFromBattleground = async (renderScreen: () => void): Promise<void> => {
	emitBattlegroundExit();
	await env.phaser.FadeOut(300, 0x000000);
	env.phaser.clean();
	renderScreen();
	await env.phaser.FadeIn(300);
};

type BattlegroundScreenEvents = {
	phaseFinished: Models.Event<{ previousPhase: Models.PhaseType }>;
	onShopUnitDragPurchaseFailed: Models.Event<{ shopCharaId: string, dragStartVec: Vec2 }>;
	orbApplyRequested: Models.Event<{ orbId: string, targetUnitId: string }>;
	combatContinueRequested: Models.Event<void>;
	combatReplayRequested: Models.Event<void>;
	combatPauseRequested: Models.Event<void>;
	combatResumeRequested: Models.Event<void>;
	newRunRequested: Models.Event<void>;
	mainMenuRequested: Models.Event<void>;
	onWinsChanged: Models.Event<{ wins: number, delta: number }>;
	onLivesChanged: Models.Event<{ lives: number, delta: number }>;
	onRoundChanged: Models.Event<{ round: number, delta: number }>;
}

export let events: BattlegroundScreenEvents;

type SessionHudSnapshot = {
	round: number;
	wins: number;
	lives: number;
};

let previousSessionHudSnapshot: SessionHudSnapshot | null = null;

const createSessionHudSnapshot = (session: Models.SessionData): SessionHudSnapshot => ({
	round: session.round,
	wins: session.wins,
	lives: getRemainingLives(session),
});

function updateHudFromSessionChanges(clientState: ClientState, _payload: { previousPhase: Models.PhaseType }): void {
	const currentSnapshot = createSessionHudSnapshot(clientState.session);

	if (!previousSessionHudSnapshot) {
		previousSessionHudSnapshot = currentSnapshot;
		return;
	}

	const winsDelta = currentSnapshot.wins - previousSessionHudSnapshot.wins;
	if (winsDelta !== 0) {
	}

	const livesDelta = currentSnapshot.lives - previousSessionHudSnapshot.lives;
	if (livesDelta !== 0) {
	}

	if (currentSnapshot.round !== previousSessionHudSnapshot.round) {
	}

	previousSessionHudSnapshot = currentSnapshot;
}

let initialized = false;
function init(clientState: ClientState) {
	if (initialized) return;
	initialized = true;
	events = {
		phaseFinished: env.createEventChannel<{ previousPhase: Models.PhaseType }>("phaseFinished"),
		onShopUnitDragPurchaseFailed: env.createEventChannel<{ shopCharaId: string, dragStartVec: Vec2 }>("onShopUnitDragPurchaseFailed"),
		orbApplyRequested: env.createEventChannel<{ orbId: string, targetUnitId: string }>("orbApplyRequested"),
		combatContinueRequested: env.createEventChannel<void>("combatContinueRequested"),
		combatReplayRequested: env.createEventChannel<void>("combatReplayRequested"),
		combatPauseRequested: env.createEventChannel<void>("combatPauseRequested"),
		combatResumeRequested: env.createEventChannel<void>("combatResumeRequested"),
		newRunRequested: env.createEventChannel<void>("newRunRequested"),
		mainMenuRequested: env.createEventChannel<void>("mainMenuRequested"),
		onWinsChanged: env.createEventChannel<{ wins: number, delta: number }>("onWinsChanged"),
		onLivesChanged: env.createEventChannel<{ lives: number, delta: number }>("onLivesChanged"),
		onRoundChanged: env.createEventChannel<{ round: number, delta: number }>("onRoundChanged"),
	};

	events.phaseFinished.listen(handleCurrentPhase(clientState));
	events.phaseFinished.listen((payload) => updateHudFromSessionChanges(clientState, payload));
	events.newRunRequested.listen(() => {
		Object.assign(clientState, initialState());
		void transitionFromBattleground(() => io.screens.crystalSelection(clientState));
	});
	events.mainMenuRequested.listen(() => {
		Object.assign(clientState, initialState());
		void transitionFromBattleground(() => io.screens.title.create(clientState));
	});

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
const syncPlayerBoardUnits = async (clientState: ClientState): Promise<void> => {
	const summonPromises = clientState.session.team.units.map(async (unit, index) => {
		if (!Chara.hasCharaById(unit.id)) {
			await animation.delay(index * 200);
			await Chara.summon(clientState, unit, true);
			return;
		}

		if (!shouldRefreshPlayerUnit(unit.id, unit.power, unit.rank)) {
			return;
		}

		const chara = Chara.mustGetCharaById(unit.id);
		Chara.destroy(chara);
		await Chara.summon(clientState, unit, true);
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

export const create = async (clientState: ClientState) => {

	init(clientState);

	Components.create(clientState);
	previousSessionHudSnapshot = createSessionHudSnapshot(clientState.session);

	AudioManager.playMusic("music_battlemap_vetruv");

	Tooltip.init();

	// TODO: input enable/disable should be screen-scoped
	Board.setIsInputEnabled(true);

	// ~~~~~ // ~~~~~ //

	handleCurrentPhase(clientState)({});

};

async function executePhase(
	clientState: ClientState,
	phase: Models.PhaseType,
	previousPhase?: Models.PhaseType,
) {

	if (phase !== 'combat' && previousPhase !== 'combat') {
		await syncPlayerBoardUnits(clientState);
	}

	switch (phase) {
		case "encounter":
			return await Encounter.displayOptions(clientState);

		case "pre_combat":
			return await Encounter.displayOptions(clientState);

		case "combat": {
			return await handleCombatPhase.handleCombatPhase(clientState);
		}

		case "shop":
			return Phases.handleShopPhase(clientState);

		case "upgrade_core":
			return await Phases.handleUpgradeCorePhase(clientState);

		case "add_reaction_core":
			return await Phases.handleAddReactionCorePhase(clientState);

		case "orb_shop":
			return await Phases.handleOrbShopPhase(clientState);

		case "victory":
			return await Phases.handleVictoryPhase(clientState);

		case "game_over":
			return await Phases.handleGameOverPhase(clientState);

		default:
			((_: never) => { })(phase)
			return null;
	}
}

const handleCurrentPhase = (
	clientState: ClientState,
) => async ({ previousPhase }: {
	previousPhase?: Models.PhaseType
}) => {

		//updateSessionState(state.session);

		await executePhase(clientState, clientState.session.phase, previousPhase);

		//events.phaseFinished.emit(previousPhase);

	}


