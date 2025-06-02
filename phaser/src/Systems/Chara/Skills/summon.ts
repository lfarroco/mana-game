import { makeUnit } from "../../../Models/Unit";
import * as UnitManager from "../../../Scenes/Battleground/Systems/CharaManager";
import { Chara } from "../Chara";
import { getState } from "../../../Models/State";
import { getEmptySlot } from "../../../Models/Board";

export async function summon(chara: Chara, jobId: string) {

	const { unit } = chara;
	const state = getState();

	const emptySlot = getEmptySlot(state.battleData.units, unit.force);

	if (!emptySlot) {
		console.warn("No empty slot available for summoning");
		return;
	};

	const summoned = makeUnit(unit.force, jobId, emptySlot);
	state.battleData.units.push(summoned);
	UnitManager.summonChara(summoned);

}
