import * as Easystar from "easystarjs";
import { Vec2, asVec2, eqVec2, } from "../../../Models/Geometry";
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

        // mark cells with enemy units as unwalkable
        const state = getState();
        const units = state.gameData.units;
        const unit = getUnit(state)(unitId);
        const enemyUnits = units.filter((u) => u.force !== unit.force);

        enemyUnits
          .filter(u => u.hp > 0)
          .forEach((enemyUnit) => {
            const { x, y } = enemyUnit.position;
            easystar.avoidAdditionalPoint(x, y);
          });

        easystar.findPath(source.x, source.y, target.x, target.y, (path) => {
          if (!path) return;

          const path_ = path.map(asVec2).slice(1)

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

        // is own cell?
        if (path.length === 0) {
          emit(signals.MOVEMENT_FINISHED, unit.id);
          return;
        } else {

          emit(signals.UPDATE_UNIT, unit.id, {
            order: {
              type: "move",
              path,
            }
          });
        }
      },
    ],
  ]);
}

