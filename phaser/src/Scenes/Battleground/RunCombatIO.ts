import { BattlegroundScene } from "./BattlegroundScene";
import { getActiveUnits, State, } from "../../Models/State";
import { FORCE_ID_CPU, FORCE_ID_PLAYER, MIN_COOLDOWN } from "./constants";
import * as UnitManager from "./Systems/CharaManager";
import { performAction } from "./performAction";
import { Unit } from "../../Models/Unit";
import { tween } from "../../Utils/animation";

export type WaveOutcome = "player_won" | "player_lost";

async function setupWave(scene: BattlegroundScene) {

  scene.state.battleData.units.forEach(u => {
    u.charge = 0;
    u.refresh = 0;
  });

  const cpuCharas = UnitManager.getCPUCharas();

  await Promise.all(cpuCharas.map(async (chara, i) => {

    const originalY = chara.y;
    chara.y = -100;

    await tween({
      targets: [chara],
      y: originalY,
      delay: i * 100,
    })
  }));

  scene.state.gameData.player.relics.forEach(r => {
    r.events.onBattleStart && r.events.onBattleStart();
  })

  scene.state.battleData.units
    .forEach(u =>
      u.events.onBattleStart.forEach(fn => fn(u))
    );

}

const runCombatIO = (
  scene: BattlegroundScene,
) => new Promise<WaveOutcome>(async resolve => {
  const { state } = scene;

  await setupWave(scene);

  console.log("[runWaveIO]");

  const updateHandler = async (_time: number, delta: number) => {

    const units = chargeUnits(state, delta);

    for (const unit of units)
      performAction(scene)(unit)();

    // TODO: move this to on unit death
    const activeUnits = scene.state.battleData.units.filter(u => u.hp > 0)
    const playerUnits = activeUnits.filter(u => u.force === FORCE_ID_PLAYER);
    const cpuUnits = activeUnits.filter(u => u.force === FORCE_ID_CPU);

    if (playerUnits.length && cpuUnits.length)
      return;

    scene.events.off('update', updateHandler)

    if (playerUnits.length === 0)
      resolve("player_lost");

    if (cpuUnits.length === 0)
      resolve("player_won");

  }

  scene.events.on('update', updateHandler)

});

function chargeUnits(state: State, delta: number): Unit[] {

  const activeUnits = getActiveUnits(state);

  let performUnits: Unit[] = []; // units that are ready to perform an action

  for (const unit of activeUnits) {
    if (unit.hp <= 0) continue;

    // If the delta is too high, there's the risk of being hasted/slowed beyond the expected
    // It should be fine for now by having a delta for each frame (0.016)
    let modifier = 1;
    if (unit.hasted > 0) {
      unit.hasted = Math.max(0, unit.hasted - delta);
      modifier = 2;
    }
    if (unit.slowed > 0) {
      unit.slowed = Math.max(0, unit.slowed - delta);
      modifier = modifier / 2;
    }
    unit.charge += delta * state.options.speed * modifier;

    unit.refresh = Math.max(0, unit.refresh - delta);

    if (unit.charge >= unit.cooldown && unit.refresh === 0) {
      unit.charge = unit.charge - unit.cooldown;
      unit.refresh = MIN_COOLDOWN; // minimum space between actions 
      performUnits.push(unit);
    }

    UnitManager.getChara(unit.id).updateChargeBar();

  }

  return performUnits;

}

export default runCombatIO;