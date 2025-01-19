import * as Easystar from "easystarjs";
import { Vec2, asVec2, } from "../../../Models/Geometry";
import { emit, signals, listeners } from "../../../Models/Signals";
import { getUnit, getState } from "../../../Models/State";
import BattlegroundScene from "../BattlegroundScene";

export function init(scene: BattlegroundScene) {
  listeners([
    [
      signals.PATH_FOUND,
      (unitId: string, path: Vec2[]) => {
        // TODO: move this to chara system?
        const state = getState();

        const unit = getUnit(state)(unitId)

        emit(signals.UPDATE_UNIT, unit.id, {
          order: {
            type: "move",
            path,
          }
        });
      },
    ],
  ]);
}

export async function lookupPath(scene: BattlegroundScene, unitId: string, source: Vec2, target: Vec2) {

  return new Promise<Vec2[]>((resolve, reject) => {
    const easystar = new Easystar.js();
    easystar.setAcceptableTiles([0]);
    easystar.setGrid(scene.grid);

    easystar.findPath(source.x, source.y, target.x, target.y, (path) => {
      if (!path) return;

      const path_ = path.map(asVec2).slice(1)

      emit(signals.PATH_FOUND, unitId, path_);

      resolve(path_)
    });

    easystar.calculate();
  })
}
