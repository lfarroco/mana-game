import Phaser from "phaser";
import { getState, setCurrentScene } from "@Models/State";
import * as UIManager from "../../UI/UI";
import * as Board from "@Models/Board";
import { updateFrame } from "./RunCombatIO";
import { getOption } from "@Models/OptionsStore";
import * as AudioManager from "@Systems/AudioManager";
import * as Systems from "./Systems";
import { clearAll, getAllCharas } from "@Systems/Chara/Chara";
import * as ResultsUI from "./Results/ResultsUI";
import * as Tooltip from "@Components/Tooltip";
import { startPhase, resetBoard, getPhaseForHour } from "./PhaseManager";
import * as DiscardZone from "./Systems/Shop/DiscardZone";

export type BattlegroundSceneData = {
	selectedCrystalId?: string;
};

export class BattlegroundScene extends Phaser.Scene {
	bgContainer!: Phaser.GameObjects.Container;
	cloudsBackground!: Phaser.GameObjects.Shader;

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


	create = async (data?: BattlegroundSceneData) => {
		const gameData = getState().gameData;

		console.log(":::: BattlegroundScene creating logic...", gameData, "sceneData:", data);
		setCurrentScene(this);

		this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.cleanup, this);

		const speed = getOption("speed");

		this.time.timeScale = speed;
		this.tweens.timeScale = speed;

		this.start(data);
	};

	start = async (sceneData?: BattlegroundSceneData) => {

		const data = getState().gameData;
		console.log(":::: BattlegroundScene starting logic...", data);

		if (sceneData?.selectedCrystalId)
			Systems.Setup.initializeNewGame(sceneData.selectedCrystalId);
		else
			getState().gameData = data;

		Systems.Setup.setupSceneElements();

		Tooltip.init();

		const charas = getAllCharas();

		if (charas.length === 0) {
			await resetBoard();
		}

		UIManager.init();

		Systems.CountdownTimer.initializeCountdownTimer(this);

		ResultsUI.createResultsUI();

		DiscardZone.create();

		AudioManager.playMusic("music_battlemap_vetruv");

		const currentHour = getState().gameData.hour;
		startPhase(getPhaseForHour(currentHour) || "shop");
	};

	update(time: number, delta: number): void {
		Board.update(time);

		updateFrame(time, delta);
	}
}

export default BattlegroundScene;
