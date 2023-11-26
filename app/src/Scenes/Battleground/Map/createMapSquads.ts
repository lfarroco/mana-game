import Phaser from "phaser";
import { Chara, chara } from "../chara";
import { getState } from "../BGState";

export function createMapSquads( scene: Phaser.Scene,): Chara[] {

	const state = getState()

	return state.squads
		.filter(squad => squad.dispatched)
		.map(squad =>
			chara(scene, squad)
		);
}
