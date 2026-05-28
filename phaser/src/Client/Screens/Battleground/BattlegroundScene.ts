import * as Board from "@Models/Board";
import * as OptionsStore from "@Models/OptionsStore";
import * as GameController from "@Core/GameController";
import type { PhaseType, SessionData } from "@Core/Types";
import * as AudioManager from "@Systems/AudioManager";
import * as ControlsSystem from "@Systems/Controls";
import * as Tooltip from "@Components/Tooltip";
import * as animation from "@Utils/animation";
import * as Chara from "@Systems/Chara/Chara";
import * as Encounter from "@Systems/Encounter";
import * as handleCombatPhase from "@Screens/Battleground/handleCombatPhase";
import * as ResultsUI from "./Results/ResultsUI";
import * as handleShopPhase from "./Shop/handleShopPhase";
import * as SessionManager from "@Core/SessionManager";

import * as Shop from "./Shop/ShopPanel";
import * as Components from "./Components";
import * as UIManager from "./Components/UI/UI";
import * as handleUpgradeCorePhase from "./Phases/handleUpgradeCorePhase";
import * as handleAddReactionCorePhase from "./Phases/handleAddReactionCorePhase";
import * as handleOrbShopPhase from "./Shop/handleOrbShopPhase";

const DEFAULT_SCENE_SOUND_VOLUME = 0.05;

type PhaseExecutionResult = SessionData | null;

const getLivesFromSession = (session: SessionData) => 4 - session.losses;

const assertNeverPhase = (phase: never): never => {
	throw new Error(`Unknown phase: ${phase}`);
};

const updateSessionState = (nextSession: SessionData) => {
	const previousSession = state.session;
	const winsDelta = nextSession.wins - previousSession.wins;
	const previousLives = getLivesFromSession(previousSession);
	const nextLives = getLivesFromSession(nextSession);
	const livesDelta = nextLives - previousLives;

	state.session = nextSession;

	UIManager.events.onWinsChanged(nextSession.wins, winsDelta);
	if (livesDelta !== 0) {
		UIManager.events.onLivesChanged(nextLives, livesDelta);
	}
	UIManager.events.onRoundChanged(nextSession.round);
	SessionManager.updateSession(nextSession.player_id, nextSession);
};

export const createBattlegroundScreen = async () => {
	const speed = OptionsStore.getOption("speed");
	io.scene.time.timeScale = speed;
	io.scene.tweens.timeScale = speed;

	io.scene.sound.setVolume(OptionsStore.getOption("soundVolume") ?? DEFAULT_SCENE_SOUND_VOLUME);

	Components.create();

	AudioManager.playMusic("music_battlemap_vetruv");

	const summonPromises = state.session.team.units.map(async (unit, index) => {
		await animation.delay(index * 200);
		await Chara.summon(unit, true);
	});
	await Promise.all(summonPromises);

	Shop.refresh(null);

	Tooltip.init();

	Board.setIsInputEnabled(true);

	ControlsSystem.init({ context: "battleground" });

	// ~~~~~ // ~~~~~ //

	await runPhaseLoop();

};

async function handleVictoryPhase(): Promise<SessionData | null> {
	let nextSession: SessionData | null = null;

	await new Promise<void>((resolve) => {
		void ResultsUI.displayGameCompleteResults(
			state,
			false,
			async () => {
				nextSession = await GameController.completeVictory();
			},
			() => {
				resolve();
			}
		);
		void ResultsUI.slideIn();
	});

	return nextSession;
}

async function handleGameOverPhase(): Promise<null> {
	await new Promise<void>((resolve) => {
		void ResultsUI.displayGameCompleteResults(state, true, undefined, resolve);
		void ResultsUI.slideIn();
	});

	return null;
}

async function executePhase(phase: PhaseType): Promise<PhaseExecutionResult> {
	switch (phase) {
		case "encounter":
			return await Encounter.displayOptions();

		case "combat":
			{
				const result = await handleCombatPhase.handleCombatPhase();
				return result.type === "cancelled" ? null : result.session;
			}

		case "shop":
			return await handleShopPhase.handleShopPhase();

		case "upgrade_core":
			return await handleUpgradeCorePhase.handleUpgradeCorePhase();

		case "add_reaction_core":
			return await handleAddReactionCorePhase.handleAddReactionCorePhase();

		case "orb_shop":
			return await handleOrbShopPhase.handleOrbShopPhase();

		case "victory":
			return await handleVictoryPhase();

		case "game_over":
			return await handleGameOverPhase();

		default:
			return assertNeverPhase(phase);
	}
}

async function runPhaseLoop() {
	while (true) {
		const nextSession = await executePhase(state.session.phase);
		if (!nextSession) {
			return;
		}

		updateSessionState(nextSession);

	}
}


