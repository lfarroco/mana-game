import BattlegroundScene from "../../Scenes/Battleground/BattlegroundScene";

export function init(scene: BattlegroundScene) {

	const keyToSelectorMap = [
		["Z", "#grid-cell-0 button"],
		["X", "#grid-cell-1 button"],
		["C", "#grid-cell-2 button"],
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

		//@ts-ignore
		document.querySelector("#next-turn")?.click();
	});

	// enable this only for prod build
	// if (scene.input.mouse) {

	// 	if (state.inputDisabled) { return; }
	// 	scene.input.mouse.disableContextMenu();
	// }
}