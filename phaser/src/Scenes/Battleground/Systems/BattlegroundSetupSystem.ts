import { State } from "../../../Models/State";
import { CardCollection, registerCollection } from "../../../Models/Entities/Card";
import * as ControlsSystem from "../../../Systems/Controls/Controls";
import { initializePlayerBoard, PartyBoard, createBoardDropZone } from "../../../Models/Board";
import * as BG_CONSTANTS from "../battlegroundConstants";
import { BattlegroundScene } from "../BattlegroundScene";
import { getOption } from "../../../Models/OptionsStore";
import { CloudsBackground } from "../../../components/cloudBackground/CloudsBackground";
import * as UIManager from "../../../UI/UIManager";

let runtimeDataInitialized = false;

export class BattlegroundSetupSystem {
	scene: BattlegroundScene;
	private cloudsBackground?: CloudsBackground;

	constructor(scene: BattlegroundScene) {
		this.scene = scene;
	}

	performOneTimeRuntimeInitialization(collection: CardCollection): void {
		if (!runtimeDataInitialized) {
			console.log("Performing one-time runtime data initialization.");
			registerCollection(collection);
			runtimeDataInitialized = true;
		}
	}

	loadDynamicAssets = (collection: CardCollection): Promise<void> => new Promise((resolve) => {
		const loadAsset = (asset: { name: string, pic: string }, type: string) => {
			console.log(`Loading ${type} asset: ${asset.name} - ${asset.pic}`);
			this.scene.load.image(asset.pic, asset.pic);
		};

		collection.cards
			.forEach(card => loadAsset(card, "card"));

		this.scene.load.once("complete", () => {
			console.log("Dynamic asset loading complete for BattlegroundScene.");
			resolve();
		});

		this.scene.load.start();
	});


	initializeNewGame(state: State): void {

		state.gameData.player.units = [];
		state.gameData.round = 1;
		state.gameData.player.prestige = 0;
		state.gameData.player.gold = BG_CONSTANTS.INITIAL_PLAYER_GOLD;;

		UIManager.updatePrestige(state.gameData.player.prestige, 0);

		this.scene.sound.setVolume(getOption('soundVolume') ?? BG_CONSTANTS.DEFAULT_SCENE_SOUND_VOLUME);
	}

	setupSceneElements(_state: State): PartyBoard {
		this.cloudsBackground = new CloudsBackground(this.scene, {
			preset: 'forest',
			depth: -2000,
			timeScale: 0.3
		});

		this.scene.cloudsBackground = this.cloudsBackground.getShader() as any;

		this.scene.bgContainer = this.scene.add.container(0, 0);
		ControlsSystem.init(this.scene);

		this.scene.bgContainer.add([this.scene.cloudsBackground]);

		const playerBoard = initializePlayerBoard(this.scene);
		createBoardDropZone();
		return playerBoard;
	}

	destroy(): void {
		if (this.cloudsBackground) {
			this.cloudsBackground.destroy();
			this.cloudsBackground = undefined;
		}
	}
}