import Phaser from "phaser";
import { BattlegroundScene } from "../BattlegroundScene";
import { asVec2 } from "../../../Models/Geometry";
import { emit, events } from "../../../Models/Signals";

export function makeCitiesInteractive(
  scene: BattlegroundScene,
  cities: Phaser.GameObjects.Image[]
) {
  cities.forEach((city) => {
    city.setInteractive();
    city.on(
      Phaser.Input.Events.POINTER_UP,
      (pointer: Phaser.Input.Pointer, _x: number, _y: number) => {
        if (pointer.upElement.tagName !== "CANVAS") return;

        if (
          scene.isSelectingSquadMove ||
          (scene.state.selectedUnits.length > 0 &&
            pointer.rightButtonReleased())
        ) {
          const tile = scene.layers?.background.getTileAtWorldXY(
            city.x,
            city.y
          );
          if (!tile) return;

          scene.state.selectedUnits.forEach((unit) => {
            emit(events.SELECT_SQUAD_MOVE_DONE, unit, asVec2(tile));
          });
        } else {
          emit(events.CITIES_SELECTED, [city.name]);
          emit(events.UNITS_SELECTED, []);
        }
      }
    );
  });
}
