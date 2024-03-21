import { emit, signals } from "../../Models/Signals";
import BattlegroundScene from "../../Scenes/Battleground/BattlegroundScene";


export function init(scene: BattlegroundScene) {
	scene.input.keyboard?.on("keydown-SPACE", () => {
		if (scene.isPaused)
			emit(signals.RESUME_GAME)
		else
			emit(signals.PAUSE_GAME)
	});

	scene.input.keyboard?.on("keydown-ESC", () => {


	});

	scene.input.keyboard?.on("keydown-A", () => {
		//@ts-ignore
		document.querySelector('#grid-cell-0 button')?.click()

	});
	scene.input.keyboard?.on("keydown-S", () => {
		//@ts-ignore
		document.querySelector('#grid-cell-1 button')?.click()
	});
	scene.input.keyboard?.on("keydown-D", () => {
		//@ts-ignore
		document.querySelector('#grid-cell-2 button')?.click()
	});
	scene.input.keyboard?.on("keydown-Z", () => {
		//@ts-ignore
		document.querySelector('#grid-cell-3 button')?.click()
	});

	scene.input.keyboard?.on("keydown-X", () => {
		//@ts-ignore
		document.querySelector('#grid-cell-4 button')?.click()
	});

	scene.input.keyboard?.on("keydown-C", () => {
		//@ts-ignore
		document.querySelector('#grid-cell-5 button')?.click()
	});

	if (scene.input.mouse) {
		scene.input.mouse.disableContextMenu();
	}
}