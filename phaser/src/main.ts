import * as OptionsStore from "@Models/OptionsStore";
import * as StatsStore from "@Models/StatsStore";
import * as DebugController from "Client/Scenes/Debug/DebugController";
import { SCREEN_HEIGHT, SCREEN_WIDTH } from "@Constants/constants";
import BBCodeTextPlugin from "phaser3-rex-plugins/plugins/bbcodetext-plugin.js";
import Core from "Client/Scenes/Core/Core";
import { DebugScene } from "./Debug/DebugScene";
import BattlegroundScene from "Client/Scenes/Battleground/BattlegroundScene";
import TitleScene from "Client/Scenes/Title/TitleScene";
import OptionsScene from "Client/Scenes/Options/OptionsScene";
import CrystalSelectionScene from "Client/Scenes/CrystalSelection/CrystalSelectionScene";
import ShatterImagePlugin from "phaser3-rex-plugins/plugins/shatterimage-plugin.js";
import { initState } from "@Models/State";
import { ArenaLobbyScene } from "Client/Scenes/ArenaLobby/ArenaLobbyScene";
import { ArenaLoginScene } from "Client/Scenes/ArenaLobby/ArenaLoginScene";

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
	scene: [
		Core,
		DebugScene,
		BattlegroundScene,
		TitleScene,
		OptionsScene,
		CrystalSelectionScene,
		ArenaLobbyScene,
		ArenaLoginScene,
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

OptionsStore.init();
StatsStore.init();

if (process.env.NODE_ENV === "development") {
	window.debugController = DebugController;
	(window as Window & { game?: Phaser.Game }).game = game;
}
