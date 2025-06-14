import * as Phaser from "phaser";
import BattlegroundScene from "./Scenes/Battleground/BattlegroundScene";
import Core from "./Scenes/Core/Core";
import { State } from "./Models/State";
import { SCREEN_HEIGHT, SCREEN_WIDTH } from "./constants/constants";
import { DebugScene } from "./Debug/DebugScene";
import { SaveGameSystem_init } from "./Systems/SaveGame/SaveGame";
import BBCodeTextPlugin from 'phaser3-rex-plugins/plugins/bbcodetext-plugin.js';

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
		},
		plugins: {
			global: [{
				key: 'rexBBCodeTextPlugin',
				plugin: BBCodeTextPlugin,
				start: true
			},
			]
		}
	});

	// TODO: move this up, as a global system
	SaveGameSystem_init(state, game);

	// get query params, check for DEBUG param
	const urlParams = new URLSearchParams(window.location.search);
	// TODO: define query param keys
	const debug = urlParams.get('DEBUG');
	if (debug) {
		// TODO: use scene keys
		game.scene.start("DebugScene");
	} else {
		// TODO: use scene keys
		game.scene.start("BattlegroundScene", state);
	}
}
