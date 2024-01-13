import Phaser from "phaser";
import { BattlegroundScene } from "../BattlegroundScene";
import { asVec2 } from "../../../Models/Misc";
import { emit, events } from "../../../Models/Signals";

export function makeCitiesInteractive(
	scene: BattlegroundScene,
	cities: Phaser.GameObjects.Image[]
) {
	cities.forEach(city => {
		city.setInteractive();
		city.on(Phaser.Input.Events.POINTER_UP, (pointer: Phaser.Input.Pointer, _x: number, _y: number) => {
			if (pointer.upElement.tagName !== "CANVAS") return;



			if (
				scene.state.selectedEntity?.type === "squad" &&
				(scene.isSelectingSquadMove || pointer.rightButtonReleased())
			) {

				const tile = scene.layers?.background.getTileAtWorldXY(city.x, city.y);
				if (!tile) return
				emit(
					events.SELECT_SQUAD_MOVE_DONE,
					scene.state.selectedEntity.id,
					asVec2(tile)
				)
			} else {
				emit(events.CITY_SELECTED, city.name)
			}
		});
	});

}
