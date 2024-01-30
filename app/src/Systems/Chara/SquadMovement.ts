import { eqVec2, Vec2 } from "../../Models/Geometry";
import { listeners, signals } from "../../Models/Signals";
import { getSquad, State } from "../../Models/State";

// we have a standalone system, that contains its own logic and state
// - system
// - ui
// - phaser scene
// this structure allows us to keep the system logic separate from the phaser scene and the ui
// using events we can send and receive data between the system and the phaser scene and the ui

export function init(state: State) {
  listeners([
    [
      signals.RECRUIT_UNIT,
      (squadId: string) => {
        const squad = getSquad(state)(squadId);

        squad.movementIndex = 0;
      },
    ],
    [
      signals.SQUAD_WALKS_TOWARDS_CELL,
      (squadId: string, vec: Vec2) => {
        const squad = getSquad(state)(squadId);

        squad.movementIndex++;
      },
    ],
    [
      signals.SQUAD_MOVED_INTO_CELL,
      (squadId: string, vec: Vec2) => {
        const squad = getSquad(state)(squadId);

        squad.movementIndex = 0;
      },
    ],
    [
      signals.SELECT_SQUAD_MOVE_DONE,
      (squadId: string, target: Vec2) => {
        const squad = getSquad(state)(squadId);

        if (eqVec2(squad.position, target)) return;

        squad.movementIndex = 0;
      },
    ],
    [
      signals.CHANGE_DIRECTION,
      (squadId: string, _vec: Vec2) => {
        const squad = getSquad(state)(squadId);

        squad.movementIndex = 0;
      },
    ],
  ]);
}

