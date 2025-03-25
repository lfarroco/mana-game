import { waves } from "../enemyWaves";
import { vec2 } from "../../../Models/Geometry";
import { BattlegroundScene } from "../BattlegroundScene";
import * as UnitManager from "./UnitManager";

let scene: BattlegroundScene;

export function init(sceneRef: BattlegroundScene) {
	scene = sceneRef;
}

export function createWave(id: number) {
	const enemies = waves[id];

	scene.state.gameData.units = scene.state.gameData.units.concat(enemies);

	scene.state.gameData.units = scene.state.gameData.units.map(u => {
		u.initialPosition = vec2(u.position.x, u.position.y);
		return u;
	});

	enemies.forEach((unit) => UnitManager.renderUnit(unit));
}

export function handleWaveFinished(scene: BattlegroundScene) {
	// Wave finished logic that could be extracted
}