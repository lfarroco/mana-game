import Phaser from "phaser";
import { chara } from "../chara";
import { getState } from "../BGState";

export function createMapSquads(
	scene: Phaser.Scene,
	map: Phaser.Tilemaps.Tilemap
): Phaser.Types.Physics.Arcade.ImageWithDynamicBody[] {

	const state = getState()

	return state.squads.map(squad =>
		chara(squad.position.x, squad.position.y, scene, squad)
	);
}
