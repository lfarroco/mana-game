import * as Easystar from "easystarjs";
import { Vec2, asVec2, eqVec2 } from "../../../Models/Geometry";
import { emit, events, listeners } from "../../../Models/Signals";
import { getState } from "../../../Models/State";
import { SQUAD_STATUS } from "../../../Models/Squad";
import { getDirection } from "../../../Models/Direction";

export function init(grid: number[][]) {
  listeners([
    [
      events.LOOKUP_PATH,
      (key: string, source: Vec2, target: Vec2) => {
        const easystar = new Easystar.js();
        easystar.setAcceptableTiles([0]);
        easystar.setGrid(grid);
        easystar.enableSync();

        const state = getState();

        const squad = state.squads.find((sqd) => sqd.id === key);
        if (!squad) throw new Error("squad not found");

        const otherSquads = state.squads
          .filter((s) => s.status !== SQUAD_STATUS.DESTROYED)
          .filter(
            (s) => s.force !== squad.force || s.status !== SQUAD_STATUS.MOVING
          )
          .filter((s) => s.id !== squad.id);

        // make tile with othersquads unwalkable

        otherSquads.forEach((squad) => {
          //except for target
          if (eqVec2(squad.position, target)) return;
          easystar.avoidAdditionalPoint(squad.position.x, squad.position.y);
        });

        easystar.findPath(source.x, source.y, target.x, target.y, (path) => {
          if (!path) return;

          const path_ = path.map(asVec2).slice(1)

          if (
            squad.path.length > 0 &&
            path_.length > 0 &&
            !eqVec2(squad.path[0], path_[0])
          ) {
            emit(events.CHANGE_DIRECTION, key, path_[0]);
          }
          emit(events.PATH_FOUND, key, path_);
        });
        easystar.calculate();
      },
    ],
    [
      events.PATH_FOUND,
      (key: string, path: Vec2[]) => {
        const state = getState();

        const squad = state.squads.find((sqd) => sqd.id === key);
        if (!squad) throw new Error("squad not found");

        // in case of choosing own cell
        if (path.length === 0) {
          emit(events.UPDATE_SQUAD, squad.id, { path: [] });
          if (squad.status === SQUAD_STATUS.MOVING) {
            emit(events.UPDATE_SQUAD, squad.id, { status: SQUAD_STATUS.IDLE });
          }

          return;
        } else {
          emit(events.UPDATE_SQUAD, squad.id, { path });
          const direction = getDirection(squad.position, path[0]);
          emit(events.FACE_DIRECTION, squad.id, direction);
        }
      },
    ],
  ]);
}

