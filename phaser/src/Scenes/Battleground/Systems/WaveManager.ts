import { BattlegroundScene } from "../BattlegroundScene";
import * as UnitManager from "./UnitManager";
import processTick from "../ProcessTick";
import { Unit } from "../../../Models/Unit";

export let scene: BattlegroundScene;

export function init(sceneRef: BattlegroundScene) {
	scene = sceneRef;
}
export async function createWave(
	units: Unit[],
	adventure: {
		generate: () => Unit[];
		current: number;
		total: number
	}
) {

	console.log("createWave:: units", units);

	UnitManager.clearCharas();

	scene.state.battleData.units = units
		.filter(u => u.hp > 0)
		.concat(adventure.generate())
		.map(u => ({ ...u }));

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

	await processTick(scene, adventure);
}

export function handleWaveFinished(_scene: BattlegroundScene) {
	// Wave finished logic that could be extracted
}