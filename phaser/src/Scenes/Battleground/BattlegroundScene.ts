import Phaser from "phaser";
import { preload } from "./preload";
import { getState, setCurrentScene } from "@Models/State";
import * as UIManager from "../../UI/UI";
import { CardCollection } from "@Models/Entities/Card";
import * as Board from "@Models/Board";
import { updateFrame } from "./RunCombatIO";
import { getOption } from "@Models/OptionsStore";
import * as AudioManager from "@Systems/AudioManager";
import * as Systems from "./Systems";
import { clearAll, getAllCharas } from "@Systems/Chara/Chara";
import * as ResultsUI from "./Results/ResultsUI";
import * as Tooltip from "@Components/Tooltip";
import { startPhase, hourAction, resetBoard } from "./PhaseManager";
import * as DiscardZone from "./Systems/Shop/DiscardZone";

export class BattlegroundScene extends Phaser.Scene {
	bgContainer!: Phaser.GameObjects.Container;
	cloudsBackground!: Phaser.GameObjects.Shader;
	collection!: CardCollection;

	cleanup() {
		clearAll();
		this.time.removeAllEvents();
		this.children.removeAll(true);

		Systems.Setup.destroy();

		UIManager.destroy();
		ResultsUI.destroy();
	}

	constructor() {
		super("BattlegroundScene");
		console.log("BattlegroundScene constructor");
	}

	preload = preload;

	create = async () => {
		const data = getState().gameData;

		console.log(":::: BattlegroundScene creating logic...", data);
		setCurrentScene(this);

		this.collection = this.cache.json.get("base-collection") as CardCollection;

		this.events.once(Phaser.Scenes.Events.DESTROY, this.cleanup, this);

		const speed = getOption("speed");

		this.time.timeScale = speed;
		this.tweens.timeScale = speed;

		this.start();
	};

	start = async () => {

		const data = getState().gameData;
		console.log(":::: BattlegroundScene starting logic...", data);

		const isLoading = data?.player;

		if (isLoading) {
			getState().gameData = data;
		} else {
			Systems.Setup.initializeNewGame();
		}

		Systems.Loader.init(this.collection);
		Systems.Loader.loadDynamicAssets(this.collection);

		const state = getState();

		Systems.Setup.setupSceneElements();

		const assetsToLoad = state.battleData.units.concat(
			state.gameData.player?.units || []
		);

		await Systems.Loader.loadUnitAssets(assetsToLoad);

		const charas = getAllCharas();

		if (charas.length === 0) {
			await resetBoard();
		}

		UIManager.init();
		Tooltip.init();

		Systems.CountdownTimer.initializeCountdownTimer(this);

		ResultsUI.create();

		DiscardZone.create();

		AudioManager.playMusic("music_battlemap_vetruv");

		const currentHour = getState().gameData.hour;
		startPhase(hourAction[currentHour] || "shop-core");
	};

	update(time: number, delta: number): void {
		Board.update(time);

		updateFrame(time, delta);
	}
}

export default BattlegroundScene;
