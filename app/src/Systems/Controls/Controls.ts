import { emit, events } from "../../Models/Signals";
import BattlegroundScene from "../../Scenes/Battleground/BattlegroundScene";


export function init(scene: BattlegroundScene) {
	scene.input.keyboard?.on("keydown-SPACE", () => {
		if (scene.isPaused)
			emit(events.RESUME_GAME)
		else
			emit(events.PAUSE_GAME)
	});
}