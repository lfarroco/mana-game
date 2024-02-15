import Phaser from "phaser";
import { BattlegroundScene } from "../BattlegroundScene";
import { asVec2, eqVec2 } from "../../../Models/Geometry";
import { emit, signals } from "../../../Models/Signals";
import { getUnit, getState } from "../../../Models/State";
import { pingAt } from "./Ping";
import { City } from "../../../Models/City";
import { FORCE_ID_CPU } from "../../../Models/Force";
import { isDestroyed } from "../../../Models/Unit";

export function makeCitiesInteractive(
  scene: BattlegroundScene,
  cities: { sprite: Phaser.GameObjects.Image, city: City }[]
) {
  cities.forEach((city) => {
    city.sprite.setInteractive();
    city.sprite.on(
      Phaser.Input.Events.POINTER_UP,
      (pointer: Phaser.Input.Pointer, _x: number, _y: number) => {
        if (pointer.upElement.tagName !== "CANVAS") return;

        const state = getState()


        if (!scene.isTileVisible(asVec2(city.city.boardPosition))) return

        if (
          scene.isSelectingSquadMove ||
          (state.gameData.selectedUnits.length > 0 &&
            pointer.rightButtonReleased())
        ) {
          const tile = scene.getTileAtWorldXY(asVec2(city.sprite));

          const hasEnemy = state.gameData.selectedUnits.some((id) => getUnit(state)(id).force === FORCE_ID_CPU);

          if (hasEnemy) {

            scene.sound.play("ui/error");

            return
          }

          state.gameData.selectedUnits.filter(unitId => {

            const unit = getUnit(state)(unitId);

            return !eqVec2(unit.position, asVec2(city.city.boardPosition))

          }).forEach((unit) => {
            emit(signals.SELECT_UNIT_MOVE_DONE, unit, asVec2(tile));
          });

          pingAt(scene, city.sprite.x, city.sprite.y);

        } else {
          if (state.gameData.selectedCity === city.city.id) return
          emit(signals.CITY_SELECTED, city.city.id);

          if (state.gameData.selectedUnits.length > 0) {
            emit(signals.UNITS_SELECTED, []);
          }

        }

        // is there a unit in the city?
        if (state.gameData.selectedUnits.length === 0) {
          const unit = state.gameData
            .units
            .filter(s => !isDestroyed(s.status))
            .find(
              (s) => eqVec2(s.position, city.city.boardPosition)
            );

          if (unit) {
            emit(signals.UNITS_SELECTED, [unit.id]);
          }
        }
      }
    );
  });
}
