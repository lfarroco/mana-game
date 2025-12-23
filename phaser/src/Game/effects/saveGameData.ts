import { storage } from "../../Storage";
import { getState } from "@Models/State";
import { RNGManager } from "@Utils/Random";

export function saveGameData() {
	const { gameData } = getState();
	gameData.seed = RNGManager.getInstance().getSeed();
	storage.setItem("gameData", JSON.stringify(gameData));
}
