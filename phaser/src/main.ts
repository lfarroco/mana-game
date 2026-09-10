import * as constants from "./Constants";
import BootScene from "./Scenes/BootScene";
import { BattlegroundScene } from "./Screens/Battleground/BattlegroundScene";
import { CrystalSelectionScene } from "./Screens/CrystalSelection/CrystalSelectionScene";
import { MultiplayerLobbyScene } from "./Screens/MultiplayerLobby/MultiplayerLobbyScene";
import { MultiplayerLoginScene } from "./Screens/MultiplayerLogin/MultiplayerLoginScene";
import { OptionsScene } from "./Screens/Options/OptionsScene";
import { TitleScene } from "./Screens/Title/TitleScene";
import * as State from "@Models/ClientState";
import { handleOAuthCallbackIfPresent } from "./lib/itchAuth";
import { captureLaunchReturnIfPresent } from "./lib/oauthAndroid";

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
		// One Phaser scene per screen. The first scene in the list boots
		// automatically (BootScene loads assets, then starts the title scene);
		// every later transition goes through Scenes/AppRouter.
		scene: [
			BootScene(State.initialState()),
			TitleScene,
			OptionsScene,
			CrystalSelectionScene,
			MultiplayerLoginScene,
			MultiplayerLobbyScene,
			BattlegroundScene,
		],
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

// itch.io OAuth return handling (docs/itchio-auth.md): run BEFORE the game
// boots. A popup return posts the token to the opener and closes — the game
// must not boot inside the popup. A top-level redirect return stashes the
// token (and clears the hash) and boots normally; loginWithItch consumes it.
if (!handleOAuthCallbackIfPresent()) {
	void startGame();
}

// Android (Capacitor) OAuth deep-link capture (docs/android-multiplayer.md):
// if the app was cold-started by an OAuth return URI, @capacitor/app's launch
// URL holds the credential — stash it for the next login. No-op elsewhere.
captureLaunchReturnIfPresent();
