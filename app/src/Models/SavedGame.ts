import { GameData } from "./State";

export type SavedGame = {
	name: string;
	state: GameData;
	savedAt: number;
}
export const makeSavedGame = (name: string, state: GameData): SavedGame => {
	return {
		name,
		state,
		savedAt: Date.now()
	}
}

type SavedGamesIndex = string[]

export function getSavedGamesIndex(): SavedGamesIndex {
	const savedGames = localStorage.getItem('savedGames')

	if (savedGames) {
		return JSON.parse(savedGames)
	}

	return []

}

export function saveGame(savedGame: SavedGame) {
	const savedGames = getSavedGamesIndex()

	if (!savedGames.includes(savedGame.name))
		savedGames.push(savedGame.name)

	localStorage.setItem('savedGames', JSON.stringify(savedGames))
	localStorage.setItem(savedGame.name, JSON.stringify(savedGame))
}

export function loadGame(name: string): SavedGame | null {
	const savedGame = localStorage.getItem(name)

	if (savedGame) {
		return JSON.parse(savedGame)
	}

	return null
}

export function deleteGame(name: string) {
	const savedGames = getSavedGamesIndex()

	const newSavedGames = savedGames.filter((game: string) => game !== name)

	localStorage.setItem('savedGames', JSON.stringify(newSavedGames))
	localStorage.removeItem(name)
}
