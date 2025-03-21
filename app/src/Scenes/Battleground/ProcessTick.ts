import { emit, signals, } from "../../Models/Signals";
import { BattlegroundScene } from "./BattlegroundScene";
import { getActiveUnits, getState } from "../../Models/State";
import { Unit, unitLog } from "../../Models/Unit";
import { delay, tween } from "../../Utils/animation";
import { FORCE_ID_CPU, FORCE_ID_PLAYER } from "../../Models/Force";
import { getJob } from "../../Models/Job";
import { Vec2 } from "../../Models/Geometry";
import { runPromisesInOrder as sequenceAsync } from "../../utils";
import { vignette } from "./Animations/vignette";
import { GOLD_PER_WAVE, HALF_TILE_HEIGHT, HALF_TILE_WIDTH, TILE_HEIGHT, TILE_WIDTH } from "./constants";
import { performAction } from "./performAction";
import { TURN_DURATION } from "../../config";

const processTick = async (scene: BattlegroundScene) => {

  emit(signals.TURN_START)

  const state = getState();

  const unitActions = getActiveUnits(state)
    .map(performAction(scene));

  await sequenceAsync(unitActions);

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

  while (walked < job.moveRange && path[walked]) {
    const next = path[walked];

    const chara = scene.getChara(unit.id);

    await tween({
      targets: [chara.container],
      x: next.x * TILE_WIDTH + HALF_TILE_WIDTH,
      y: next.y * TILE_HEIGHT + HALF_TILE_HEIGHT,
      duration: TURN_DURATION / (2 * scene.speed),
      ease: "Sine.easeInOut",
    })

    scene.playFx("audio/chip-lay-3")

    await delay(scene, 200 / scene.speed);

    unit.position = next;
    unitLog(unit, "finished whalking");

    if (interrupt && interrupt(next)) break;
    walked++;
  }

}

export default processTick;