import { BattlegroundScene } from "./BattlegroundScene";
import { getActiveUnits, State } from "../../Models/State";
import { FORCE_ID_CPU, FORCE_ID_PLAYER, MIN_COOLDOWN } from "../../constants/constants";
import * as CharaManager from "./Systems/CharaManager";
import { Unit } from "../../Models/Entities/Unit";
import { GameEvents } from "../../constants/events";
import { getOption } from "../../Models/OptionsStore";

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


  // Emit event for Trait System to handle onBattleStart for units and relics
  scene.events.emit(GameEvents.TRAIT_EVAL_GLOBAL_BATTLE_START, {});

  scene.events.emit(GameEvents.BATTLE_START_SETUP_COMPLETE);

}

export class RunCombatSystem {
  private scene: BattlegroundScene;
  private updateHandler: ((time: number, delta: number) => Promise<void>) | null = null;

  constructor(scene: BattlegroundScene) {
    this.scene = scene;
  }

  public runCombatIO = () => new Promise<WaveOutcome>(async resolve => {
    const { state, events } = this.scene;

    await setupWave(this.scene);
    console.log("[RunCombatSystem] Wave setup complete, starting combat loop.");

    this.updateHandler = async (_time: number, delta: number) => {
      const unitsReadyToAct = chargeUnits(state, delta);

      for (const unit of unitsReadyToAct) {
        if (unit.hp <= 0) continue; // Skip dead units that might have been charged

        events.emit(GameEvents.TRAIT_EVAL_TURN_START, { unit });
        // Assuming unit actions are triggered by TRAIT_EVAL_UNIT_ACTION
        // and these actions are handled by listeners (e.g., AI system, skill execution system)
        events.emit(GameEvents.TRAIT_EVAL_UNIT_ACTION, { unit });
        events.emit(GameEvents.TRAIT_EVAL_TURN_END, { unit });
      }

      const activeBattleUnits = getActiveUnits(state); // Use getActiveUnits
      const playerUnits = activeBattleUnits.filter(u => u.force === FORCE_ID_PLAYER);
      const cpuUnits = activeBattleUnits.filter(u => u.force === FORCE_ID_CPU);

      if (playerUnits.length === 0 || cpuUnits.length === 0) {
        if (this.updateHandler) {
          events.off('update', this.updateHandler);
          this.updateHandler = null; // Clear the handler
        }

        events.emit(GameEvents.TRAIT_EVAL_BATTLE_END, {});
        console.log("[RunCombatSystem] Combat ended.");

        if (playerUnits.length === 0) {
          resolve("player_lost");
        } else {
          resolve("player_won");
        }
      }
    };

    events.on('update', this.updateHandler);
  });
}

function chargeUnits(state: State, delta: number): Unit[] {
  const activeUnits = getActiveUnits(state);
  let performUnits: Unit[] = []; // units that are ready to perform an action

  for (const unit of activeUnits) {
    if (unit.hp <= 0) continue; // Should be redundant if getActiveUnits is used, but good for safety

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
    unit.charge += delta * getOption('speed') * modifier;

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

export default RunCombatSystem; // Export the class