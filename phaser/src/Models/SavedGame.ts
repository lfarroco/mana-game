import { SessionData } from "@Core/Types";
import { storage } from "@Storage/index";

export type SavedGame = {
	name: string;
	state: SessionData;
	savedAt: number;
};
export const makeSavedGame = (name: string, state: SessionData): SavedGame => {
	const cleanedState: SessionData = {
		...state,
	};
	return {
		name,
		state: cleanedState,
		savedAt: Date.now(),
	};
};

export type SavedGamesIndex = string[];

export function getSavedGamesIndex(): SavedGamesIndex {
	const savedGames = storage.getItem("savedGames");

	if (savedGames) {
		return JSON.parse(savedGames);
	}

	return [];
}

export function saveGame(savedGame: SavedGame) {
	const savedGames = getSavedGamesIndex();

	if (!savedGames.includes(savedGame.name)) savedGames.push(savedGame.name);

	storage.setItem("savedGames", JSON.stringify(savedGames));
	storage.setItem(savedGame.name, JSON.stringify(savedGame));
}

export function loadGame(name: string): SavedGame | null {
	const savedGame = storage.getItem(name);

	if (savedGame) {
		return JSON.parse(savedGame);
	}

	return null;
}

export function deleteGame(name: string) {
	const savedGames = getSavedGamesIndex();

	const newSavedGames = savedGames.filter((game: string) => game !== name);

	storage.setItem("savedGames", JSON.stringify(newSavedGames));
	storage.removeItem(name);

	return newSavedGames;
}
