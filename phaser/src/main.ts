import * as OptionsStore from "./Models/OptionsStore";
import * as DebugController from "./Scenes/Debug/DebugController";
import { SCREEN_HEIGHT, SCREEN_WIDTH } from "@Constants/constants";
import BBCodeTextPlugin from 'phaser3-rex-plugins/plugins/bbcodetext-plugin.js';
import Core from "./Scenes/Core/Core";
import { DebugScene } from "./Debug/DebugScene";
import BattlegroundScene from "./Scenes/Battleground/BattlegroundScene";
import TitleScene from "./Scenes/Title/TitleScene";
import OptionsScene from "./Scenes/Options/OptionsScene";

export const game = new Phaser.Game({
	type: Phaser.WEBGL,
	pixelArt: true,
	scale: {
		width: SCREEN_WIDTH,
		height: SCREEN_HEIGHT,
		mode: Phaser.Scale.FIT,
		autoCenter: Phaser.Scale.CENTER_BOTH
	},
	parent: "game-container",
	scene: [Core, DebugScene, BattlegroundScene, TitleScene, OptionsScene],
	plugins: {
		global: [{
			key: 'rexBBCodeTextPlugin',
			plugin: BBCodeTextPlugin,
			start: true
		},
		]
	}
});

OptionsStore.init();

if (process.env.NODE_ENV === 'development') {
	window.debugController = DebugController;
}
