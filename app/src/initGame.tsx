import * as Phaser from "phaser";
import BattlegroundScene from "./Scenes/Battleground/BattlegroundScene";
import { signals as events_ } from './Models/Signals';
import { listeners } from './Models/Signals';
import Core from "./Scenes/Core/Core";
import * as SaveGame from "./Systems/SaveGame/SaveGame";
import { State } from "./Models/State";
import { SCREEN_HEIGHT, SCREEN_WIDTH } from "./Scenes/Battleground/constants";

export function initGame(state: State) {

	const game = new Phaser.Game({
		type: Phaser.WEBGL,
		mode: Phaser.Scale.CENTER_BOTH,
		width: SCREEN_WIDTH,
		height: SCREEN_HEIGHT,
		pixelArt: false,
		parent: "game-container",
		scene: [Core, BattlegroundScene],
		physics: {
			default: 'arcade',
			arcade: {
				debug: true,
			}
		}
	});


	// window.addEventListener("resize", () => {
	// 	game.scale.resize(window.innerWidth, window.innerHeight);
	// });

	listeners([
		[
			events_.START_NEW_GAME, () => {
				console.log("START_NEW_GAME");
				game.scene.start("BattlegroundScene", state);
			}
		],
	]);

	SaveGame.SaveGameSystem_init(state, game);

	return game;
}
