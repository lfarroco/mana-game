import Phaser from "phaser";
import { setCurrentScene, State, getState } from "@Models/State";
import * as UIManager from "../../UI/UI";
import * as Board from "@Models/Board";
import { CombatRunner } from "./RunCombatIO";
import { getOption } from "@Models/OptionsStore";
import * as AudioManager from "@Systems/AudioManager";
import * as Systems from "./Systems";
import { clearAll, getAllCharas } from "@Systems/Chara/Chara";
import * as ResultsUI from "./Results/ResultsUI";
import * as Tooltip from "@Components/Tooltip";
import { startPhase, resetBoard, getPhaseForHour } from "./PhaseManager";
import * as DiscardZone from "./Systems/Shop/DiscardZone";

export type BattlegroundSceneData = {
	state: State,
	// TODO: instead of this, we need the list of current units 
	selectedCrystalId?: string;
};

export class BattlegroundScene extends Phaser.Scene {
	bgContainer!: Phaser.GameObjects.Container;
	cloudsBackground!: Phaser.GameObjects.Shader;
	state: State;
	combatRunner?: CombatRunner;

	cleanup() {
		console.log(":::: BattlegroundScene cleanup")
		clearAll();
		this.time.removeAllEvents();
		this.children.removeAll(true);

		Systems.Setup.destroy();

		UIManager.destroy();
	}

	constructor() {
		super("BattlegroundScene");
		console.log("BattlegroundScene constructor");
	}


	create = async (data: BattlegroundSceneData) => {
		const state = data?.state || getState();
		const { gameData } = state;

		this.state = state;

		console.log(":::: BattlegroundScene creating logic...", gameData, "sceneData:", data);
		setCurrentScene(this);

		this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.cleanup, this);

		const speed = getOption("speed");

		this.time.timeScale = speed;
		this.tweens.timeScale = speed;

		this.start({ ...data, state });
	};

	start = async ({ state, selectedCrystalId }: BattlegroundSceneData) => {

		// TODO: the start for this scene should be just:
		// - render boards
		// - render untis
		// - display current phase 

		const data = state.gameData;
		console.log(":::: BattlegroundScene starting logic...", data);

		if (selectedCrystalId)
			// TODO: the game data should be initialized before even getting into this scene
			Systems.Setup.initializeNewGame(selectedCrystalId);
		else
			state.gameData = data;

		Systems.Setup.setupSceneElements();

		Tooltip.init();

		const charas = getAllCharas();

		// TODO: why??
		if (charas.length === 0) {
			await resetBoard();
		}

		UIManager.init(state);

		ResultsUI.createResultsUI();

		DiscardZone.create();

		AudioManager.playMusic("music_battlemap_vetruv");

		const currentHour = state.gameData.hour;
		// TODO: only arg should be state 
		startPhase(state, getPhaseForHour(currentHour) || "shop");
	};

	update(time: number, delta: number): void {
		Board.update(time);

		// TODO: instead, we can have a "combat system", that informs if the simulation is running
		if (this.combatRunner) {
			this.combatRunner.updateFrame(this.state, time, delta);
		}
	}
}

export default BattlegroundScene;

