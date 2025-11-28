import { storage } from "../../Storage";
import { getState } from "@Models/State";

export async function saveGameData() {
	const { gameData } = getState();
	await storage.setItem("gameData", JSON.stringify(gameData));
}
