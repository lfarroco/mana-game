import { Vec2 } from "../../Models/Geometry";
import { emit, signals, } from "../../Models/Signals";
import { BattlegroundScene } from "./BattlegroundScene";
import { State, getState } from "../../Models/State";
import { Unit } from "../../Models/Unit";

const processTick = async (scene: BattlegroundScene) => {
  const state = getState();

  await moveStep(scene, state);

  await combatStep(scene, state);

  state.gameData.tick++;
};


const performMovement = (scene: BattlegroundScene, movements: [Unit, Vec2][]) => async () => {

  return new Promise<null>(resolve => {
    if (movements.length === 0) {
      resolve(null);
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
          return performMovement(scene, remaining);
        } else {
          resolve(null);
        }
      }
    });

  })

}

async function runPromisesInOrder(promiseFunctions: (() => Promise<any>)[]) {
  for (const func of promiseFunctions) {
    await func();
  }
  return promiseFunctions
}

async function moveStep(scene: BattlegroundScene, state: State) {

  const unitsToMove = state.gameData.units.filter(s => s.order.type === "move");

  const movements = unitsToMove.map((unit) => {
    const [next] = unit.order.type === "move" ? unit.order.path : [null];
    return [unit, next] as [Unit, Vec2];
  }).map(movements => performMovement(scene, [movements]));

  await runPromisesInOrder(movements)

}

async function combatStep(scene: BattlegroundScene, state: State) {

  const units = state.gameData.units.filter(u => u.order.type === "skill");

  const skills = units.map(unit => {
    if (unit.order.type !== "skill") return () => Promise.resolve()
    const skill = unit.order.skill;
    const target = unit.order.target;

    return () => {
      return new Promise<null>(resolve => {
        scene.time.addEvent({
          delay: 1000,
          callback: () => {

            console.log("using skill", skill, "on", target)
            unit.order = {
              type: "none"
            }
            resolve(null);
          }
        });
      });
    }
  })

  await runPromisesInOrder(skills)

}


export default processTick;