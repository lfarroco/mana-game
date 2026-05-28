import * as Board from "@Models/Board";
import * as OptionsStore from "@Models/OptionsStore";
import * as GameController from "@Core/GameController";
import type { SessionData } from "@Core/Types";
import * as AudioManager from "@Systems/AudioManager";
import * as ControlsSystem from "@Systems/Controls";
import * as Tooltip from "@Components/Tooltip";
import * as animation from "@Utils/animation";
import * as Chara from "@Systems/Chara/Chara";
import * as Encounter from "@Systems/Encounter";
import * as handleCombatPhase from "@Screens/Battleground/handleCombatPhase";
import * as ResultsUI from "./Results/ResultsUI";
import * as handleShopPhase from "./Shop/handleShopPhase";

import * as Shop from "./Shop/ShopPanel";
import * as Components from "./Components"
import * as handleUpgradeCorePhase from "./Phases/handleUpgradeCorePhase";
import * as handleAddReactionCorePhase from "./Phases/handleAddReactionCorePhase";
import * as handleOrbShopPhase from "./Shop/handleOrbShopPhase";

const DEFAULT_SCENE_SOUND_VOLUME = 0.05;

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

async function runPhaseLoop() {
	while (true) {

		switch (state.session.phase) {
			case "encounter":
				state.session = await Encounter.displayOptions();
				break;

			case "combat":
				{
					const result = await handleCombatPhase.handleCombatPhase();
					if (result.type === "cancelled") {
						return;
					}

					state.session = result.session;
				}
				break;

			case "shop":
				state.session = await handleShopPhase.handleShopPhase();
				break;
			case "upgrade_core":
				state.session = await handleUpgradeCorePhase.handleUpgradeCorePhase();
				break;
			case "add_reaction_core":
				state.session = await handleAddReactionCorePhase.handleAddReactionCorePhase();
				break;
			case "orb_shop":
				state.session = await handleOrbShopPhase.handleOrbShopPhase();
				break;
			case "victory": {
				const nextSession = await handleVictoryPhase();
				if (!nextSession) {
					return;
				}
				state.session = nextSession;
				break;
			}
			case "game_over":
				await handleGameOverPhase();
				return;
			default:
				throw new Error(`Unknown phase: ${state.session.phase}`);
				return;

		}

	}
}


