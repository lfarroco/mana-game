import "phaser"
import * as OptionsStore from "@Models/OptionsStore";
import * as StatsStore from "@Models/StatsStore";
import { SCREEN_HEIGHT, SCREEN_WIDTH } from "@Constants/constants";
import BBCodeTextPlugin from "phaser3-rex-plugins/plugins/bbcodetext-plugin.js";
import Preload from "Client/Screens/Preload/Preload";
import ShatterImagePlugin from "phaser3-rex-plugins/plugins/shatterimage-plugin.js";
import { initState } from "@Models/State";

initState();

export const game = new Phaser.Game({
	type: Phaser.AUTO,
	pixelArt: false,
	scale: {
		width: SCREEN_WIDTH,
		height: SCREEN_HEIGHT,
		mode: Phaser.Scale.FIT,
		autoCenter: Phaser.Scale.CENTER_BOTH,
	},
	dom: {
		createContainer: true,
	},
	parent: "game-container",
	scene: Preload,
	plugins: {
		global: [
			{
				key: "rexBBCodeTextPlugin",
				plugin: BBCodeTextPlugin,
				start: true,
			},
			{
				key: "rexShatterImagePlugin",
				plugin: ShatterImagePlugin,
				start: true,
			},
		],
	},
});

OptionsStore.init();
StatsStore.init();

// if (process.env.NODE_ENV === "development") {
// 	//window.debugController = DebugController;
// 	(window as Window & { game?: Phaser.Game }).game = game;
// }
