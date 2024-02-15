import { eqVec2, Vec2 } from "../../Models/Geometry";
import { listeners, signals } from "../../Models/Signals";
import { getUnit, State } from "../../Models/State";

// we have a standalone system, that contains its own logic and state
// - system
// - ui
// - phaser scene
// this structure allows us to keep the system logic separate from the phaser scene and the ui
// using events we can send and receive data between the system and the phaser scene and the ui

export function init(state: State) {
  listeners([
    [
      signals.UNIT_CREATED,
      (unitId: string) => {
        const unit = getUnit(state)(unitId);

        unit.movementIndex = 0;
      },
    ],
    [
      signals.UNIT_WALKS_TOWARDS_CELL,
      (unitId: string, _vec: Vec2) => {
        const unit = getUnit(state)(unitId);

        unit.movementIndex++;
      },
    ],
    [
      signals.UNIT_MOVED_INTO_CELL,
      (unitId: string, _vec: Vec2) => {
        const unit = getUnit(state)(unitId);

        unit.movementIndex = 0;
      },
    ],
    [
      signals.SELECT_UNIT_MOVE_DONE,
      (unitId: string, target: Vec2) => {
        const unit = getUnit(state)(unitId);

        if (eqVec2(unit.position, target)) return;

        unit.movementIndex = 0;
      },
    ],
    [
      signals.CHANGE_DIRECTION,
      (unitId: string, _vec: Vec2) => {
        const unit = getUnit(state)(unitId);

        unit.movementIndex = 0;
      },
    ],
  ]);
}

