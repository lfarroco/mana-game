import { SCENE_KEYS } from "@Constants/constants";
import { getState, getCurrentScene } from "@Models/State";
import { getSavedData } from "./getSavedData";

export function loadGame() {
	const data = getSavedData();
	if (!data) return;
	getState().gameData = JSON.parse(data);
	getCurrentScene().scene.start(SCENE_KEYS.BATTLEGROUND, JSON.parse(data));
}
