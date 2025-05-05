import { BattlegroundScene } from "../BattlegroundScene";
import * as UnitManager from "./UnitManager";
import processTick from "../ProcessTick";
import { Unit } from "../../../Models/Unit";
import { Adventure } from "../../../Models/Adventure";
import { tween } from "../../../Utils/animation";

export let scene: BattlegroundScene;

export function init(sceneRef: BattlegroundScene) {
	scene = sceneRef;
}
export async function createWave(
	units: Unit[],
	adventure: Adventure,
) {

	const currentWave = adventure.waves[adventure.currentWave];

	UnitManager.clearCharas();

	scene.state.battleData.units = units
		.filter(u => u.hp > 0)
		.concat(currentWave.generate())
		.map(u => ({ ...u }));

	scene.state.battleData.units.forEach(u => UnitManager.summonChara(u, false, false));

	const cpuCharas = UnitManager.getCPUCharas();

	await Promise.all(cpuCharas.map(async (chara, i) => {

		const originalX = chara.container.x;
		chara.container.x = chara.container.x - 1000;

		await tween({
			targets: [chara.container],
			x: originalX,
			duration: 500,
			delay: i * 100,
		})
	}));

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