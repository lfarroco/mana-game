import { storage } from "../../Storage";
import { getState } from "@Models/State";

export function saveGameData() {
	const { gameData } = getState();
	storage.setItem("gameData", JSON.stringify(gameData));
}
