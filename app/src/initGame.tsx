import * as Phaser from "phaser";
import BattlegroundScene from "./Scenes/Battleground/BattlegroundScene";
import { signals as events_ } from './Models/Signals';
import { listeners } from './Models/Signals';
import Core from "./Scenes/Core/Core";
import * as SaveGame from "./Systems/SaveGame/SaveGame";
import { State } from "./Models/State";
import Events from 'events'

export function initGame(state: State, emitter: Events) {

	const game = new Phaser.Game({
		type: Phaser.AUTO,
		mode: Phaser.Scale.FIT,
		autoCenter: Phaser.Scale.CENTER_BOTH,
		parent: "game",
		width: window.innerWidth,
		height: window.innerHeight,
		scene: [Core, BattlegroundScene]
	});


	window.addEventListener("resize", () => {
		game.scale.resize(window.innerWidth, window.innerHeight);
	});

	listeners([
		[
			events_.START_NEW_GAME, () => {
				game.scene.start("BattlegroundScene", state);
			}
		],
	]);

	SaveGame.init(state, game);

	return game;
}
