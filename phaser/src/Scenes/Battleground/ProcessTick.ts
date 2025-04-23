import { BattlegroundScene } from "./BattlegroundScene";
import { getActiveUnits, getState, updateStatuses } from "../../Models/State";
import { Unit, unitLog } from "../../Models/Unit";
import { delay, tween } from "../../Utils/animation";
import { FORCE_ID_CPU, FORCE_ID_PLAYER, updatePlayerGoldIO } from "../../Models/Force";
import { getJob } from "../../Models/Job";
import { Vec2 } from "../../Models/Geometry";
import { vignette } from "./Animations/vignette";
import { GOLD_PER_WAVE, HALF_TILE_HEIGHT, HALF_TILE_WIDTH, TILE_HEIGHT, TILE_WIDTH } from "./constants";
import { performAction } from "./performAction";
import { TURN_DURATION } from "../../config";
import * as UnitManager from "./Systems/UnitManager";
import { showGrid } from "./Systems/GridSystem";
import { refreshScene } from "./EventHandlers";


const processTick = async (scene: BattlegroundScene) => {
  const state = getState();
  const { player } = state.gameData;

  let continueProcessing = true;

  while (continueProcessing) {
    updateStatuses(state);

    const activeUnits = getActiveUnits(state);

    for (const unit of activeUnits) {
      if (unit.hp <= 0) continue;

      await performAction(scene)(unit)();

      const playerUnits = scene.state.battleData.units.filter(u => u.hp > 0).filter(u => u.force === FORCE_ID_PLAYER);
      const cpuUnits = scene.state.battleData.units.filter(u => u.hp > 0).filter(u => u.force === FORCE_ID_CPU);

      if (cpuUnits.length === 0) {
        await vignette(scene, "Victory!");

        updatePlayerGoldIO(GOLD_PER_WAVE);

        await delay(scene, 1000 / state.options.speed);

        waveFinished(scene);
        continueProcessing = false;
        break;

      } else if (playerUnits.length === 0) {
        updatePlayerGoldIO(GOLD_PER_WAVE);

        player.hp = Math.max(0, player.hp - cpuUnits.length);

        await vignette(scene, "Defeat!");

        await delay(scene, 1000 / state.options.speed);

        waveFinished(scene);
        continueProcessing = false;
        break;
      }
    }

    if (continueProcessing) {
      state.gameData.tick++;
    }
  }
};

function waveFinished(scene: BattlegroundScene) {
  showGrid();

  refreshScene(scene)
}

export async function walk(
  scene: Phaser.Scene,
  unit: Unit,
  path: Vec2[],
  interrupt: null | ((vec: Vec2) => boolean),
) {
  const state = getState();

  const job = getJob(unit.job);
  let walked = 0;

  while (walked < job.moveRange && path[walked]) {
    const next = path[walked];

    const chara = UnitManager.getChara(unit.id);

    //scene.playFx('audio/chip-lay-3')

    await tween({
      targets: [chara.container],
      x: next.x * TILE_WIDTH + HALF_TILE_WIDTH,
      y: next.y * TILE_HEIGHT + HALF_TILE_HEIGHT,
      duration: TURN_DURATION / (2 * state.options.speed),
      ease: "Sine.easeInOut",
    });

    await delay(scene, 200 / state.options.speed);

    unit.position = next;
    unitLog(unit, "finished whalking");

    if (interrupt && interrupt(next)) break;
    walked++;
  }

}

export default processTick;