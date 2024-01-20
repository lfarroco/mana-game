import { loadGame, makeSavedGame, saveGame } from "../../Models/SavedGame";
import { emit, events, listeners } from "../../Models/Signals";
import { GameData } from "../../Models/State";

export function init(game: Phaser.Game) {

	listeners([

		[events.SAVE_GAME, (gameData: GameData, name: string) => {

			const save = makeSavedGame(name, gameData)

			saveGame(save)

		}],

		[events.LOAD_GAME, (name: string) => {

			const save = loadGame(name)
			if (save) {
				emit(events.SET_ROUTE, "battleground");
				// check if the scene is already running
				if (game.scene.isActive("BattlegroundScene")) {
					game.scene.stop("BattlegroundScene");
				}
				game.scene.start("BattlegroundScene", save.state);
			}
		}]

	])

}