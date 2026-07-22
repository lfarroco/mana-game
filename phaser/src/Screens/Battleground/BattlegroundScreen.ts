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
import { initialState } from "@Models/ClientState";
import { env } from "../../Env";
import { BattlegroundEvent } from "../../Events";

const BATTLEGROUND_EXIT_EVENT = "battleground:exit";

const emitBattlegroundExit = () => {
	io.scene.events.emit(BATTLEGROUND_EXIT_EVENT);
};

const transitionFromBattleground = async (renderScreen: () => void): Promise<void> => {
	emitBattlegroundExit();
	const cam = env.scene.cameras.main;
	await new Promise<void>((resolve) => {
		cam.fade(300, 0, 0, 0);
		cam.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, resolve);
	});
	env.scene.children.each((c) => c.destroy());
	env.scene.children.removeAll();
	env.scene.tweens.killAll();
	env.scene.time.removeAllEvents();
	renderScreen();
	await new Promise<void>((resolve) => {
		cam.fadeIn(300);
		cam.once(Phaser.Cameras.Scene2D.Events.FADE_IN_COMPLETE, resolve);
	});
};


type SessionHudSnapshot = {
	round: number;
	wins: number;
	lives: number;
};

let previousSessionHudSnapshot: SessionHudSnapshot | null = null;

const createSessionHudSnapshot = (): SessionHudSnapshot => ({
	round: env.state.session.round,
	wins: env.state.session.wins,
	lives: getRemainingLives(env.state.session),
});

function updateHudFromSessionChanges(_payload: { previousPhase: Models.PhaseType }): void {
	const currentSnapshot = createSessionHudSnapshot();

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
function init() {
	if (initialized) return;
	initialized = true;

	BattlegroundEvent.phaseFinished.listen(handleCurrentPhase);
	BattlegroundEvent.phaseFinished.listen(updateHudFromSessionChanges);
	BattlegroundEvent.newRunRequested.listen(() => {
		Object.assign(env.state, initialState());
		void transitionFromBattleground(io.screens.crystalSelection);
	});
	BattlegroundEvent.mainMenuRequested.listen(() => {
		Object.assign(env.state, initialState());
		void transitionFromBattleground(io.screens.title.create);
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
const syncPlayerBoardUnits = async (): Promise<void> => {
	const summonPromises = env.state.session.team.units.map(async (unit, index) => {
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
	previousSessionHudSnapshot = createSessionHudSnapshot();

	AudioManager.playMusic("music_battlemap_vetruv");

	Tooltip.init();

	// TODO: input enable/disable should be screen-scoped
	Board.setIsInputEnabled(true);

	// ~~~~~ // ~~~~~ //

	handleCurrentPhase({});

};

async function executePhase(
	phase: Models.PhaseType,
	previousPhase?: Models.PhaseType,
) {

	if (phase !== 'combat' && previousPhase !== 'combat') {
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

		case "game_over":
			return await Phases.handleGameOverPhase();

		case "victory": // TODO: handle viictory
			return await Phases.handleGameOverPhase();

		default:
			((_: never) => { })(phase)
			return null;
	}
}

const handleCurrentPhase = async ({ previousPhase }: {
	previousPhase?: Models.PhaseType
}) => {

	//updateSessionState(state.session);

	await executePhase(env.state.session.phase, previousPhase);

	//events.phaseFinished.emit(previousPhase);

}


