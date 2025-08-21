import { scene } from "./BattlegroundScene";
import { getState } from "../../Models/State";
import { MIN_COOLDOWN } from "../../constants/constants";
import * as CharaManager from "./Systems/CharaManager";
import { Unit } from "../../Models/Entities/Unit";
import {
  initializeTimeoutDamageSystem,
  updateTimeoutDamageSystem,
  onTimeoutDamageCombatEnd,
} from "./Systems/TimeoutDamageSystem";
import * as CombatStatsTracker from "./Systems/CombatStatsTracker";
import { processEffectsIO } from "../../TriggerSystem/TriggerSystem";
import { cpuForce, playerForce } from "../../Models/Entities/Force";
import * as PoisonDamageSystem from "./Systems/PoisonDamageSystem";
import * as RegenSystem from "./Systems/RegenSystem";

export type WaveOutcome = "player_won" | "player_lost";

export class RunCombatSystem {
  private active: boolean = false;

  reducePoison(forceId: string, healAmount: number): void {
    PoisonDamageSystem.reducePoison(forceId, healAmount);
  }

  runCombatIO = () => {
    if (this.active) {
      throw new Error("Combat is already active");
    }
    initializeTimeoutDamageSystem();
    PoisonDamageSystem.initialize();
    RegenSystem.initialize();
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

    updateTimeoutDamageSystem(playerForce, cpuForce, scaledDelta);
    PoisonDamageSystem.update(playerForce, cpuForce, scaledDelta);
    RegenSystem.update(playerForce, cpuForce, scaledDelta);
    CombatStatsTracker.updateTimeAlive(scaledDelta);

    const playerMoraleZero = playerForce.morale <= 0;
    const cpuMoraleZero = cpuForce.morale <= 0;

    let outcome: WaveOutcome | null = null;
    if (playerMoraleZero) outcome = "player_lost"; else if (cpuMoraleZero) outcome = "player_won";

    if (outcome) {
      this.finishCombat(outcome);
    }
  }

  private finishCombat(outcome: WaveOutcome) {
    if (!this.active) return;
    this.active = false;
    onTimeoutDamageCombatEnd();
    CombatStatsTracker.stop();
    console.log("[RunCombatSystem] Combat ended. Outcome:", outcome);
    scene.battleProgressionSystem.handleCombatEnded(outcome);
  }

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