import * as Phaser from "phaser";
import BattlegroundScene from "./Scenes/Battleground/BattlegroundScene";
import Core from "./Scenes/Core/Core";
import { State } from "./Models/State";
import { SCREEN_HEIGHT, SCREEN_WIDTH } from "./Scenes/Battleground/constants";
import { DebugScene } from "./Debug/DebugScene";
import { SaveGameSystem_init } from "./Systems/SaveGame/SaveGame";

export function initGame(state: State) {

	const game = new Phaser.Game({
		type: Phaser.WEBGL,
		pixelArt: false,
		scale: {
			width: SCREEN_WIDTH,
			height: SCREEN_HEIGHT,
			mode: Phaser.Scale.FIT,
			autoCenter: Phaser.Scale.CENTER_BOTH
		},
		parent: "game-container",
		scene: [Core, DebugScene, BattlegroundScene],
		physics: {
			default: 'arcade',
			arcade: {
				debug: true,
			}
		}
	});

	SaveGameSystem_init(state, game);

	// get query params, check for DEBUG param
	const urlParams = new URLSearchParams(window.location.search);
	const debug = urlParams.get('DEBUG');
	if (debug) {
		game.scene.start("DebugScene");
	} else {
		console.log("START_NEW_GAME");
		game.scene.start("BattlegroundScene", state);
	}

}
