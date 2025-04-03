import { waves } from "../enemyWaves";
import { BattlegroundScene } from "../BattlegroundScene";
import * as UnitManager from "./UnitManager";
import processTick from "../ProcessTick";
import { getTrait } from "../../../Models/Traits";
import { runPromisesInOrder } from "../../../utils";

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

	const promises = scene.state.battleData.units.flatMap((unit, i) => {
		return unit.traits.reduce((xs, traitId) => {
			const trait = getTrait(traitId);

			if (trait.onBattleStart) {
				return xs.concat([async () => await trait.onBattleStart!(unit)]);
			} else {
				return xs
			}
		}, [] as (() => Promise<void>)[]);
	});

	await runPromisesInOrder(promises)

	await processTick(scene);

}

export function handleWaveFinished(scene: BattlegroundScene) {
	// Wave finished logic that could be extracted
}