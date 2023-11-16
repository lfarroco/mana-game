import Phaser from "phaser";
import { chara } from "../chara";
import { getState } from "../BGState";

export function createMapEntities(
	scene: Phaser.Scene,
	map: Phaser.Tilemaps.Tilemap
) {

	const state = getState()
	// TODO: import cities into state
	map.objects.forEach((objectLayer) => {
		if (objectLayer.name === "cities") {
			objectLayer.objects.forEach((obj) => {
				if (obj.x === undefined || obj.y === undefined) {
					throw new Error("obj.x or obj.y is undefined");
				}
				const cityType: string = obj.properties.find((prop: { name: string; }) => prop.name === "type")?.value;

				if (cityType) {

					scene.add.image(obj.x, obj.y, `${cityType}_map`).setName(obj.name);
				} else {
					throw new Error("cityType is undefined");
				}
			});
		}
	});

	state.squads.forEach(squad => {
		chara(squad.position.x, squad.position.y, scene, squad)
	});
}
