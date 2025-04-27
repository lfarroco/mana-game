import { vignette } from "./Animations/vignette";
import BattlegroundScene from "./BattlegroundScene";
import * as UIManager from "./Systems/UIManager";
import * as UnitManager from "./Systems/UnitManager";


// clear the scene
// and reposition the units
export async function refreshScene(scene: BattlegroundScene) {
	UnitManager.clearCharas();

	scene.state.battleData.units = [];

	scene.state.gameData.tick = 0;

	UIManager.displayDropZone();
	UIManager.updateUI();

	scene.state.gameData.player.units.forEach(u => UnitManager.summonChara(u));

	const isGameOver = scene.state.gameData.day > 10;

	if (isGameOver) {
		await vignette(scene, "Victory! Thanks for Playing!");

		UnitManager.clearCharas();
		scene.state.battleData.units = []
		scene.state.gameData.hour = 1;
		scene.state.gameData.day = 1;
	}

}