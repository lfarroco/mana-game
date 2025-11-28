import { GameData } from "./State";
import { storage } from "../Storage";

export type SavedGame = {
	name: string;
	state: GameData;
	savedAt: number;
};
export const makeSavedGame = (name: string, state: GameData): SavedGame => {
	const cleanedState: GameData = {
		...state,
	};
	return {
		name,
		state: cleanedState,
		savedAt: Date.now(),
	};
};

export type SavedGamesIndex = string[];

export async function getSavedGamesIndex(): Promise<SavedGamesIndex> {
	const savedGames = await storage.getItem("savedGames");

	if (savedGames) {
		return JSON.parse(savedGames);
	}

	return [];
}

export async function saveGame(savedGame: SavedGame) {
	const savedGames = await getSavedGamesIndex();

	if (!savedGames.includes(savedGame.name)) savedGames.push(savedGame.name);

	await storage.setItem("savedGames", JSON.stringify(savedGames));
	await storage.setItem(savedGame.name, JSON.stringify(savedGame));
}

export async function loadGame(name: string): Promise<SavedGame | null> {
	const savedGame = await storage.getItem(name);

	if (savedGame) {
		return JSON.parse(savedGame);
	}

	return null;
}

export async function deleteGame(name: string) {
	const savedGames = await getSavedGamesIndex();

	const newSavedGames = savedGames.filter((game: string) => game !== name);

	await storage.setItem("savedGames", JSON.stringify(newSavedGames));
	await storage.removeItem(name);

	return newSavedGames;
}
