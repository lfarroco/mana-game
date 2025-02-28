import { emit, signals, } from "../../Models/Signals";
import { BattlegroundScene } from "./BattlegroundScene";
import { State, getActiveUnits, getState } from "../../Models/State";
import { Unit, unitLog } from "../../Models/Unit";
import { delay } from "../../Utils/animation";
import { FORCE_ID_CPU, FORCE_ID_PLAYER } from "../../Models/Force";
import { lookupAIPAth } from "./Systems/Pathfinding";
import { getJob } from "../../Models/Job";
import { asVec2, distanceBetween, sortByDistanceTo, Vec2 } from "../../Models/Geometry";
import { runPromisesInOrder as sequenceAsync } from "../../utils";
import { vignette } from "./Animations/vignette";
import { shoot } from "../../Systems/Chara/Skills/shoot";
import { healing } from "../../Systems/Chara/Skills/healing";
import { slash } from "../../Systems/Chara/Skills/slash";

const processTick = async (scene: BattlegroundScene) => {


  const playerForce = getState().gameData.forces.find(f => f.id === FORCE_ID_PLAYER)!;

  emit(signals.TURN_START)

  const state = getState();

  state.inputDisabled = true;

  const unitActions = getActiveUnits(state)
    .map(performAction(scene));

  await sequenceAsync(unitActions);

  state.gameData.tick++;
  emit(signals.TURN_END)

  state.inputDisabled = false;

  const playerUnits = state.gameData.units.filter(u => u.hp > 0).filter(u => u.force === FORCE_ID_PLAYER);
  const cpuUnits = state.gameData.units.filter(u => u.hp > 0).filter(u => u.force === FORCE_ID_CPU);

  console.log(playerUnits.length, cpuUnits.length);

  if (cpuUnits.length === 0) {
    await vignette(scene, "Victory!");

    playerForce.gold += 2;

    await delay(scene, 1000 / state.options.speed);

    emit(signals.COMBAT_FINISHED, FORCE_ID_PLAYER);
  } else if (playerUnits.length === 0) {

    playerForce.gold += 1;

    playerForce.hp = Math.max(0, playerForce.hp - cpuUnits.length);

    await vignette(scene, "Defeat!");

    await delay(scene, 1000 / state.options.speed);

    emit(signals.COMBAT_FINISHED, FORCE_ID_CPU);
  } else {

    await processTick(scene);
  }

};


const performAction = (
  scene: BattlegroundScene,
) => (
  unit: Unit,
) => async () => {

  if (unit.hp <= 0) return;

  const job = getJob(unit.job)

  if (job.skill === "slash") {
    const mtarget = await moveToMeleeTarget(scene)(unit)
    if (mtarget)
      await slash(scene, unit, mtarget)
  }
  else if (job.skill === "heal") {
    await healing(scene)(unit);
  }
  else if (job.skill === "shoot") {
    await shoot(scene)(unit);
  }

}

export async function walk(scene: BattlegroundScene, unit: Unit, path: Vec2[], interrupt: null | ((vec: Vec2) => boolean)) {

  const job = getJob(unit.job);
  let walked = 0;

  const unitChara = scene.getChara(unit.id);

  while (walked < job.moveRange && path[walked]) {
    const next = path[walked];

    await panTo(scene, asVec2(unitChara.container));

    emit(signals.MOVE_UNIT_INTO_CELL_START, unit.id, next);

    scene.playFx("audio/chip-lay-3")

    await delay(scene, 200 / scene.state.options.speed);

    unit.position = next;
    unitLog(unit, "finished whalking");

    if (interrupt && interrupt(next)) break;
    walked++;
  }

}

// TODO: refactor to "move to range", and have allied/enemy as parameter
// 0 -> melee
// 1/3 -> ranged

const moveToMeleeTarget = (
  scene: BattlegroundScene,
) => async (unit: Unit): Promise<Unit | null> => {
  const { state } = scene;

  const [closestEnemy] = getUnitsByProximity(state, unit, true);

  if (!closestEnemy) {
    return null;
  };

  const distance = distanceBetween(unit.position)(closestEnemy.position);

  if (distance < 1) return closestEnemy

  const path = await lookupAIPAth(scene, unit.id, unit.position, closestEnemy.position);

  await walk(scene, unit, path, null);

  if (distanceBetween(unit.position)(closestEnemy.position) > 1) {
    return null
  }

  return closestEnemy;

}

export function getUnitsByProximity(state: State, unit: Unit, enemy: boolean): Unit[] {
  return getActiveUnits(state)
    .filter(u => enemy ? u.force !== unit.force : u.force === unit.force)
    .filter(u => u.id !== unit.id)
    .sort((a, b) => sortByDistanceTo(unit.position)(a.position)(b.position));
}

export async function panTo(scene: BattlegroundScene, vec: Vec2) {

  if (!scene.state.options.scrollEnabled) return;

  const speed = getState().options.speed

  scene.cameras.main.pan(vec.x, vec.y, 500 / speed, "Expo.easeOut", false);

  await delay(scene, 500 / speed);
}

export default processTick;