import { BattlegroundScene } from "./BattlegroundScene";
import { getActiveUnits, getState, State, } from "../../Models/State";
import { delay } from "../../Utils/animation";
import { FORCE_ID_CPU, FORCE_ID_PLAYER, MIN_COOLDOWN } from "./constants";
import { vignette } from "./Animations/vignette";
import { showGrid } from "./Systems/GridSystem";
import { refreshScene } from "./EventHandlers";
import { createWave } from "./Systems/WaveManager";
import * as bar from "./Systems/ProgressBar";
import { Adventure } from "../../Models/Adventure";
import { dropItem } from "../../Systems/Item/ItemDrop";
import { getChara } from "./Systems/UnitManager";
import { updateChargeBar } from "../../Systems/Chara/Chara";
import { performAction } from "./performAction";
import { Unit } from "../../Models/Unit";

const processTick = async (
  scene: BattlegroundScene,
  adventure: Adventure,
) => {
  const state = getState();

  console.log("processTick:: tick", state.gameData.tick);

  const updateHandler = (_time: number, delta: number) => {

    const units = charge(state, delta);

    for (const unit of units) {

      performAction(scene)(unit)();

    }

    checkEndOfMatch(scene, adventure, turnOff);

  }

  const turnOff = () => scene.events.off('update', updateHandler);

  scene.events.on('update', updateHandler)

};

const finishAdventure = (scene: BattlegroundScene) => {
  waveFinished(scene);
}

function finishWave(scene: BattlegroundScene, adventure: Adventure, onEnd: () => void) {
  onEnd();

  scene.state.battleData.units.forEach(u => {
    u.charge = 0;
  });

  bar.updateProgressBar(adventure);
}

function charge(state: State, delta: number): Unit[] {

  const activeUnits = getActiveUnits(state);

  let performUnits: Unit[] = []; // units that are ready to perform an action

  for (const unit of activeUnits) {
    if (unit.hp <= 0) continue;

    unit.charge += delta;

    unit.cooldown = Math.max(0, unit.cooldown - delta);

    if (unit.charge >= unit.agility && unit.cooldown === 0) {
      unit.charge = unit.charge - unit.agility;
      unit.cooldown = MIN_COOLDOWN; // minimum space between actions 
      performUnits.push(unit);
    }

    const chara = getChara(unit.id);
    updateChargeBar(chara);

  }

  return performUnits;

}

export async function checkEndOfMatch(scene: BattlegroundScene, adventure: Adventure, onEnd: () => void) {

  const state = getState();
  const playerUnits = scene.state.battleData.units.filter(u => u.hp > 0).filter(u => u.force === FORCE_ID_PLAYER);
  const cpuUnits = scene.state.battleData.units.filter(u => u.hp > 0).filter(u => u.force === FORCE_ID_CPU);

  if (cpuUnits.length === 0) {

    const wave = adventure.waves[adventure.currentWave];

    if (wave.loot) {
      const loot = wave.loot();
      state.gameData.player.items.push(...loot);

      loot.forEach(item => dropItem(scene, { x: 300, y: 300 }, item))

      // TODO: proper loot screen
      vignette(scene, "Loot!")
    }


    if (adventure.currentWave >= adventure.waves.length - 1) {
      // TODO: proper victory screen

      finishWave(scene, adventure, onEnd);
      await vignette(scene, "Adventure completed, congratulations!")
      return finishAdventure(scene);
    } else {
      adventure.currentWave++;
      bar.updateProgressBar(adventure);
    }
  }

  if (cpuUnits.length === 0) {


    finishWave(scene, adventure, onEnd);
    await delay(scene, 1000 / state.options.speed);

    const playerUnits = state.battleData.units.filter(u => u.force === FORCE_ID_PLAYER);

    return await createWave([...playerUnits], adventure)

  }

  if (playerUnits.length === 0) {

    await vignette(scene, "End of Run!");

    await delay(scene, 1000 / state.options.speed);

    finishWave(scene, adventure, onEnd);
    return finishAdventure(scene);
  }

}

function waveFinished(scene: BattlegroundScene) {
  showGrid();

  refreshScene(scene)
}

export default processTick;