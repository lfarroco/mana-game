import { storage } from "../../Storage";
import { getState } from "@Models/State";
import { getSeed } from "@Utils/Random";

export function saveGameData() {
	const { gameData } = getState();
	gameData.seed = getSeed();
	storage.setItem("gameData", JSON.stringify(gameData));
}
