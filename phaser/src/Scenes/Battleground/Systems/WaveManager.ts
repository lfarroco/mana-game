import { waves } from "../enemyWaves";
import { BattlegroundScene } from "../BattlegroundScene";
import * as UnitManager from "./UnitManager";
import processTick from "../ProcessTick";
import { HANDLER_ON_BATTLE_START, runUnitTraitHandlers } from "../../../Models/Traits";

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

	await runUnitTraitHandlers(scene.state.battleData.units, HANDLER_ON_BATTLE_START);

	await processTick(scene);

}

export function handleWaveFinished(_scene: BattlegroundScene) {
	// Wave finished logic that could be extracted
}