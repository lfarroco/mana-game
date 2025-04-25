import { BattlegroundScene } from "./BattlegroundScene";
import { getActiveUnits, getState, updateStatuses } from "../../Models/State";
import { delay } from "../../Utils/animation";
import { FORCE_ID_CPU, FORCE_ID_PLAYER, updatePlayerGoldIO } from "../../Models/Force";
import { vignette } from "./Animations/vignette";
import { GOLD_PER_WAVE } from "./constants";
import { performAction } from "./performAction";
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

export default processTick;