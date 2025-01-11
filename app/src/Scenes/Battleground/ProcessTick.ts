import { asVec2, distanceBetween, eqVec2 } from "../../Models/Geometry";
import {
  sequence,
  operations,
  traverse_,
} from "../../Models/Signals";
import { BattlegroundScene } from "./BattlegroundScene";
import { State, getState } from "../../Models/State";

const processTick = (scene: BattlegroundScene) => {
  // apply user-defined status changes before starting (eg. moving)

  const state = getState();

  // combat phase

  // move phase
  moveStep(scene, state);

  state.gameData.forces.forEach((force) => {
    //emit(signals.UPDATE_FORCE, { id: force.id, gold: force.gold + 100 });
  });


  state.gameData.tick++;
};



function moveStep(scene: BattlegroundScene, state: State) {
  return traverse_(
    state
      .gameData.units.filter(s => s.path.length > 0)
      .sort((a, b) => a.agility - b.agility),
    (unit) => {
      const [next] = unit.path;

      const nextTile = scene.getTileAt(next);

      // const [occupant] = state.gameData.units
      //   .filter((s) => !isDestroyed(s.status))
      //   .filter((s) => eqVec2(s.position, next));

      // // if there's an enemy in the next tile, begin attack
      // if (occupant && occupant.force !== unit.force) {
      //   // how to start an attack? by changing the status directly or by emitting an specific event?
      //   return [
      //     operations.UPDATE_UNIT(unit.id, {
      //       status: UNIT_STATUS.ATTACKING(occupant.id),
      //     }),
      //   ];
      // }

      // if (unit.movementIndex < TURNS_TO_MOVE) {
      //   return [
      //     operations.UNIT_WALKS_TOWARDS_CELL(
      //       unit.id,
      //       next,
      //       unit.movementIndex,
      //       TURNS_TO_MOVE
      //     ),
      //   ];
      // }

      // if there's an ally there, wait

      // if (occupant && occupant.force === unit.force)
      //   return []

      // check if there's a city here
      // TODO: move this into "UNIT_MOVED_INTO_CELL" event
      const maybeCity = getState().gameData.cities.find(
        (c) =>
          eqVec2(c.boardPosition, asVec2(nextTile)) && c.force !== unit.force
      );

      const maybeCaptureOp =
        maybeCity && maybeCity.force !== unit.force
          ? [operations.CAPTURE_CITY(maybeCity.id, unit.force)]
          : [];

      const [, ...path] = unit.path;

      return []

      // return [
      //   operations.UNIT_WALKS_TOWARDS_CELL(
      //     unit.id,
      //     next,
      //     unit.movementIndex,
      //     TURNS_TO_MOVE
      //   ),
      //   operations.UNIT_LEAVES_CELL(unit.id, unit.position),
      //   operations.UPDATE_UNIT(unit.id, { path }),
      //   operations.UPDATE_UNIT(unit.id, { position: asVec2(nextTile) }),
      //   operations.UNIT_MOVED_INTO_CELL(unit.id, asVec2(nextTile), unit.position),
      //   ...maybeCaptureOp,
      // ].concat(
      //   // alternative: new event UNIT_FINISHED_MOVING
      //   path.length === 0
      //     ? [operations.UPDATE_UNIT(unit.id, { status: UNIT_STATUS.IDLE() })]
      //     : []
      // );
    }
  );
}



export default processTick;



