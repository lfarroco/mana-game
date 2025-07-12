import { BattlegroundScene } from "./BattlegroundScene";
import { getActiveUnits, State } from "../../Models/State";
import { MIN_COOLDOWN } from "../../constants/constants";
import * as CharaManager from "./Systems/CharaManager";
import { Unit } from "../../Models/Entities/Unit";
import { GameEvents } from "../../constants/events";
import { delay } from "../../Utils/animation";
import { processStatusEffects, getCooldownMultiplier } from "../../Systems/StatusEffects/StatusEffectManager";
import { applyDamageToForce, Force } from "../../Models/Entities/Force";

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

  // Timeout damage system properties
  private timeoutDamageStartTime: number = 10000; // 10 seconds in milliseconds
  private timeoutDamageInterval: number = 1000; // 1 second between damage ticks
  private lastTimeoutDamageTick: number = 0;
  private combatStartTime: number = 0;

  constructor(scene: BattlegroundScene) {
    this.scene = scene;
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
    this.combatStartTime = this.scene.time.now;
    this.lastTimeoutDamageTick = 0;

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
      this.checkTimeoutDamage(playerForce, cpuForce);

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

  /**
   * Checks if timeout damage should be applied and applies escalating damage to both forces.
   * @param playerForce The player's force
   * @param cpuForce The CPU's force
   */
  private checkTimeoutDamage(playerForce: Force, cpuForce: Force): void {
    const currentTime = this.scene.time.now;
    const combatElapsed = currentTime - this.combatStartTime;

    // Check if we've passed the 10-second mark
    if (combatElapsed >= this.timeoutDamageStartTime) {
      const timeSinceTimeoutStarted = combatElapsed - this.timeoutDamageStartTime;
      const timeSinceLastTick = currentTime - this.lastTimeoutDamageTick;

      // Apply damage every second
      if (timeSinceLastTick >= this.timeoutDamageInterval) {
        // Calculate current damage amount (starts at 1, increases each tick)
        const tickCount = Math.floor(timeSinceTimeoutStarted / this.timeoutDamageInterval) + 1;
        const currentDamage = tickCount;

        // Apply damage to both forces (shields absorb damage first)
        console.log(`[RunCombatSystem] Timeout damage tick ${tickCount}: ${currentDamage} damage to both forces`);

        applyDamageToForce(playerForce, currentDamage, this.scene);
        applyDamageToForce(cpuForce, currentDamage, this.scene);

        this.lastTimeoutDamageTick = currentTime;
      }
    }
  }
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

    // Process status effects using the new unified system
    processStatusEffects(unit, delta);

    // Calculate cooldown modifier from status effects
    const cooldownMultiplier = getCooldownMultiplier(unit);
    const chargeRate = cooldownMultiplier === Number.MAX_SAFE_INTEGER ? 0 : 1 / cooldownMultiplier;

    unit.charge += delta * chargeRate;

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