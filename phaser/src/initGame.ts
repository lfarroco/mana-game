import * as Phaser from "phaser";
import BattlegroundScene from "./Scenes/Battleground/BattlegroundScene";
import Core from "./Scenes/Core/Core";
import TitleScene from "./Scenes/Title/TitleScene";
import OptionsScene from "./Scenes/Options/OptionsScene";
import { SCREEN_HEIGHT, SCREEN_WIDTH } from "./constants/constants";
import { DebugScene } from "./Debug/DebugScene";
import BBCodeTextPlugin from 'phaser3-rex-plugins/plugins/bbcodetext-plugin.js';
import CircleMaskImagePlugin from 'phaser3-rex-plugins/plugins/circlemaskimage-plugin.js';

export const initGame = () => new Phaser.Game({
	type: Phaser.WEBGL,
	pixelArt: false,
	scale: {
		width: SCREEN_WIDTH,
		height: SCREEN_HEIGHT,
		mode: Phaser.Scale.FIT,
		autoCenter: Phaser.Scale.CENTER_BOTH
	},
	parent: "game-container",
	scene: [Core, DebugScene, BattlegroundScene, TitleScene, OptionsScene],
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