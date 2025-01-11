import { asVec2, eqVec2 } from "../../Models/Geometry";
import { emit, operations, signals, traverse_, } from "../../Models/Signals";
import { BattlegroundScene } from "./BattlegroundScene";
import { State, getState } from "../../Models/State";

const processTick = async (scene: BattlegroundScene) => {
  // apply user-defined status changes before starting (eg. moving)

  const state = getState();

  // combat phase

  // move phase
  await moveStep(scene, state);

  state.gameData.forces.forEach((force) => {
    //emit(signals.UPDATE_FORCE, { id: force.id, gold: force.gold + 100 });
  });


  state.gameData.tick++;
};



function moveStep(scene: BattlegroundScene, state: State) {

  const unitsToMove = state.gameData.units.filter(s => s.path.length > 0);

  unitsToMove.forEach((unit) => {

    const [next] = unit.path;

    emit(signals.UNIT_MOVED_INTO_CELL, unit.id, next);

    unit.path = unit.path.slice(1);

  });

}



export default processTick;



