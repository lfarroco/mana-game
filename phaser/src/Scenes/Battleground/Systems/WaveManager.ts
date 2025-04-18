import { waves } from "../enemyWaves";
import { BattlegroundScene } from "../BattlegroundScene";
import * as UnitManager from "./UnitManager";
import processTick from "../ProcessTick";
import { runPromisesInOrder } from "../../../utils";

export let scene: BattlegroundScene;

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

	const promises = scene.state.battleData.units
		.flatMap(u => u.traits
			.filter(t => t.events.onBattleStart)
			.map(t => t.events.onBattleStart!(u))
		);

	await runPromisesInOrder(promises)

	await processTick(scene);
}

export function handleWaveFinished(_scene: BattlegroundScene) {
	// Wave finished logic that could be extracted
}