import * as constants from "./Constants";
import Client from "./Client";
import * as State from "@Models/ClientState";

import ShatterImagePlugin from "phaser3-rex-plugins/plugins/shatterimage-plugin.js";
import BBCodeTextPlugin from "phaser3-rex-plugins/plugins/bbcodetext-plugin.js";

declare global {
	const __DEV__: boolean;
}

const STARTUP_FONT_FAMILY = "Arimo";
const STARTUP_FONT_URL = "assets/fonts/Arimo-Variable.ttf";

async function loadStartupFont(): Promise<void> {
	const startupFont = new FontFace(STARTUP_FONT_FAMILY, `url("${STARTUP_FONT_URL}")`);

	await startupFont.load();
	document.fonts.add(startupFont);
	await document.fonts.load(`16px "${STARTUP_FONT_FAMILY}"`);
}

async function startGame(): Promise<void> {
	await loadStartupFont();

	new Phaser.Game({
		pixelArt: false,
		scale: {
			width: constants.SCREEN_WIDTH,
			height: constants.SCREEN_HEIGHT,
			mode: Phaser.Scale.FIT,
			autoCenter: Phaser.Scale.CENTER_BOTH,
		},
		scene: Client(State.initialState()),
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
}

void startGame();
