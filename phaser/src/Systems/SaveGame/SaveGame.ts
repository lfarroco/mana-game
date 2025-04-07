import { deleteGame, loadGame, makeSavedGame, saveGame } from "../../Models/SavedGame";
import { emit, signals, listeners } from "../../Models/Signals";
import { GameData, State } from "../../Models/State";
import BattlegroundScene from "../../Scenes/Battleground/BattlegroundScene";

export function SaveGameSystem_init(state: State, game: Phaser.Game) {

	listeners([

		[signals.SAVE_GAME, (gameData: GameData, name: string) => {

			const save = makeSavedGame(name, gameData)

			saveGame(save)

		}],

		[signals.LOAD_GAME, (name: string) => {

			const save = loadGame(name)
			if (save) {

				state.gameData = save.state

				emit(signals.SET_ROUTE, "battleground");
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
			signals.DELETE_GAME, (name: string) => {

				const saveGames = deleteGame(name)

				state.savedGames = saveGames

			}
		]

	])

}