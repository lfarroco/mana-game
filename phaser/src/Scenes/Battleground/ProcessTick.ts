import { BattlegroundScene } from "./BattlegroundScene";
import { getActiveUnits, getState, } from "../../Models/State";
import { delay } from "../../Utils/animation";
import { FORCE_ID_CPU, FORCE_ID_PLAYER } from "./constants";
import { vignette } from "./Animations/vignette";
import { performAction } from "./performAction";
import { showGrid } from "./Systems/GridSystem";
import { refreshScene } from "./EventHandlers";
import { createWave } from "./Systems/WaveManager";
import * as bar from "./Systems/ProgressBar";
import { Adventure } from "../../Models/Adventure";
import { dropItem } from "../../Systems/Item/ItemDrop";

const processTick = async (
  scene: BattlegroundScene,
  adventure: Adventure,
) => {
  const state = getState();

  console.log("processTick:: tick", state.gameData.tick);

  let continueProcessing = true;

  const finishAdventure = () => {
    waveFinished(scene);
    continueProcessing = false;
  }

  while (continueProcessing) {

    console.log("CURRENT WAVE >>>", adventure.currentWave);

    const activeUnits = getActiveUnits(state);

    for (const unit of activeUnits) {
      if (unit.hp <= 0) continue;

      // TODO: track which one is the active unit
      // if they overlap, throw an error
      console.log("[~~~start~~~")
      await performAction(scene)(unit)();
      console.log("~~~~end~~~]")

      const playerUnits = scene.state.battleData.units.filter(u => u.hp > 0).filter(u => u.force === FORCE_ID_PLAYER);
      const cpuUnits = scene.state.battleData.units.filter(u => u.hp > 0).filter(u => u.force === FORCE_ID_CPU);

      if (cpuUnits.length === 0) {

        const wave = adventure.waves[adventure.currentWave];

        if (wave.loot) {
          const loot = wave.loot();
          state.gameData.player.items.push(...loot);

          await Promise.all(loot.map(item => dropItem(scene, { x: 300, y: 300 }, item)));

          // TODO: proper loot screen
          await vignette(scene, "Loot!")
        }

        if (adventure.currentWave >= adventure.waves.length - 1) {
          // TODO: proper victory screen
          await vignette(scene, "Adventure completed, congratulations!")
          return finishAdventure();
        } else {
          adventure.currentWave++;
          bar.updateProgressBar(adventure);
        }
      }

      if (cpuUnits.length === 0) {

        await delay(scene, 1000 / state.options.speed);

        const playerUnits = state.battleData.units.filter(u => u.force === FORCE_ID_PLAYER);

        return await createWave([...playerUnits], adventure)

      }

      if (playerUnits.length === 0) {

        await vignette(scene, "End of Run!");

        await delay(scene, 1000 / state.options.speed);

        return finishAdventure();
      }

    }

    //run end of turn effects
    for (const unit of activeUnits) {
      if (unit.hp <= 0) continue;

      for (const effect of unit.events.onTurnEnd) {
        await effect(unit)();
      }

      for (const [key, status] of Object.entries(unit.statuses)) {
        if (status.duration > 0) {
          status.duration--;
          await status.effect(unit)();
        } else {
          delete unit.statuses[key];
        }
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