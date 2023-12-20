import Phaser from "phaser";
import { Chara, createChara } from "../../../Components/chara";
import { getState } from "../../../Models/State";
import BattlegroundScene from "../BattlegroundScene";

export function createMapSquads(scene: BattlegroundScene): Chara[] {

	const state = getState()

	return state.squads
		.filter(squad => squad.dispatched)
		.map(squad =>
			createChara(scene, squad)
		);
}
