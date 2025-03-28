import { waves } from "../enemyWaves";
import { vec2 } from "../../../Models/Geometry";
import { BattlegroundScene } from "../BattlegroundScene";
import * as UnitManager from "./UnitManager";
import processTick from "../ProcessTick";

let scene: BattlegroundScene;

export function init(sceneRef: BattlegroundScene) {
	scene = sceneRef;
}

export async function createWave(id: number) {
	const waveSpec = waves[id];

	const enemies = waveSpec.map(u => ({ ...u }));

	scene.state.gameData.units = scene.state.gameData.units.concat(enemies);

	scene.state.gameData.units = scene.state.gameData.units.map(u => {
		u.initialPosition = vec2(u.position.x, u.position.y);
		return u;
	});

	enemies.forEach((unit) => UnitManager.renderUnit(unit));

	await processTick(scene);

}

export function handleWaveFinished(scene: BattlegroundScene) {
	// Wave finished logic that could be extracted
}