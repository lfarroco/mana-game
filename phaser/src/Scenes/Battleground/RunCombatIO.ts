import { BattlegroundScene } from "./BattlegroundScene";
import { getActiveUnits, State } from "../../Models/State";
import { MIN_COOLDOWN } from "../../constants/constants";
import * as CharaManager from "./Systems/CharaManager";
import { Unit } from "../../Models/Entities/Unit";
import { GameEvents } from "../../constants/events";
import { delay } from "../../Utils/animation";
import { TimeoutDamageSystem } from "./Systems/TimeoutDamageSystem";

/**
 * Represents the possible outcomes of a combat wave.
 * @typedef {('player_won' | 'player_lost')} WaveOutcome
 */
export type WaveOutcome = "player_won" | "player_lost";

/**
 * Sets up the wave by initializing unit charge, refresh, and bar visibility.
 * Emits events for trait and battle start setup.
 * @param {BattlegroundScene} scene - The current battleground scene.
 * @returns {Promise<void>} Resolves when setup is complete.
 */
async function setupWave(scene: BattlegroundScene) {

  CharaManager
    .getAllCharas()
    .forEach(chara => {
      scene.events.emit(GameEvents.CHARA_BARS_VISIBILITY_SET, { unitId: chara.id, visible: true });
    });

  await delay(scene, 2000); // wait until everyone is summoned

  scene.events.emit(GameEvents.TRAIT_EVAL_GLOBAL_BATTLE_START, {});

  scene.events.emit(GameEvents.BATTLE_START_SETUP_COMPLETE);

}

/**
 * System to run the combat input/output loop for a battleground scene.
 */
export class RunCombatSystem {
  scene: BattlegroundScene;
  updateHandler: ((time: number, delta: number) => Promise<void>) | null = null;

  // Timeout damage system
  private timeoutDamageSystem: TimeoutDamageSystem;

  constructor(scene: BattlegroundScene) {
    this.scene = scene;
    this.timeoutDamageSystem = new TimeoutDamageSystem(scene);
  }

  /**
   * Starts the combat IO loop and resolves with the wave outcome when combat ends.
   * @returns {Promise<WaveOutcome>} Resolves with the outcome of the wave.
   */
  runCombatIO = (): Promise<WaveOutcome> => new Promise(async resolve => {
    const { state, events } = this.scene;

    await setupWave(this.scene);
    console.log("[RunCombatSystem] Wave setup complete, starting combat loop.");

    // Initialize timeout damage system
    this.timeoutDamageSystem.initialize();

    const playerForce = state.battleData.forces.find(force => force.id === state.gameData.player.id)!;
    const cpuForce = state.battleData.forces.find(force => force.id !== state.gameData.player.id)!;

    this.updateHandler = async (_time: number, delta: number) => {
      const unitsReadyToAct = chargeUnits(state, delta * this.scene.time.timeScale);

      for (const unit of unitsReadyToAct) {
        // Units no longer have HP, so no need to check if alive

        events.emit(GameEvents.TRAIT_EVAL_TURN_START, { unit });
        // Assuming unit actions are triggered by TRAIT_EVAL_UNIT_ACTION
        // and these actions are handled by listeners (e.g., AI system, skill execution system)
        events.emit(GameEvents.TRAIT_EVAL_UNIT_ACTION, { unit });
        events.emit(GameEvents.TRAIT_EVAL_TURN_END, { unit });
      }

      // Check for timeout damage (after 10 seconds of combat)
      this.timeoutDamageSystem.update(playerForce, cpuForce, delta * this.scene.time.timeScale);

      const playerMoraleZero = playerForce.morale <= 0;
      const cpuMoraleZero = cpuForce.morale <= 0;

      let combatEnded = false;
      let outcome: WaveOutcome | null = null;

      if (playerMoraleZero) {
        combatEnded = true;
        outcome = "player_lost";
      } else if (cpuMoraleZero) {
        combatEnded = true;
        outcome = "player_won";
      }

      if (combatEnded) {
        if (this.updateHandler) {
          events.off('update', this.updateHandler);
          this.updateHandler = null; // Clear the handler
        }

        events.emit(GameEvents.TRAIT_EVAL_BATTLE_END, {});
        console.log("[RunCombatSystem] Combat ended. Outcome:", outcome);
        resolve(outcome!);
      }
    };

    events.on('update', this.updateHandler);
  });
}

/**
 * Charges units based on delta time, speed modifiers, and cooldowns.
 * Returns units that are ready to act this frame.
 * @param {State} state - The current game state.
 * @param {number} delta - The time delta since last update.
 * @returns {Unit[]} Array of units ready to perform an action.
 */
function chargeUnits(state: State, delta: number): Unit[] {
  const activeUnits = getActiveUnits(state);
  let performingUnits: Unit[] = []; // units that are ready to perform an action

  for (const unit of activeUnits) {
    // Units no longer have HP, so no need to check if alive


    // Calculate cooldown modifier from status effects
    const cooldownMultiplier = unit.hasted > 0 ? 0.5 : unit.slowed > 0 ? 2 : 1;
    const chargeRate = cooldownMultiplier === Number.MAX_SAFE_INTEGER ? 0 : 1 / cooldownMultiplier;

    unit.charge += delta * chargeRate;

    if (unit.hasted > 0) {
      unit.hasted = Math.max(0, unit.hasted - delta);
    }
    if (unit.slowed > 0) {
      unit.slowed = Math.max(0, unit.slowed - delta);
    }

    unit.refresh = Math.max(0, unit.refresh - delta);

    if (unit.charge >= unit.cooldown && unit.refresh === 0) {
      unit.charge = unit.charge - unit.cooldown;
      unit.refresh = MIN_COOLDOWN; // minimum space between actions 
      performingUnits.push(unit);
    }
    CharaManager.getChara(unit.id)?.updateChargeBar();
  }
  return performingUnits;
}

export default RunCombatSystem;