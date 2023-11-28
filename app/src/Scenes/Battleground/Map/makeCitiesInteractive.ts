import Phaser from "phaser";
import { BattlegroundScene } from "../BattlegroundScene";
import { windowVec } from "../../../Models/Misc";
import { emit, events } from "../../../Models/Signals";

export function makeCitiesInteractive(
	scene: BattlegroundScene,
	cities: Phaser.GameObjects.Image[]
) {
	cities.forEach(city => {
		city.setInteractive();
		city.on(Phaser.Input.Events.POINTER_UP, (pointer: Phaser.Input.Pointer, x: number, y: number) => {

			if (pointer.upElement.tagName !== "CANVAS") return;

			if (scene.isSelectingSquadMove && scene.state.selectedEntity?.type === "squad") {
				emit(
					events.SELECT_SQUAD_MOVE_DONE,
					scene.state.selectedEntity.id,
					windowVec(city.x, city.y)
				)
			} else {
				emit(events.CITY_SELECTED, city.name)
			}
		});
	});

}
