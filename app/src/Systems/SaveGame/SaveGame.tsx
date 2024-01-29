import { deleteGame, loadGame, makeSavedGame, saveGame } from "../../Models/SavedGame";
import { emit, events, listeners } from "../../Models/Signals";
import { GameData, State } from "../../Models/State";
import BattlegroundScene from "../../Scenes/Battleground/BattlegroundScene";

export function init(state: State, game: Phaser.Game) {

	listeners([

		[events.SAVE_GAME, (gameData: GameData, name: string) => {

			const save = makeSavedGame(name, gameData)

			saveGame(save)

		}],

		[events.LOAD_GAME, (name: string) => {

			const save = loadGame(name)
			if (save) {

				state.gameData = save.state

				emit(events.SET_ROUTE, "battleground");
				// check if the scene is already running
				if (game.scene.isActive("BattlegroundScene")) {

					const scene = game.scene.getScene("BattlegroundScene") as BattlegroundScene

					scene.cleanup()
					scene.create(state)

				} else {
					game.scene.start("BattlegroundScene", state);
				}
			}
		}], [
			events.DELETE_GAME, (name: string) => {

				const saveGames = deleteGame(name)

				state.savedGames = saveGames

			}
		]

	])

}