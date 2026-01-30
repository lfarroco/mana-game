import * as OptionsStore from "./Models/OptionsStore";
import * as StatsStore from "./Models/StatsStore";
import * as DebugController from "./Scenes/Debug/DebugController";
import { SCREEN_HEIGHT, SCREEN_WIDTH } from "@Constants/constants";
import BBCodeTextPlugin from "phaser3-rex-plugins/plugins/bbcodetext-plugin.js";
import Core from "./Scenes/Core/Core";
import { DebugScene } from "./Debug/DebugScene";
import BattlegroundScene from "./Scenes/Battleground/BattlegroundScene";
import TitleScene from "./Scenes/Title/TitleScene";
import OptionsScene from "./Scenes/Options/OptionsScene";
import CrystalSelectionScene from "./Scenes/CrystalSelection/CrystalSelectionScene";
import ShatterImagePlugin from "phaser3-rex-plugins/plugins/shatterimage-plugin.js";
import { initState } from "@Models/State";
import { ArenaLobbyScene } from "./Scenes/ArenaLobby/ArenaLobbyScene";
import { ArenaLoginScene } from "./Scenes/ArenaLobby/ArenaLoginScene";

initState();

// Clean up old format gameData from localStorage
function cleanupOldSaveFormat() {
	try {
		const gameData = localStorage.getItem('gameData');
		if (gameData) {
			const savedData = JSON.parse(gameData);
			// Check if this is old format (has player.units instead of player_id/phase)
			const isOldFormat = savedData.player && !savedData.player_id && !savedData.phase;
			if (isOldFormat) {
				console.log('[Cleanup] Removing old format gameData from localStorage');
				localStorage.removeItem('gameData');
			}
		}
	} catch (error) {
		console.error('[Cleanup] Failed to check/clean old save format:', error);
	}
}

cleanupOldSaveFormat();

export const game = new Phaser.Game({
	type: Phaser.WEBGL,
	pixelArt: true,
	scale: {
		width: SCREEN_WIDTH,
		height: SCREEN_HEIGHT,
		mode: Phaser.Scale.FIT,
		autoCenter: Phaser.Scale.CENTER_BOTH,
	},
	dom: {
		createContainer: true
	},
	parent: "game-container",
	scene: [Core, DebugScene, BattlegroundScene, TitleScene, OptionsScene, CrystalSelectionScene, ArenaLobbyScene, ArenaLoginScene],
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

if (process.env.NODE_ENV === "development") {
	window.debugController = DebugController;
	(window as any).game = game;
}
