import * as Easystar from "easystarjs";
import { Vec2, asVec2, eqVec2 } from "../../../Models/Geometry";
import { emit, signals, listeners } from "../../../Models/Signals";
import { getSquad, getState } from "../../../Models/State";
import { UNIT_STATUS_KEYS, UNIT_STATUS, isAttacking } from "../../../Models/Unit";
import { getDirection } from "../../../Models/Direction";
import BattlegroundScene from "../BattlegroundScene";

export function init(scene: BattlegroundScene) {
  listeners([
    [
      signals.LOOKUP_PATH,
      (squadId: string, source: Vec2, target: Vec2) => {
        const easystar = new Easystar.js();
        easystar.setAcceptableTiles([0]);
        easystar.setGrid(scene.grid);
        easystar.enableSync();

        const state = getState();

        const squad = getSquad(state)(squadId)

        const otherSquads = state.gameData.squads
          .filter((s) => s.status.type !== UNIT_STATUS_KEYS.DESTROYED)
          .filter(
            (s) => s.force !== squad.force || s.status.type !== UNIT_STATUS_KEYS.MOVING
          )
          .filter((s) => s.id !== squad.id)
          .filter(s => scene.isTileVisible(s.position))

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
            emit(signals.CHANGE_DIRECTION, squadId, path_[0]);
          }
          emit(signals.PATH_FOUND, squadId, path_);
        });
        easystar.calculate();
      },
    ],
    [
      signals.PATH_FOUND,
      (squadId: string, path: Vec2[]) => {
        const state = getState();

        const squad = getSquad(state)(squadId)

        // in case of choosing own cell
        if (path.length === 0) {
          emit(signals.UPDATE_SQUAD, squad.id, { path: [] });
          if (squad.status.type === UNIT_STATUS_KEYS.MOVING) {
            emit(signals.UPDATE_SQUAD, squad.id, { status: UNIT_STATUS.IDLE() });
          }

          return;
        } else {
          emit(signals.UPDATE_SQUAD, squad.id, { path });
          const direction = getDirection(squad.position, path[0]);
          emit(signals.FACE_DIRECTION, squad.id, direction);

          if (isAttacking(squad.status)) { //TODO: is there an event to exit combat?
            emit(signals.REMOVE_EMOTE, squad.id, "combat-emote")
          }

          emit(signals.UPDATE_SQUAD, squad.id, {
            status: UNIT_STATUS.MOVING(path[path.length - 1]),
          });

        }
      },
    ],
  ]);
}

