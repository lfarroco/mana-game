import * as Easystar from "easystarjs";
import { Vec2, asVec2, eqVec2 } from "../../../Models/Geometry";
import { emit, signals, listeners } from "../../../Models/Signals";
import { getUnit, getState } from "../../../Models/State";
import { UNIT_STATUS, isAttacking, isMoving } from "../../../Models/Unit";
import { getDirection } from "../../../Models/Direction";
import BattlegroundScene from "../BattlegroundScene";

export function init(scene: BattlegroundScene) {
  listeners([
    [
      signals.LOOKUP_PATH,
      (unitId: string, source: Vec2, target: Vec2) => {
        const easystar = new Easystar.js();
        easystar.setAcceptableTiles([0]);
        easystar.setGrid(scene.grid);
        easystar.enableSync();

        const state = getState();

        const unit = getUnit(state)(unitId)

        // experimenting with avoiding other squads
        // const otherSquads = state.gameData.squads
        //   .filter((s) => s.status.type !== UNIT_STATUS_KEYS.DESTROYED)
        //   .filter(s => scene.isTileVisible(s.position))
        //   .filter((s) => s.force === unit.force)
        //   //.filter(s => s.status.type !== UNIT_STATUS_KEYS.MOVING)
        //   .filter((s) => s.id !== unit.id)

        // otherSquads.forEach((unit) => {
        //   // //except for target
        //   // if (eqVec2(unit.position, target)) return;
        //   // easystar.avoidAdditionalPoint(unit.position.x, unit.position.y);
        // });

        easystar.findPath(source.x, source.y, target.x, target.y, (path) => {
          if (!path) return;

          const path_ = path.map(asVec2).slice(1)

          if (
            unit.path.length > 0 &&
            path_.length > 0 &&
            !eqVec2(unit.path[0], path_[0])
          ) {
            emit(signals.CHANGE_DIRECTION, unitId, path_[0]);
          }
          emit(signals.PATH_FOUND, unitId, path_);
        });
        easystar.calculate();
      },
    ],
    [
      signals.PATH_FOUND,
      (unitId: string, path: Vec2[]) => {
        const state = getState();

        const unit = getUnit(state)(unitId)

        // in case of choosing own cell
        if (path.length === 0) {
          emit(signals.UPDATE_UNIT, unit.id, { path: [] });
          if (isMoving(unit.status)) {
            emit(signals.UPDATE_UNIT, unit.id, { status: UNIT_STATUS.IDLE() });
          }

          return;
        } else {
          emit(signals.UPDATE_UNIT, unit.id, { path });
          const direction = getDirection(unit.position, path[0]);
          emit(signals.FACE_DIRECTION, unit.id, direction);

          if (isAttacking(unit.status)) { //TODO: is there an event to exit combat?
            //emit(signals.REMOVE_EMOTE, unit.id, "combat-emote")
            emit(signals.COMBAT_FINISHED, unit.id);
          }

          emit(signals.UPDATE_UNIT, unit.id, {
            status: UNIT_STATUS.MOVING(path[path.length - 1]),
          });

        }
      },
    ],
  ]);
}

