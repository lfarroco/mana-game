import * as Easystar from "easystarjs";
import { Vec2, asVec2, eqVec2, } from "../../../Models/Geometry";
import { getUnit, getState } from "../../../Models/State";
import BattlegroundScene from "../BattlegroundScene";

/**
 * Function used by the AI to find a path to a target
 * Avoids allied units
 */
export async function lookupAIPAth(
  scene: BattlegroundScene,
  unitId: string,
  source: Vec2,
  target: Vec2,
  range: number = 0
) {

  return new Promise<Vec2[]>(async (resolve, reject) => {
    const easystar = new Easystar.js();
    easystar.setAcceptableTiles([0]);
    easystar.setGrid(scene.grid);

    // set tiles with units as blocked
    const state = getState();

    const activeUnit = getUnit(state)(unitId)
    state.gameData
      .units
      .filter(u => u.hp > 0)
      .filter(u => u.force === activeUnit.force) // avoid allied units
      .forEach(unit => {
        const { x, y } = unit.position;
        if (eqVec2(target, unit.position)) return // target cell is not blocked

        easystar.avoidAdditionalPoint(x, y);
      });

    easystar.disableDiagonals();

    easystar.findPath(source.x, source.y, target.x, target.y, (path) => {
      if (!path) {
        resolve([]);
        return;
      }

      //remove the first and last tiles from the path
      const path_ = path.slice(1, path.length - 1).map(asVec2);

      if (range > 0 && path_.length > range) {
        resolve(path_.slice(0, range));
      } else {
        resolve(path_)
      }

    });

    easystar.calculate();

  })
}
