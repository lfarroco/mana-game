import Phaser from "phaser";
import { BattlegroundScene } from "../BattlegroundScene";
import { getSquad, getState } from "../../../Models/State";
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

      const squad = getSquad(state)(chara.id);

      if (pointer.upElement.tagName !== "CANVAS") return;

      if (!chara.sprite.active) return;

      if (scene.isSelectingAttackTarget) {
        if (squad.force === FORCE_ID_CPU) {

          const source = getSquad(state)(state.gameData.selectedUnits[0])
          const job = getJob(source.job)

          const distance = distanceBetween((source.position))(squad.position)

          if (distance > job.attackRange) {
            scene.sound.play("ui/error");
          } else {

            const direction = getDirection(source.position, squad.position)
            emit(signals.SELECT_ATTACK_TARGET_DONE)
            emit(signals.UPDATE_SQUAD, source.id, { status: UNIT_STATUS.ATTACKING(squad.id) })
            emit(signals.FACE_DIRECTION, source.id, direction)

          }

          return
        }

      }

      if (scene.isSelectingSquadMove || pointer.rightButtonReleased()) {

        if (state.gameData.selectedUnits.length < 1) return

        const tile = scene.getTileAtWorldXY(asVec2(chara.sprite));

        const hasEnemy = state.gameData.selectedUnits.some(
          (id) => getSquad(state)(id).force === FORCE_ID_CPU
        );

        if (hasEnemy) {
          scene.sound.play("ui/error");
          return
        }

        state.gameData.selectedUnits.forEach((sqdId) => {
          const squad = getSquad(state)(sqdId);
          if (eqVec2(squad.position, asVec2(tile))) return;
          emit(signals.SELECT_SQUAD_MOVE_DONE, sqdId, asVec2(tile));
        });
        pingAt(scene, chara.sprite.x, chara.sprite.y);

      } else {

        if (state.gameData.selectedUnits.length === 1 && state.gameData.selectedUnits[0] === chara.id) {
          return
        }
        emit(signals.UNITS_SELECTED, [chara.id]);
        // is city at tile?
        const squad = getSquad(state)(chara.id);
        const city = state.gameData.cities.find(
          (c) => eqVec2(c.boardPosition, squad.position)
        );
        if (city && state.gameData.selectedCity !== city.id) {
          emit(signals.CITY_SELECTED, city.id);
        }

      }
    }
  );
}
