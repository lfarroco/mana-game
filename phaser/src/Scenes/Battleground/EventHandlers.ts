import { vignette } from "./Animations/vignette";
import BattlegroundScene from "./BattlegroundScene";
import { waves } from "./enemyWaves";
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

	scene.state.gameData.player.units.forEach(UnitManager.renderChara);

	const isGameOver = scene.state.gameData.hour > Object.keys(waves).length;

	if (isGameOver) {
		await vignette(scene, "Victory! Thanks for Playing!");

		UnitManager.clearCharas();
		scene.state.battleData.units = []
		scene.state.gameData.hour = 1;
		scene.state.gameData.day = 1;
	}

}