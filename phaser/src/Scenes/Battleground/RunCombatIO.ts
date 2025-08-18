import { BattlegroundScene } from "./BattlegroundScene";
import { getState } from "../../Models/State";
import { MIN_COOLDOWN } from "../../constants/constants";
import * as CharaManager from "./Systems/CharaManager";
import { Unit } from "../../Models/Entities/Unit";
import { delay } from "../../Utils/animation";
import { TimeoutDamageSystem } from "./Systems/TimeoutDamageSystem";
import { PoisonDamageSystem } from "./Systems/PoisonDamageSystem";
import { RegenSystem } from "./Systems/RegenSystem";
import * as CombatStatsTracker from "./Systems/CombatStatsTracker";
import { processEffectsIO } from "../../TriggerSystem/TriggerSystem";
import { cpuForce, playerForce } from "../../Models/Entities/Force";

export type WaveOutcome = "player_won" | "player_lost";

async function setupWave() {

  CharaManager
    .getAllCharas()
    .forEach(chara => {
      CharaManager.handleCharaBarsVisibilitySetEvent({ unitId: chara.id, visible: true });
    });

  await delay(1000);
}

export class RunCombatSystem {
  scene: BattlegroundScene;
  updateHandler: ((time: number, delta: number) => Promise<void>) | null = null;

  private timeoutDamageSystem: TimeoutDamageSystem;
  private poisonDamageSystem: PoisonDamageSystem;
  private regenSystem: RegenSystem;

  constructor(scene: BattlegroundScene) {
    this.scene = scene;
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

  runCombatIO = (): Promise<WaveOutcome> => new Promise(async resolve => {
    const { events } = this.scene;

    await setupWave();
    console.log("[RunCombatSystem] Wave setup complete, starting combat loop.");

    this.timeoutDamageSystem.initialize();
    this.poisonDamageSystem.initialize();
    this.regenSystem.initialize();
    CombatStatsTracker.initialize(this.scene);

    this.updateHandler = async (_time: number, delta: number) => {
      const unitsReadyToAct = chargeUnits(delta * this.scene.time.timeScale);

      for (const unit of unitsReadyToAct) {

        CharaManager.getChara(unit.id)?.pop()

        CombatStatsTracker.handleUnitAction({ unit });

        processEffectsIO(unit, unit.effects)

      }

      // Check for timeout damage (after 10 seconds of combat)
      this.timeoutDamageSystem.update(playerForce, cpuForce, delta * this.scene.time.timeScale);

      // Update poison damage system (processes all poison stacks)
      this.poisonDamageSystem.update(playerForce, cpuForce, delta * this.scene.time.timeScale);

      // Update regen system (processes all regen stacks)
      this.regenSystem.update(playerForce, cpuForce, delta * this.scene.time.timeScale);

      // Update combat stats tracker (time alive tracking)
      CombatStatsTracker.updateTimeAlive(delta * this.scene.time.timeScale);

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
        this.timeoutDamageSystem.onCombatEnd();

        CombatStatsTracker.stop();

        if (this.updateHandler) {
          events.off('update', this.updateHandler);
          this.updateHandler = null;
        }

        console.log("[RunCombatSystem] Combat ended. Outcome:", outcome);
        resolve(outcome!);
      }
    };

    getState().battleData.units.forEach(u => {
      const startReactions = u.reactions.filter(r => r.effectId === "battle_start");
      startReactions.forEach(r => processEffectsIO(u, r.effects));
    });


    events.on('update', this.updateHandler);
  });

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
    CharaManager.getChara(unit.id)?.updateChargeBar();
  }
  return performingUnits;
}

export default RunCombatSystem;