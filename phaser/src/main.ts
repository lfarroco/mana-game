import "phaser"
import * as OptionsStore from "@Models/OptionsStore";
import * as StatsStore from "@Models/StatsStore";
import * as constants from "@Constants/constants";
import Core from "@Screens/Preload/Core";
import "@Models/State"; // start global state
import * as phaserIO from "@PhaserIO";

import ShatterImagePlugin from "phaser3-rex-plugins/plugins/shatterimage-plugin.js";
import BBCodeTextPlugin from "phaser3-rex-plugins/plugins/bbcodetext-plugin.js";

declare global {
	var io: typeof phaserIO;
}
window.io = phaserIO;

const STARTUP_FONT_FAMILY = "Arimo";
const STARTUP_FONT_URL = "assets/fonts/Arimo-Variable.ttf";

export let game: Phaser.Game;

async function loadStartupFontIO(): Promise<void> {
	if (typeof window === "undefined" || !("FontFace" in window)) {
		return;
	}

	const startupFont = new FontFace(
		STARTUP_FONT_FAMILY,
		`url("${STARTUP_FONT_URL}")`,
	);

	await startupFont.load();
	document.fonts.add(startupFont);
	await document.fonts.load(`16px "${STARTUP_FONT_FAMILY}"`);
}

async function startGameIO(): Promise<void> {
	await loadStartupFontIO();

	game = new Phaser.Game({
		type: Phaser.AUTO,
		pixelArt: false,
		scale: {
			width: constants.SCREEN_WIDTH,
			height: constants.SCREEN_HEIGHT,
			mode: Phaser.Scale.FIT,
			autoCenter: Phaser.Scale.CENTER_BOTH,
		},
		dom: {
			createContainer: true,
		},
		parent: "game-container",
		scene: Core,
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
}

void startGameIO();


// if (process.env.NODE_ENV === "development") {
// 	//window.debugController = DebugController;
// 	(window as Window & { game?: Phaser.Game }).game = game;
// }
