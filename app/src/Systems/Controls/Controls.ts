import { emit, signals } from "../../Models/Signals";
import BattlegroundScene from "../../Scenes/Battleground/BattlegroundScene";


export function init(scene: BattlegroundScene) {
	scene.input.keyboard?.on("keydown-SPACE", () => {
		if (scene.isPaused)
			emit(signals.RESUME_GAME)
		else
			emit(signals.PAUSE_GAME)
	});

	if (scene.input.mouse) {
		scene.input.mouse.disableContextMenu();
	}
}