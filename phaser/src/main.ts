
import * as constants from "./Constants";
import Client from "Client/Client";
import * as State from "@Models/ClientState";
import * as io_ from "./io";

import ShatterImagePlugin from "phaser3-rex-plugins/plugins/shatterimage-plugin.js";
import BBCodeTextPlugin from "phaser3-rex-plugins/plugins/bbcodetext-plugin.js";

declare global {
	var io: typeof io_;
	var state: State.ClientState;
	const __DEV__: boolean;
}
window.io = io_;
window.state = State.initialState();

const STARTUP_FONT_FAMILY = "Arimo";
const STARTUP_FONT_URL = "assets/fonts/Arimo-Variable.ttf";

async function loadStartupFontIO(): Promise<void> {
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

	new Phaser.Game({
		pixelArt: false,
		scale: {
			width: constants.SCREEN_WIDTH,
			height: constants.SCREEN_HEIGHT,
			mode: Phaser.Scale.FIT,
			autoCenter: Phaser.Scale.CENTER_BOTH,
		},
		scene: Client,
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

void startGameIO();