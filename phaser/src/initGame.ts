import * as Phaser from "phaser";
import BattlegroundScene from "./Scenes/Battleground/BattlegroundScene";
import Core from "./Scenes/Core/Core";
import TitleScene from "./Scenes/Title/TitleScene";
import { State } from "./Models/State";
import { SCREEN_HEIGHT, SCREEN_WIDTH, SCENE_KEYS } from "./constants/constants";
import { DebugScene } from "./Debug/DebugScene";
import BBCodeTextPlugin from 'phaser3-rex-plugins/plugins/bbcodetext-plugin.js';
import CircleMaskImagePlugin from 'phaser3-rex-plugins/plugins/circlemaskimage-plugin.js';

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
		scene: [Core, DebugScene, BattlegroundScene, TitleScene],
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
			{
				key: 'rexCircleMaskImagePlugin',
				plugin: CircleMaskImagePlugin,
				start: true
			},
			]
		}
	});

	// get query params, check for DEBUG param
	const urlParams = new URLSearchParams(window.location.search);
	const debug = urlParams.get('DEBUG');
	if (debug) {
		game.scene.start(SCENE_KEYS.DEBUG);
	} else {
		// Start with the title scene, pass the state so it can be forwarded to battleground
		game.scene.start(SCENE_KEYS.TITLE, { state });
	}

	return game;
}
