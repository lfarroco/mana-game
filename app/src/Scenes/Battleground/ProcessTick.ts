import { emit, signals, } from "../../Models/Signals";
import { BattlegroundScene } from "./BattlegroundScene";
import { getActiveUnits, getState } from "../../Models/State";
import { Unit, unitLog } from "../../Models/Unit";
import { delay } from "../../Utils/animation";
import { FORCE_ID_CPU, FORCE_ID_PLAYER } from "../../Models/Force";
import { getJob } from "../../Models/Job";
import { asVec2, Vec2 } from "../../Models/Geometry";
import { runPromisesInOrder as sequenceAsync } from "../../utils";
import { vignette } from "./Animations/vignette";
import { GOLD_PER_WAVE } from "./constants";
import { performAction } from "./performAction";

const processTick = async (scene: BattlegroundScene) => {

  emit(signals.TURN_START)

  const state = getState();

  state.inputDisabled = true;

  const unitActions = getActiveUnits(state)
    .map(performAction(scene));

  await sequenceAsync(unitActions);

  state.inputDisabled = false;

  const playerUnits = state.gameData.units.filter(u => u.hp > 0).filter(u => u.force === FORCE_ID_PLAYER);
  const cpuUnits = state.gameData.units.filter(u => u.hp > 0).filter(u => u.force === FORCE_ID_CPU);

  if (cpuUnits.length === 0) {
    await vignette(scene, "Victory!");

    scene.playerForce.gold += GOLD_PER_WAVE;

    await delay(scene, 1000 / state.options.speed);

    emit(signals.WAVE_FINISHED, FORCE_ID_PLAYER);

  } else if (playerUnits.length === 0) {

    scene.playerForce.gold += GOLD_PER_WAVE;

    scene.playerForce.hp = Math.max(0, scene.playerForce.hp - cpuUnits.length);

    await vignette(scene, "Defeat!");

    await delay(scene, 1000 / state.options.speed);

    emit(signals.WAVE_FINISHED, FORCE_ID_CPU);

  } else {

    state.gameData.tick++;
    emit(signals.TURN_END)
    await processTick(scene);
  }

};

export async function walk(
  scene: BattlegroundScene,
  unit: Unit,
  path: Vec2[],
  interrupt: null | ((vec: Vec2) => boolean),
) {

  const job = getJob(unit.job);
  let walked = 0;

  const activeChara = scene.getChara(unit.id);

  while (walked < job.moveRange && path[walked]) {
    const next = path[walked];

    await panTo(scene, asVec2(activeChara.container));

    emit(signals.MOVE_UNIT_INTO_CELL_START, unit.id, next);

    scene.playFx("audio/chip-lay-3")

    await delay(scene, 200 / scene.state.options.speed);

    unit.position = next;
    unitLog(unit, "finished whalking");

    if (interrupt && interrupt(next)) break;
    walked++;
  }

}

export async function panTo(scene: BattlegroundScene, vec: Vec2) {

  if (!scene.state.options.scrollEnabled) return;

  const speed = getState().options.speed

  scene.cameras.main.pan(vec.x, vec.y, 500 / speed, "Expo.easeOut", false);

  await delay(scene, 500 / speed);
}

export default processTick;