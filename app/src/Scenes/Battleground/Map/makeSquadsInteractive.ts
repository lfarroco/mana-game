import Phaser from "phaser";
import { BattlegroundScene } from "../BattlegroundScene";
import { getUnit, getState } from "../../../Models/State";
import { signals, emit } from "../../../Models/Signals";
import { asVec2, distanceBetween, eqVec2 } from "../../../Models/Geometry";
import { Chara } from "../../../Systems/Chara/Chara";
import { pingAt } from "./Ping";
import { FORCE_ID_CPU } from "../../../Models/Force";
import { getJob } from "../../../Models/Job";
import { UNIT_STATUS } from "../../../Models/Unit";
import { getDirection } from "../../../Models/Direction";



export function makeSquadInteractive(chara: Chara, scene: BattlegroundScene) {
  chara.sprite.setInteractive();
  chara.sprite.on(
    Phaser.Input.Events.POINTER_UP,
    (pointer: Phaser.Input.Pointer, x: number, y: number) => {
      const state = getState();

      const unit = getUnit(state)(chara.id);

      if (pointer.upElement.tagName !== "CANVAS") return;

      if (!chara.sprite.active) return;

      if (scene.isSelectingAttackTarget) {
        if (unit.force === FORCE_ID_CPU) {

          const source = getUnit(state)(state.gameData.selectedUnits[0])
          const job = getJob(source.job)

          const distance = distanceBetween((source.position))(unit.position)

          if (distance > job.attackRange) {
            scene.sound.play("ui/error");
          } else {

            const direction = getDirection(source.position, unit.position)
            emit(signals.SELECT_ATTACK_TARGET_DONE)
            emit(signals.UPDATE_UNIT, source.id, { status: UNIT_STATUS.ATTACKING(unit.id) })
            emit(signals.FACE_DIRECTION, source.id, direction)

          }

          return
        }

      }

      if (scene.isSelectingSkillTarget) {

        emit(signals.SELECT_SKILL_TARGET_DONE, chara.id)
        //emit(signals.UPDATE_UNIT, state.gameData.selectedUnits[0], { status: UNIT_STATUS.CASTING(chara.id, state.gameData.) })
        return;

      }

      if (scene.isSelectingSquadMove || pointer.rightButtonReleased()) {

        if (state.gameData.selectedUnits.length < 1) return

        const tile = scene.getTileAtWorldXY(asVec2(chara.sprite));

        const hasEnemy = state.gameData.selectedUnits.some(
          (id) => getUnit(state)(id).force === FORCE_ID_CPU
        );

        if (hasEnemy) {
          scene.sound.play("ui/error");
          return
        }

        state.gameData.selectedUnits.forEach((unitId) => {
          const unit = getUnit(state)(unitId);
          if (eqVec2(unit.position, asVec2(tile))) return;
          emit(signals.SELECT_UNIT_MOVE_DONE, unitId, asVec2(tile));
        });
        pingAt(scene, chara.sprite.x, chara.sprite.y);

      } else {

        if (state.gameData.selectedUnits.length === 1 && state.gameData.selectedUnits[0] === chara.id) {
          return
        }
        emit(signals.UNITS_SELECTED, [chara.id]);
        // is city at tile?
        const unit = getUnit(state)(chara.id);
        const city = state.gameData.cities.find(
          (c) => eqVec2(c.boardPosition, unit.position)
        );
        if (city && state.gameData.selectedCity !== city.id) {
          emit(signals.CITY_SELECTED, city.id);
        }

      }
    }
  );
}
