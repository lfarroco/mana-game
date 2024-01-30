import Phaser from "phaser";
import { BattlegroundScene } from "../BattlegroundScene";
import { asVec2 } from "../../../Models/Geometry";
import { emit, signals } from "../../../Models/Signals";
import { getState } from "../../../Models/State";

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

        const state = getState()

        if (
          scene.isSelectingSquadMove ||
          (state.gameData.selectedUnits.length > 0 &&
            pointer.rightButtonReleased())
        ) {
          const tile = scene.getTileAtWorldXY(asVec2(city));

          state.gameData.selectedUnits.forEach((unit) => {
            emit(signals.SELECT_SQUAD_MOVE_DONE, unit, asVec2(tile));
          });
        } else {
          emit(signals.CITIES_SELECTED, [city.name]);

          emit(signals.UNITS_SELECTED, []);
        }
      }
    );
  });
}
