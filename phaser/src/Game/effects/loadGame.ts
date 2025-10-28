import { SCENE_KEYS } from "@Constants/constants";
import { getState, getCurrentScene } from "@Models/State";

export function loadGame() {
	const data = localStorage.getItem("gameData");
	if (data) {
		getState().gameData = JSON.parse(data);
		getCurrentScene().scene.start(SCENE_KEYS.BATTLEGROUND, JSON.parse(data));
	}
}
