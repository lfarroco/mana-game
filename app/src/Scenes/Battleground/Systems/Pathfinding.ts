import * as Easystar from "easystarjs";
import { Vec2, asVec2, eqVec2 } from "../../../Models/Geometry";
import { emit, signals, listeners } from "../../../Models/Signals";
import { getUnit, getState } from "../../../Models/State";
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
        // TODO: move this to chara system?
        const state = getState();

        const unit = getUnit(state)(unitId)

        emit(signals.UPDATE_UNIT, unit.id, { path });
      },
    ],
  ]);
}

