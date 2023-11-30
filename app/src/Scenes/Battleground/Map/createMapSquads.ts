import Phaser from "phaser";
import { Chara, createChara } from "../../../Components/chara";
import { getState } from "../BGState";

export function createMapSquads(scene: Phaser.Scene,): Chara[] {

	const state = getState()

	return state.squads
		.filter(squad => squad.dispatched)
		.map(squad =>
			createChara(scene, squad)
		);
}
