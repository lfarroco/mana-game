import { State } from "../../../Models/State";
import { CardCollection, registerCollection } from "../../../Models/Entities/Card";
import * as TraitSystem from "../../../TraitSystem/Traits";
import * as ControlsSystem from "../../../Systems/Controls/Controls";
import { initializePlayerBoard, PartyBoard, createBoardDropZone } from "../../../Models/Board";
import * as BG_CONSTANTS from "../battlegroundConstants";
import { GameEvents } from "../../../constants/events";
import { BattlegroundScene } from "../BattlegroundScene";
import { TypedEventEmitter } from "../../../Systems/Events/TypedEventEmitter";
import { GoldSystemEventPayloads, GoldSystemEvents } from "../../../Systems/GoldSystem/events";
import { getOption } from "../../../Models/OptionsStore";
import { devlog } from "../../../utils";
import { CloudsBackground } from "../../../components/cloudBackground/CloudsBackground";

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
			TraitSystem.initializeTraitsFromData(collection.traits);
			runtimeDataInitialized = true;
		}
	}

	loadDynamicAssets = (collection: CardCollection): Promise<void> => new Promise((resolve) => {
		const loadAsset = (asset: { name: string, pic: string }, type: string) => {
			devlog(`Loading ${type} asset: ${asset.name} - ${asset.pic}`);
			this.scene.load.image(asset.pic, asset.pic);
		};

		collection.cards.forEach(card => loadAsset(card, "card"));

		this.scene.load.once("complete", () => {
			devlog("Dynamic asset loading complete for BattlegroundScene.");
			resolve();
		});

		this.scene.load.start();
	});


	initializeNewGame(state: State): void {

		state.gameData.player.units = [];
		state.gameData.round = 1;
		state.gameData.player.prestige = 0; // Initialize prestige for a new game

		// Directly set the initial gold from the constant
		const initialGold = BG_CONSTANTS.INITIAL_PLAYER_GOLD;
		state.gameData.player.gold = initialGold;

		// Emit PRESTIGE_CHANGED so UI can display the initial value. Delta is 0.
		this.scene.events.emit(GameEvents.PRESTIGE_CHANGED, state.gameData.player.prestige, 0);

		// Create typed event emitter for gold system events
		const goldEvents = new TypedEventEmitter<GoldSystemEventPayloads>(this.scene.events);

		// Emit GOLD_CHANGED so UI and other systems can react to the initial gold value.
		// The delta is the full initial amount, signifying the change from a conceptual zero or previous state.
		goldEvents.emit(GoldSystemEvents.GOLD_CHANGED, initialGold, initialGold);
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
		this.scene.bgImage = this.cloudsBackground.getShader() as any;

		this.scene.bgContainer = this.scene.add.container(0, 0);
		ControlsSystem.init(this.scene);

		// Add the shader to the container (the shader is already added to the scene)
		// Note: Container.add() expects GameObject, shader should work but might need adjustment
		this.scene.bgContainer.add([this.scene.bgImage]);

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