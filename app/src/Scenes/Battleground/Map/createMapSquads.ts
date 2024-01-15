import { Chara, createChara } from "../../../Components/MapChara";
import { getState } from "../../../Models/State";
import BattlegroundScene from "../BattlegroundScene";
import { SQUAD_STATUS } from "../../../Models/Squad";

export function createMapSquads(scene: BattlegroundScene): Chara[] {

	const state = getState()

	return state.squads
		.filter(squad => squad.status === SQUAD_STATUS.IDLE)
		.map(squad =>
			createChara(scene, squad)
		);
}
