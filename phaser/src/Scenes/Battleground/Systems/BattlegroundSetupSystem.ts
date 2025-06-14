import { State } from "../../../Models/State";
import { CardCollection, registerCollection } from "../../../Models/Entities/Card";
import * as TraitSystem from "../../../TraitSystem/Traits";
import * as constants from "../../../constants/constants";
import { images } from "../../../assets";
import * as ControlsSystem from "../../../Systems/Controls/Controls";
import { initializeSharedPlayerBoard, PlayerBoard } from "../../../Models/Board";
import * as BG_CONSTANTS from "../battlegroundConstants";
import { GameEvents } from "../../../constants/events";
import { BattlegroundScene } from "../BattlegroundScene";
import { getOption } from "../../../Models/OptionsStore";

let runtimeDataInitialized = false;

export class BattlegroundSetupSystem {
	private scene: BattlegroundScene;

	constructor(scene: BattlegroundScene) {
		this.scene = scene;
	}

	public performOneTimeRuntimeInitialization(collection: CardCollection): void {
		if (!runtimeDataInitialized) {
			if (process.env.NODE_ENV === 'development') {
				console.log("Performing one-time runtime data initialization.");
			}
			registerCollection(collection);
			TraitSystem.initializeTraitsFromData(collection.traits);
			runtimeDataInitialized = true;
		}
	}

	public loadDynamicAssets(collection: CardCollection, onComplete: () => void): void {
		const loadAsset = (asset: { name: string, pic: string }, type: string) => {
			if (process.env.NODE_ENV === 'development') {
				console.log(`Loading ${type} asset: ${asset.name} - ${asset.pic}`);
			}
			this.scene.load.image(asset.pic, asset.pic);
		};

		collection.cards.forEach(card => loadAsset(card, "card"));
		collection.relics.forEach(relic => loadAsset(relic, "relic"));

		this.scene.load.once("complete", () => {
			console.log("Dynamic asset loading complete for BattlegroundScene.");
			onComplete();
		});

		this.scene.load.start();
	}

	public initializeNewGame(state: State): void {
		if (process.env.NODE_ENV === 'development') {
			//@ts-ignore
			window.scene = this.scene;
		}
		state.gameData.player.units = [];
		state.gameData.player.relics = [];
		state.gameData.round = 1;
		state.gameData.player.prestige = 0; // Initialize prestige for a new game

		// Directly set the initial gold from the constant
		const initialGold = BG_CONSTANTS.INITIAL_PLAYER_GOLD;
		state.gameData.player.gold = initialGold;

		// Emit PRESTIGE_CHANGED so UI can display the initial value. Delta is 0.
		this.scene.events.emit(GameEvents.PRESTIGE_CHANGED, state.gameData.player.prestige, 0);

		// Emit GOLD_CHANGED so UI and other systems can react to the initial gold value.
		// The delta is the full initial amount, signifying the change from a conceptual zero or previous state.
		this.scene.events.emit(GameEvents.GOLD_CHANGED, initialGold, initialGold);
		this.scene.sound.setVolume(getOption('soundVolume') ?? BG_CONSTANTS.DEFAULT_SCENE_SOUND_VOLUME);
	}

	public setupSceneElements(_state: State): PlayerBoard {
		this.scene.bgImage = this.scene.add.image(
			0, 0,
			images.bg_forest.key,
		).setDisplaySize(constants.SCREEN_WIDTH, constants.SCREEN_HEIGHT)
			.setPosition(constants.SCREEN_WIDTH / 2, constants.SCREEN_HEIGHT / 2);

		this.scene.bgContainer = this.scene.add.container(0, 0);
		ControlsSystem.init(this.scene);

		this.scene.bgContainer.add([this.scene.bgImage]);

		const playerBoard = initializeSharedPlayerBoard(this.scene);
		return playerBoard;
	}
}