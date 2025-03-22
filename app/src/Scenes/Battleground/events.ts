import { FORCE_ID_PLAYER } from "../../Models/Force";
import { vec2 } from "../../Models/Geometry";
import { emit, listeners, signals } from "../../Models/Signals";
import { getUnit } from "../../Models/State";
import { makeUnit } from "../../Models/Unit";
import { delay, tween } from "../../Utils/animation";
import { vignette } from "./Animations/vignette";
import BattlegroundScene from "./BattlegroundScene";
import { waves } from "./enemyWaves";
import processTick from "./ProcessTick";

export function setupEventListeners(scene: BattlegroundScene) {
	listeners([
		[signals.BATTLEGROUND_TICK, () => {
			processTick(scene);
		}],
		[signals.UNIT_CREATED, (unitId: string) => {
			const unit = getUnit(scene.state)(unitId);
			scene.renderUnit(unit);
		}],
		[signals.UNIT_SELECTED, () => {
			const pop = scene.sound.add('ui/button_click');
			pop.play();
		}],
		[signals.WAVE_START, async () => {

			scene.hideDropZone();
			scene.hideUI();

			tween({
				targets: [scene.tileGrid],
				alpha: 0,
				duration: 2500 / scene.speed,
				ease: 'Power2',
			});

			scene.state.gameData.units = scene.state.gameData.units.map(u => {
				u.initialPosition = vec2(u.position.x, u.position.y)
				return u;
			})

			await delay(scene, 200 / scene.speed);

			scene.playFx('audio/battle_theme');
			emit(signals.BATTLEGROUND_TICK)

		}],
		[signals.WAVE_FINISHED, async () => {
			// clear the scene
			// and reposition the units

			scene.charas.forEach(chara => chara.container.destroy())
			scene.state.gameData.units = scene.state.gameData.units.filter(u => u.force === FORCE_ID_PLAYER);
			scene.charas = []
			scene.state.gameData.units = scene.state.gameData.units.map(u => {
				return makeUnit(
					u.id,
					u.force,
					u.job,
					u.initialPosition
				)
			});
			scene.state.gameData.tick = 0;

			scene.tileGrid.alpha = 1;

			scene.displayDropZone();

			scene.updateUI();

			scene.state.gameData.units.forEach(u =>
				scene.renderUnit(u)
			);

			scene.state.gameData.wave++;

			const isGameOver = scene.state.gameData.wave > Object.keys(waves).length;

			if (isGameOver) {
				await vignette(scene, "Victory! Thanks for Playing!");

				scene.charas.forEach(chara => chara.container.destroy())
				scene.charas = []
				scene.state.gameData.units = []
				scene.state.gameData.wave = 1;
			}

			scene.createWave();
			scene.updateUI();
		}],
	]);
}