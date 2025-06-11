import { BattlegroundScene } from "./BattlegroundScene";
import { getActiveUnits, State } from "../../Models/State";
import { FORCE_ID_CPU, FORCE_ID_PLAYER, MIN_COOLDOWN } from "./constants";
import * as CharaManager from "./Systems/CharaManager";
import { Unit } from "../../Models/Unit";
import { GameEvents } from "../../constants/events";

export type WaveOutcome = "player_won" | "player_lost";

async function setupWave(scene: BattlegroundScene) {

  // Initial setup for units (charge, refresh, bar visibility)
  scene.state.battleData.units.forEach(u => {
    u.charge = 0;
    u.refresh = 0;
    // Make bars visible for all units starting combat
    const chara = CharaManager.getChara(u.id);
    if (chara) {
      chara.setBarsVisibility(true);
    }
  });

  // Animate CPU units appearing (if this was the intent of the removed tween block)
  // This part can be kept if it's purely visual and doesn't interact with trait logic directly.
  // For example, UnitManager.animateCPUUnitEntry(scene);

  // Emit event for Trait System to handle onBattleStart for units and relics
  scene.events.emit(GameEvents.TRAIT_EVAL_GLOBAL_BATTLE_START, {});

  scene.events.emit(GameEvents.BATTLE_START_SETUP_COMPLETE);

}

const runCombatIO = (
  scene: BattlegroundScene,
) => new Promise<WaveOutcome>(async resolve => {
  const { state } = scene;

  await setupWave(scene);

  console.log("[runWaveIO]");

  const updateHandler = async (_time: number, delta: number) => {

    const units = chargeUnits(state, delta);

    for (const unit of units) {
      // Emit turn start event
      scene.events.emit(GameEvents.TRAIT_EVAL_TURN_START, { unit });
      // Process unit action
      scene.events.emit(GameEvents.TRAIT_EVAL_UNIT_ACTION, { unit });

      // Emit turn end event
      scene.events.emit(GameEvents.TRAIT_EVAL_TURN_END, { unit });

    }

    const activeUnits = scene.state.battleData.units.filter(u => u.hp > 0)
    const playerUnits = activeUnits.filter(u => u.force === FORCE_ID_PLAYER);
    const cpuUnits = activeUnits.filter(u => u.force === FORCE_ID_CPU);

    if (playerUnits.length === 0 || cpuUnits.length === 0) {
      scene.events.off('update', updateHandler);

      scene.events.emit(GameEvents.TRAIT_EVAL_BATTLE_END, {});

      if (playerUnits.length === 0) {
        resolve("player_lost");
      } else {
        resolve("player_won");
      }
    }

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

    CharaManager.getChara(unit.id).updateChargeBar();

  }

  return performUnits;

}

export default runCombatIO;