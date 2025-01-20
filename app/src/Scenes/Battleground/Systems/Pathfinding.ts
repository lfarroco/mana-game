import * as Easystar from "easystarjs";
import { Vec2, asVec2, } from "../../../Models/Geometry";
import { emit, signals, listeners } from "../../../Models/Signals";
import { getUnit, getState } from "../../../Models/State";
import BattlegroundScene from "../BattlegroundScene";
import { FORCE_ID_CPU } from "../../../Models/Force";
import { wait } from "@testing-library/user-event/dist/utils";

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

/**
 * Function used by the AI to find a path to a target
 * Avoids allied units
 */
export async function lookupAIPAth(
  scene: BattlegroundScene,
  unitId: string,
  source: Vec2,
  target: Vec2,
) {

  return new Promise<Vec2[]>(async (resolve, reject) => {
    const easystar = new Easystar.js();
    easystar.setAcceptableTiles([0]);
    easystar.setGrid(scene.grid);

    // set tiles with units as blocked
    const state = getState();
    state.gameData
      .units
      .filter(u => u.force === FORCE_ID_CPU)
      .forEach(unit => {
        const { x, y } = unit.position;
        easystar.avoidAdditionalPoint(x, y);
      });

    easystar.findPath(source.x, source.y, target.x, target.y, (path) => {
      if (!path) {
        resolve([]);
        return;
      }


      const path_ = path.map(asVec2).slice(1)


      resolve(path_)
    });

    easystar.calculate();

  })
}
