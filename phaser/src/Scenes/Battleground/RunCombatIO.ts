import { BattlegroundScene, scene } from "./BattlegroundScene";
import { getState } from "../../Models/State";
import { MIN_COOLDOWN } from "../../constants/constants";
import * as CharaManager from "./Systems/CharaManager";
import { Unit } from "../../Models/Entities/Unit";
import { TimeoutDamageSystem } from "./Systems/TimeoutDamageSystem";
import { PoisonDamageSystem } from "./Systems/PoisonDamageSystem";
import { RegenSystem } from "./Systems/RegenSystem";
import * as CombatStatsTracker from "./Systems/CombatStatsTracker";
import { processEffectsIO } from "../../TriggerSystem/TriggerSystem";
import { cpuForce, playerForce } from "../../Models/Entities/Force";

export type WaveOutcome = "player_won" | "player_lost";

export class RunCombatSystem {
  private active: boolean = false;

  private timeoutDamageSystem: TimeoutDamageSystem;
  private poisonDamageSystem: PoisonDamageSystem;
  private regenSystem: RegenSystem;

  constructor(scene: BattlegroundScene) {
    this.timeoutDamageSystem = new TimeoutDamageSystem(scene);
    this.poisonDamageSystem = new PoisonDamageSystem();
    this.regenSystem = new RegenSystem(scene);
  }

  getPoisonDamageSystem(): PoisonDamageSystem {
    return this.poisonDamageSystem;
  }

  getRegenSystem(): RegenSystem {
    return this.regenSystem;
  }

  getTimeoutDamageSystem(): TimeoutDamageSystem {
    return this.timeoutDamageSystem;
  }

  reducePoison(forceId: string, healAmount: number): void {
    this.poisonDamageSystem.reducePoison(forceId, healAmount);
  }

  runCombatIO = () => {
    if (this.active) {
      throw new Error("Combat is already active");
    }
    this.timeoutDamageSystem.initialize();
    this.poisonDamageSystem.initialize();
    this.regenSystem.initialize();
    CombatStatsTracker.initialize();
    getState().battleData.units.forEach(u => {
      const startReactions = u.reactions.filter(r => r.effectId === "battle_start");
      startReactions.forEach(r => processEffectsIO(u, r.effects));
    });
    this.active = true;

  };

  updateFrame(_time: number, delta: number): void {
    if (!this.active) return;

    const scaledDelta = delta * scene.time.timeScale;

    const unitsReadyToAct = chargeUnits(scaledDelta);

    for (const unit of unitsReadyToAct) {
      CharaManager.getChara(unit.id)?.pop();
      CombatStatsTracker.handleUnitAction({ unit });
      processEffectsIO(unit, unit.effects);
    }

    // Periodic systems
    this.timeoutDamageSystem.update(playerForce, cpuForce, scaledDelta);
    this.poisonDamageSystem.update(playerForce, cpuForce, scaledDelta);
    this.regenSystem.update(playerForce, cpuForce, scaledDelta);
    CombatStatsTracker.updateTimeAlive(scaledDelta);

    // Victory / defeat check
    const playerMoraleZero = playerForce.morale <= 0;
    const cpuMoraleZero = cpuForce.morale <= 0;

    let outcome: WaveOutcome | null = null;
    if (playerMoraleZero) outcome = "player_lost"; else if (cpuMoraleZero) outcome = "player_won";

    if (outcome) {
      this.finishCombat(outcome);
    }
  }

  private finishCombat(outcome: WaveOutcome) {
    if (!this.active) return; // already finished
    this.active = false;
    this.timeoutDamageSystem.onCombatEnd();
    CombatStatsTracker.stop();
    console.log("[RunCombatSystem] Combat ended. Outcome:", outcome);
    scene.battleProgressionSystem.handleCombatEnded(outcome);
  }

  /** Whether a combat is currently running */
  isActive(): boolean { return this.active; }

}

function chargeUnits(delta: number): Unit[] {
  let performingUnits: Unit[] = [];

  for (const unit of getState().battleData.units) {
    const cooldownMultiplier = unit.hasted > 0 ? 0.5 : unit.slowed > 0 ? 2 : 1;
    const chargeRate = 1 / cooldownMultiplier;

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
      unit.refresh = MIN_COOLDOWN;
      performingUnits.push(unit);
    }
    const chara = CharaManager.getChara(unit.id);
    chara.updateChargeBar();
  }
  return performingUnits;
}

export default RunCombatSystem;