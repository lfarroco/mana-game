import { State } from "../../../Models/State";
import { CardCollection, registerCollection } from "../../../Models/Entities/Card";
import * as ControlsSystem from "../../../Systems/Controls/Controls";
import { initializePlayerBoard, PartyBoard, createBoardDropZone } from "../../../Models/Board";
import * as BG_CONSTANTS from "../battlegroundConstants";
import { BattlegroundScene } from "../BattlegroundScene";
import { getOption } from "../../../Models/OptionsStore";
import { devlog } from "../../../utils";
import { CloudsBackground } from "../../../components/cloudBackground/CloudsBackground";
import { ui } from "../../../UI/UIManager";

let runtimeDataInitialized = false;

export class BattlegroundSetupSystem {
	scene: BattlegroundScene;
	private cloudsBackground?: CloudsBackground;

	constructor(scene: BattlegroundScene) {
		this.scene = scene;
	}

	performOneTimeRuntimeInitialization(collection: CardCollection): void {
		if (!runtimeDataInitialized) {
			devlog("Performing one-time runtime data initialization.");
			registerCollection(collection);
			runtimeDataInitialized = true;
		}
	}

	loadDynamicAssets = (collection: CardCollection): Promise<void> => new Promise((resolve) => {
		const loadAsset = (asset: { name: string, pic: string }, type: string) => {
			devlog(`Loading ${type} asset: ${asset.name} - ${asset.pic}`);
			this.scene.load.image(asset.pic, asset.pic);
		};

		collection.cards
			.forEach(card => loadAsset(card, "card"));

		this.scene.load.once("complete", () => {
			devlog("Dynamic asset loading complete for BattlegroundScene.");
			resolve();
		});

		this.scene.load.start();
	});


	initializeNewGame(state: State): void {

		state.gameData.player.units = [];
		state.gameData.round = 1;
		state.gameData.player.prestige = 0;
		state.gameData.player.gold = BG_CONSTANTS.INITIAL_PLAYER_GOLD;;

		// Emit PRESTIGE_CHANGED so UI can display the initial value. Delta is 0.
		ui.updatePrestige(state.gameData.player.prestige, 0);

		this.scene.sound.setVolume(getOption('soundVolume') ?? BG_CONSTANTS.DEFAULT_SCENE_SOUND_VOLUME);
	}

	setupSceneElements(_state: State): PartyBoard {
		// Create the animated clouds background instead of a static forest image
		this.cloudsBackground = new CloudsBackground(this.scene, {
			preset: 'forest', // Use forest preset to match the original theme
			depth: -2000, // Ensure it's behind everything else
			timeScale: 0.3 // Slow down the animation to be less distracting (30% of normal speed)
		});

		// Store the shader as bgImage for compatibility with existing code
		// Note: This might require type casting since shader is not exactly an Image
		this.scene.cloudsBackground = this.cloudsBackground.getShader() as any;

		this.scene.bgContainer = this.scene.add.container(0, 0);
		ControlsSystem.init(this.scene);

		// Add the shader to the container (the shader is already added to the scene)
		// Note: Container.add() expects GameObject, shader should work but might need adjustment
		this.scene.bgContainer.add([this.scene.cloudsBackground]);

		const playerBoard = initializePlayerBoard(this.scene);
		createBoardDropZone(); // Actually render the board slots
		return playerBoard;
	}

	/**
	 * Clean up the clouds background when the scene is destroyed
	 */
	destroy(): void {
		if (this.cloudsBackground) {
			this.cloudsBackground.destroy();
			this.cloudsBackground = undefined;
		}
	}
}