import { makeUnit } from "../../../Models/Entities/Unit";
import * as UnitManager from "../../../Scenes/Battleground/Systems/CharaManager";
import { Chara } from "../Chara";
import { getState } from "../../../Models/State";

export async function summon(
	chara: Chara,
	cardId: string,
) {

	const { unit } = chara;
	const state = getState();

	const emptySlot = chara.parent.playerBoard?.getEmptySlot(state.battleData.units, unit.force);

	if (!emptySlot) {
		console.warn("No empty slot available for summoning");
		return;
	};

	const summoned = makeUnit(unit.force, cardId, emptySlot);
	state.battleData.units.push(summoned);
	UnitManager.summonChara(summoned);

}
