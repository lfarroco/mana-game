import { FORCE_ID_CPU } from "../../../Models/Force";
import { Vec2, vec2, eqVec2 } from "../../../Models/Geometry";
import { makeUnit } from "../../../Models/Unit";
import { runPromisesInOrder } from "../../../utils";
import { delay } from "../../../Utils/animation";
import { BLOB } from "../../../Models/Job";
import * as UnitManager from "../../../Scenes/Battleground/Systems/UnitManager";
import { Chara } from "../Chara";
import { getState } from "../../../Models/State";

export async function summon(chara: Chara) {

	const { scene, unit } = chara;
	const state = getState();

	let emptySlots = [] as Vec2[];

	// pick 4 empty slots close to the unit
	let i = 1;
	while (emptySlots.length < 4 && i < 5) {
		const slots = [
			vec2(unit.position.x + i, unit.position.y),
			vec2(unit.position.x - i, unit.position.y),
			vec2(unit.position.x, unit.position.y + i),
			vec2(unit.position.x, unit.position.y - i),
		];

		emptySlots = emptySlots.concat(
			slots.filter(slot => {
				const unitAtSlot = state.battleData.units
					.filter(u => u.hp > 0)
					.find(u => eqVec2(u.position, slot));
				return !unitAtSlot;
			})
		);

		i++;
	}

	emptySlots = emptySlots.slice(0, 4);

	// create a blob in each slot
	const actions = emptySlots.map(slot => async () => {
		const blob = makeUnit(Math.random().toString(), FORCE_ID_CPU, BLOB, slot);
		state.battleData.units.push(blob);
		UnitManager.summonChara(blob);
		await delay(scene, 500 / state.options.speed);
	});

	await runPromisesInOrder(actions);

}
