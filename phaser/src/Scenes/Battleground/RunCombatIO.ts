import { scene } from "./BattlegroundScene";
import { getState } from "@Models/State";
import { MIN_COOLDOWN } from "@Constants/constants";
import { Unit } from "@Models/Entities/Unit";
import { processEffectsIO } from "../../TriggerSystem/TriggerSystem";
import { cpuForce, playerForce } from "@Models/Entities/Force";
import * as Systems from "./Systems";
import * as Animations from "@Systems/Chara/Animations";
import * as ChargeBarDisplay from "@Systems/Chara/ChargeBarDisplay";

export type WaveOutcome = "player_won" | "player_lost";

export class RunCombatSystem {
  private active: boolean = false;

  reducePoison(forceId: string, healAmount: number): void {
    Systems.Poison.reducePoison(forceId, healAmount);
  }

  runCombatIO = () => {
    if (this.active) {
      throw new Error("Combat is already active");
    }
    Systems.Timeout.initializeTimeoutDamageSystem();
    Systems.Poison.initialize();
    Systems.Regen.initialize();
    Systems.CombatStatsTracker.initialize();

    this.active = true;
    Systems.CountdownTimer.start();
  };

  updateFrame(_time: number, delta: number): void {
    if (!this.active) return;

    const scaledDelta = delta * scene.time.timeScale;

    const unitsReadyToAct = chargeUnits(scaledDelta);

    for (const unit of unitsReadyToAct) {

      Animations.pop(unit.id);

      Systems.CombatStatsTracker.handleUnitAction({ unit });
      processEffectsIO(unit, unit.effects);
    }

    Systems.Timeout.updateTimeoutDamageSystem(playerForce, cpuForce, scaledDelta);
    Systems.Poison.update(playerForce, cpuForce, scaledDelta);
    Systems.Regen.update(playerForce, cpuForce, scaledDelta);
    Systems.CombatStatsTracker.updateTimeAlive(scaledDelta);

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
    Systems.Timeout.onTimeoutDamageCombatEnd();
    Systems.CombatStatsTracker.stop();
    console.log("[RunCombatSystem] Combat ended. Outcome:", outcome);
    Systems.ResultsPhase.handleCombatEnded(outcome);
    Systems.CountdownTimer.stop();
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
    ChargeBarDisplay.updateChargeBar(unit.id)
  }
  return performingUnits;
}

export default RunCombatSystem;