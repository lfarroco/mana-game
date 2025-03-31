import { waves } from "../enemyWaves";
import { BattlegroundScene } from "../BattlegroundScene";
import * as UnitManager from "./UnitManager";
import processTick from "../ProcessTick";
import { getTrait } from "../../../Models/Traits";

let scene: BattlegroundScene;

export function init(sceneRef: BattlegroundScene) {
	scene = sceneRef;
}

export async function createWave(id: number) {
	const enemies = waves[id];

	UnitManager.clearCharas();

	scene.state.battleData.units = scene.state.gameData.player.units
		.concat(enemies)
		.map(u => ({ ...u }))

	scene.state.battleData.units.forEach(UnitManager.renderChara);

	scene.state.battleData.units.forEach((unit, i) => {
		unit.traits.forEach(traitId => {
			const trait = getTrait(traitId);

			if (trait.onBattleStart) {
				trait.onBattleStart(scene.state, unit);
			}
		});
	});

	await processTick(scene);

}

export function handleWaveFinished(scene: BattlegroundScene) {
	// Wave finished logic that could be extracted
}