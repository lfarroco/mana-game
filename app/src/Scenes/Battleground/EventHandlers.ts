import { FORCE_ID_PLAYER } from "../../Models/Force";
import { vec2 } from "../../Models/Geometry";
import { emit, listeners, signals } from "../../Models/Signals";
import { getUnit } from "../../Models/State";
import { delay } from "../../Utils/animation";
import { vignette } from "./Animations/vignette";
import BattlegroundScene from "./BattlegroundScene";
import { waves } from "./enemyWaves";
import * as UIManager from "./Systems/UIManager";
import * as UnitManager from "./Systems/UnitManager";

export function setupEventListeners(scene: BattlegroundScene) {
	listeners([
		[signals.UNIT_CREATED, (unitId: string) => {
			const unit = getUnit(scene.state)(unitId);
			UnitManager.renderUnit(unit);
		}],
		[signals.UNIT_SELECTED, () => {
			const pop = scene.sound.add('ui/button_click');
			pop.play();
		}],
		[signals.WAVE_START, async () => {

			UIManager.hideDropZone();
			UIManager.hideUI();

			await delay(scene, 200 / scene.speed);

			scene.playFx('audio/battle_theme');
			emit(signals.BATTLEGROUND_TICK)

		}],
		[signals.WAVE_FINISHED, async () => {
			// clear the scene
			// and reposition the units

			UnitManager.clearCharas();

			scene.state.battleData.units = [];

			scene.state.gameData.tick = 0;

			UIManager.displayDropZone();
			UIManager.updateUI();

			scene.state.gameData.player.units.forEach(UnitManager.renderUnit);

			const isGameOver = scene.state.gameData.hour > Object.keys(waves).length;

			if (isGameOver) {
				await vignette(scene, "Victory! Thanks for Playing!");

				UnitManager.clearCharas();
				scene.state.battleData.units = []
				scene.state.gameData.hour = 1;
				scene.state.gameData.day = 1;
			}

		}],
		[signals.MOVEMENT_STARTED, () => {
			scene.playFx('audio/chip-lay-3')
		}],
		[signals.UNIT_CASTS_SPECIAL, () => {
			scene.playFx('audio/laser')
		}]
	]);
}