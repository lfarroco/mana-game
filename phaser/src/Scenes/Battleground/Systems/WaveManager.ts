import { waves } from "../enemyWaves";
import { BattlegroundScene } from "../BattlegroundScene";
import * as UnitManager from "./UnitManager";
import processTick from "../ProcessTick";

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

	scene.state.battleData.units.forEach(u => UnitManager.summonChara(u));

	const itemPromises = scene.state.battleData.units
		.map(u => u.equip?.type?.key === "equipment" ?
			u.equip.type.onCombatStart(u) : () => Promise.resolve())

	const promises = scene.state.battleData.units
		.flatMap(u => u.events.onBattleStart.map(fn => fn(u)))
		.concat(itemPromises)

	for (const func of promises) {
		await func();
	}

	await processTick(scene);
}

export function handleWaveFinished(_scene: BattlegroundScene) {
	// Wave finished logic that could be extracted
}