import { emit, signals } from "../../Models/Signals";
import BattlegroundScene from "../../Scenes/Battleground/BattlegroundScene";

export function init(scene: BattlegroundScene) {

	const keyToSelectorMap = [
		["A", "#grid-cell-0 button"],
		["S", "#grid-cell-1 button"],
		["D", "#grid-cell-2 button"],
		["Z", "#grid-cell-3 button"],
		["X", "#grid-cell-4 button"],
		["C", "#grid-cell-5 button"],
	]

	keyToSelectorMap.forEach(([key, selector]) => {
		scene.input.keyboard?.on(`keydown-${key}`, () => {
			//@ts-ignore
			document.querySelector(selector)?.click();
		});
	});

	scene.input.keyboard?.on("keydown-ESC", () => {
		// bind to close-current-context-window actio
	});

	//bind space to end turn
	scene.input.keyboard?.on("keydown-SPACE", () => {
		emit(signals.BATTLEGROUND_TICK)
	});

	if (scene.input.mouse) {
		scene.input.mouse.disableContextMenu();
	}
}