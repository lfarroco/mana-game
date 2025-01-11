import { Vec2 } from "../../Models/Geometry";
import { emit, signals, } from "../../Models/Signals";
import { BattlegroundScene } from "./BattlegroundScene";
import { State, getState } from "../../Models/State";
import { Unit } from "../../Models/Unit";

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

  const unitsToMove = state.gameData.units.filter(s => s.order.type === "move");

  const movements: [Unit, Vec2][] = unitsToMove.map((unit) => {
    const [next] = unit.order.type === "move" ? unit.order.path : [];
    return [unit, next];
  });

  perform(scene, movements)

}

function perform(scene: BattlegroundScene, movements: [Unit, Vec2][]) {

  if (movements.length === 0) {
    // todo: emit end of move phase
    return;
  }

  const [[unit, cell]] = movements;

  emit(signals.MOVE_UNIT_INTO_CELL, unit.id, cell);

  const remaining = unit.order.type === "move" ? unit.order.path.slice(1) : []
  unit.position = cell;

  if (remaining.length === 0) {
    unit.order = {
      type: "none"
    }
  } else
    unit.order = {
      type: "move",
      path: remaining
    }

  scene.time.addEvent({
    delay: 1000,
    callback: () => {
      const remaining = movements.slice(1);
      if (remaining.length > 0) {
        perform(scene, remaining);
      } else {
        //todo: emit end of move phase
      }
    }
  });

}


export default processTick;



