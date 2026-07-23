/**
 * Integration tests for each effect type in the combat simulation.
 * Validates that each effect produces correct combat logs.
 */
/// <reference types="jest" />

import * as Models from "../Models";
import * as Card from "../Entities/Card";
import * as Constants from "../Constants";
import * as CombatSimulation from "./CombatSimulation";
import * as RunCombatCore from "./CombatRunner";
import * as BoardLogic from "../BoardLogic";
import * as F from "../Functional";
import { BASE_COLLECTION_DATA } from "../BaseCollection";

beforeAll(() => { Card.registerCollection(BASE_COLLECTION_DATA); });
afterAll(() => { Card.resetRegistry(); });

function makeTestUnit(overrides: {
  effects: Models.Effect[];
  reactions?: Models.EffectReaction[];
  power?: number;
  cooldown?: number;
  position?: [number, number];
  isCore?: boolean;
  life?: number;
  critical?: number;
}): Models.Unit {
  return {
    id: "", cardId: "test-custom-unit", pic: "test",
    force: Constants.FORCE_ID_PLAYER,
    position: overrides.position ?? [0, 0],
    rank: 1, power: overrides.power ?? 10, bonusPower: 0,
    critical: overrides.critical ?? 0,
    life: overrides.life ?? 100, maxLife: overrides.life ?? 100,
    shield: 0, cooldown: overrides.cooldown ?? 1000, evade: 0,
    effects: overrides.effects, reactions: overrides.reactions ?? [],
    charge: 0, refresh: 0, hasted: 0, slowed: 0,
    isCore: overrides.isCore ?? false,
  };
}

function setupCombat(
  playerUnits: Models.Unit[],
  cpuCoreLife: number = 5000,
  seed: string = "effect-test-seed",
) {
  playerUnits.forEach((u) => { u.force = Constants.FORCE_ID_PLAYER; u.charge = 0; u.refresh = 0; });
  const hasPlayerCore = playerUnits.some((u) => u.isCore);
  if (!hasPlayerCore) {
    const freeSlot = BoardLogic.findFreeSlot(playerUnits, Constants.FORCE_ID_PLAYER, [1, 1]);
    const core = Card.makeUnit(Constants.FORCE_ID_PLAYER, "critical_crystal", F.getOrElse(freeSlot, [1, 1]));
    core.power = 1; core.cooldown = 99999;
    playerUnits.push(core);
  } else {
    const pc = playerUnits.find((u) => u.isCore)!;
    pc.cooldown = 99999; pc.charge = 0;
  }
  const cpuCore = Card.makeUnit(Constants.FORCE_ID_CPU, "critical_crystal", [0, 2]);
  cpuCore.life = cpuCoreLife; cpuCore.maxLife = cpuCoreLife;
  cpuCore.power = 1; cpuCore.cooldown = 99999;
  cpuCore.charge = 0; cpuCore.refresh = 0;
  const session: Models.SessionData = {
    id: "test-effect-session", player_id: "test-player", phase: "combat",
    session_type: { type: "singleplayer" }, round: 1, step: 0,
    seed, initial_seed: seed, options: [], team: { units: playerUnits },
    wins: 0, losses: 0, action_log: [], encounter_history: [],
  };
  const combatState = CombatSimulation.createCombatState(session, [cpuCore]);
  const combatRunner = RunCombatCore.runCombat(session, combatState);
  return { session, combatState, combatRunner, env: combatRunner.getEnv() };
}

function runFrames(
  combatRunner: ReturnType<typeof RunCombatCore.runCombat>,
  combatState: Models.CombatState,
  maxFrames: number,
): Models.CombatLogEntry[] {
  const SIM_DELTA = 16.67;
  let frame = 0;
  while (combatRunner.isActive() && frame < maxFrames) {
    combatRunner.updateFrame(combatState, frame * SIM_DELTA, SIM_DELTA);
    frame++;
  }
  return combatRunner.getEnv().logger.getLogs();
}

describe("Effect integration — damage", () => {
  it("produces damage_cast and damage_hit logs with correct amounts", () => {
    const unit = makeTestUnit({
      effects: [{ id: "damage" }],
      power: 25,
      cooldown: 500,
    });
    unit.id = "damage-unit";
    const { combatState, combatRunner } = setupCombat([unit]);

    const logs = runFrames(combatRunner, combatState, 200);

    const castLogs = logs.filter((l) => l.type === "damage_cast");
    const hitLogs = logs.filter((l) => l.type === "damage_hit");
    expect(castLogs.length).toBeGreaterThanOrEqual(1);
    for (const cast of castLogs) {
      expect(cast.amount).toBe(25);
    }
    for (const hit of hitLogs) {
      expect(hit.amount).toBe(25);
    }
  });

  it("kills the enemy core with enough damage and logs player_won", () => {
    const unit = makeTestUnit({
      effects: [{ id: "damage" }],
      power: 40,
      cooldown: 300,
    });
    unit.id = "damage-killer";
    const { combatState, combatRunner } = setupCombat([unit], 200);

    const logs = runFrames(combatRunner, combatState, 1000);

    const outcomeLogs = logs.filter((l) => l.type === "outcome");
    expect(outcomeLogs.length).toBe(1);
    expect(outcomeLogs[0].result).toBe("player_won");

    const hitLogs = logs.filter((l) => l.type === "damage_hit");
    const totalDamage = hitLogs.reduce((sum, h) => sum + h.amount, 0);
    expect(totalDamage).toBeGreaterThanOrEqual(200);
  });
});

describe("Effect integration — heal", () => {
  it("produces heal_cast and heal_hit logs with lifeDelta > 0", () => {
    const unit = makeTestUnit({
      effects: [{ id: "heal" }],
      power: 20,
      cooldown: 500,
    });
    unit.id = "heal-unit";
    const { combatState, combatRunner } = setupCombat([unit]);

    // Damage the player core so there is life to restore
    const playerCore = combatState.playerCore;
    playerCore.life = Math.floor(playerCore.maxLife / 2);

    const logs = runFrames(combatRunner, combatState, 200);

    const castLogs = logs.filter((l) => l.type === "heal_cast");
    const hitLogs = logs.filter((l) => l.type === "heal_hit");
    expect(castLogs.length).toBeGreaterThanOrEqual(1);
    expect(castLogs[0].amount).toBe(20);
    expect(hitLogs.length).toBeGreaterThanOrEqual(1);
    expect(hitLogs[0].lifeDelta).toBeGreaterThan(0);
  });
});

describe("Effect integration — shield", () => {
  it("produces shield_cast and shield_hit logs with shieldDelta > 0", () => {
    const unit = makeTestUnit({
      effects: [{ id: "shield" }],
      power: 15,
      cooldown: 500,
    });
    unit.id = "shield-unit";
    const { combatState, combatRunner } = setupCombat([unit]);

    const logs = runFrames(combatRunner, combatState, 200);

    const castLogs = logs.filter((l) => l.type === "shield_cast");
    const hitLogs = logs.filter((l) => l.type === "shield_hit");
    expect(castLogs.length).toBeGreaterThanOrEqual(1);
    expect(castLogs[0].amount).toBe(15);
    expect(hitLogs.length).toBeGreaterThanOrEqual(1);
    expect(hitLogs[0].shieldDelta).toBeGreaterThan(0);
  });
});

describe("Effect integration — poison", () => {
  it("produces poison_cast with amount = power * 0.1 and poison_tick on CPU", () => {
    const unit = makeTestUnit({
      effects: [{ id: "poison" }],
      power: 40,
      cooldown: 500,
    });
    unit.id = "poison-unit";
    const { combatState, combatRunner } = setupCombat([unit]);

    const logs = runFrames(combatRunner, combatState, 300);

    const castLogs = logs.filter((l) => l.type === "poison_cast");
    expect(castLogs.length).toBeGreaterThanOrEqual(1);
    expect(castLogs[0].amount).toBe(4);

    const tickLogs = logs.filter((l) => l.type === "poison_tick");
    expect(tickLogs.length).toBeGreaterThanOrEqual(1);
    for (const tick of tickLogs) {
      expect(tick.force).toBe(Constants.FORCE_ID_CPU);
    }
  });
});

describe("Effect integration — regen", () => {
  it("produces regen_cast with amount = power * 0.1 and regen_tick on PLAYER", () => {
    const unit = makeTestUnit({
      effects: [{ id: "regen" }],
      power: 40,
      cooldown: 500,
    });
    unit.id = "regen-unit";
    const { combatState, combatRunner } = setupCombat([unit]);

    // Damage the player core so regen has something to heal
    const playerCore = combatState.playerCore;
    playerCore.life = Math.floor(playerCore.maxLife / 2);

    const logs = runFrames(combatRunner, combatState, 300);

    const castLogs = logs.filter((l) => l.type === "regen_cast");
    expect(castLogs.length).toBeGreaterThanOrEqual(1);
    expect(castLogs[0].amount).toBe(4);

    const tickLogs = logs.filter((l) => l.type === "regen_tick");
    expect(tickLogs.length).toBeGreaterThanOrEqual(1);
    for (const tick of tickLogs) {
      expect(tick.force).toBe(Constants.FORCE_ID_PLAYER);
    }
  });
});

describe("Effect integration — haste", () => {
  it("produces haste_cast and haste_hit logs with duration 2000", () => {
    const unit = makeTestUnit({
      effects: [{ id: "haste", duration: 2000, targets: { id: "self" } }],
      cooldown: 500,
    });
    unit.id = "haste-unit";
    const { combatState, combatRunner } = setupCombat([unit]);

    const logs = runFrames(combatRunner, combatState, 200);

    const castLogs = logs.filter((l) => l.type === "haste_cast");
    const hitLogs = logs.filter((l) => l.type === "haste_hit");
    expect(castLogs.length).toBeGreaterThanOrEqual(1);
    expect(castLogs[0].effectDuration).toBe(2000);
    expect(hitLogs.length).toBeGreaterThanOrEqual(1);
    expect(hitLogs[0].effectDuration).toBe(2000);
  });

  it("doubles charge rate while hasted", () => {
    const unit = makeTestUnit({
      effects: [{ id: "haste", duration: 2000, targets: { id: "self" } }],
      cooldown: 500,
    });
    unit.id = "haste-charge-unit";
    const { combatState, combatRunner } = setupCombat([unit]);

    // Find the cloned unit in combat state and apply haste
    const simDelta = 16.67;
    const csUnit = combatState.unitById.get("haste-charge-unit")!;
    csUnit.hasted = 2000;
    csUnit.charge = 0;
    csUnit.refresh = 0;

    combatRunner.updateFrame(combatState, 0, simDelta);

    expect(csUnit.charge).toBeCloseTo(simDelta * 2, 0);
  });
});

describe("Effect integration — slow", () => {
  it("produces slow_cast log with duration 2000", () => {
    const unit = makeTestUnit({
      effects: [{ id: "slow", duration: 2000, targets: { id: "random_enemy", count: 1 } }],
      cooldown: 500,
    });
    unit.id = "slow-unit";
    const { combatState, combatRunner } = setupCombat([unit]);

    const logs = runFrames(combatRunner, combatState, 200);

    const castLogs = logs.filter((l) => l.type === "slow_cast");
    expect(castLogs.length).toBeGreaterThanOrEqual(1);
    expect(castLogs[0].effectDuration).toBe(2000);
  });

  it("halves charge rate while slowed", () => {
    const unit = makeTestUnit({
      effects: [{ id: "slow", duration: 2000, targets: { id: "random_enemy", count: 1 } }],
      cooldown: 500,
    });
    unit.id = "slow-charge-unit";
    const { combatState, combatRunner } = setupCombat([unit]);

    const simDelta = 16.67;
    const csCpuCore = combatState.cpuCore;
    csCpuCore.slowed = 2000;
    csCpuCore.charge = 0;
    csCpuCore.refresh = 0;

    combatRunner.updateFrame(combatState, 0, simDelta);

    expect(csCpuCore.charge).toBeCloseTo(simDelta * 0.5, 0);
  });
});

describe("Effect integration — charge", () => {
  it("produces charge_cast and charge_hit logs with amount 300", () => {
    const unit = makeTestUnit({
      effects: [{ id: "charge", duration: 300, targets: { id: "random_ally", count: 1 } }],
      cooldown: 500,
    });
    unit.id = "charge-unit";
    const { combatState, combatRunner } = setupCombat([unit]);

    const logs = runFrames(combatRunner, combatState, 200);

    const castLogs = logs.filter((l) => l.type === "charge_cast");
    const hitLogs = logs.filter((l) => l.type === "charge_hit");
    expect(castLogs.length).toBeGreaterThanOrEqual(1);
    expect(castLogs[0].amount).toBe(300);
    expect(hitLogs.length).toBeGreaterThanOrEqual(1);
    expect(hitLogs[0].amount).toBe(300);
  });
});

describe("Effect integration — increase_power", () => {
  it("logs increase_power and raises the unit's power", () => {
    const initialPower = 20;
    const unit = makeTestUnit({
      effects: [{ id: "increase_power", amount: 10, permanent: false, targets: { id: "self" } }],
      power: initialPower,
      cooldown: 500,
    });
    unit.id = "inc-power-unit";
    const { combatState, combatRunner } = setupCombat([unit]);

    const logs = runFrames(combatRunner, combatState, 200);

    const incLogs = logs.filter((l) => l.type === "increase_power");
    expect(incLogs.length).toBeGreaterThanOrEqual(1);
    expect(incLogs[0].amount).toBe(10);
    const csUnit = combatState.unitById.get("inc-power-unit")!;
    expect(csUnit.power).toBeGreaterThan(initialPower);
  });
});

describe("Effect integration — decrease_power", () => {
  it("logs decrease_power and lowers the target's power", () => {
    const unit = makeTestUnit({
      effects: [{ id: "decrease_power", amount: 8, permanent: false, targets: { id: "random_enemy", count: 1 } }],
      cooldown: 500,
    });
    unit.id = "dec-power-unit";
    const { combatState, combatRunner } = setupCombat([unit]);

    const cpuCore = combatState.cpuCore;
    const initialCpuPower = cpuCore.power;

    const logs = runFrames(combatRunner, combatState, 200);

    const decLogs = logs.filter((l) => l.type === "decrease_power");
    expect(decLogs.length).toBeGreaterThanOrEqual(1);
    expect(decLogs[0].amount).toBe(8);
    const csCpuCore = combatState.cpuCore;
    expect(csCpuCore.power).toBeLessThan(initialCpuPower);
  });
});

describe("Effect integration — increase_critical", () => {
  it("logs increase_critical multiple times and raises unit critical", () => {
    const unit = makeTestUnit({
      effects: [{ id: "increase_critical", amount: 10, permanent: false, targets: { id: "self" } }],
      cooldown: 500,
    });
    unit.id = "inc-crit-unit";
    const { combatState, combatRunner } = setupCombat([unit]);

    const logs = runFrames(combatRunner, combatState, 200);

    const critLogs = logs.filter((l) => l.type === "increase_critical");
    expect(critLogs.length).toBeGreaterThanOrEqual(2);
    const csUnit = combatState.unitById.get("inc-crit-unit")!;
    expect(csUnit.critical).toBeGreaterThanOrEqual(20);
  });
});

describe("Effect integration — multiply_power", () => {
  it("logs increase_power multiple times and raises unit power", () => {
    const initialPower = 20;
    const unit = makeTestUnit({
      effects: [{ id: "multiply_power", multiplier: 2, baseMultiplier: 2, targets: { id: "self" } }],
      power: initialPower,
      cooldown: 500,
    });
    unit.id = "mult-power-unit";
    const { combatState, combatRunner } = setupCombat([unit]);

    const logs = runFrames(combatRunner, combatState, 200);

    const incLogs = logs.filter((l) => l.type === "increase_power");
    expect(incLogs.length).toBeGreaterThanOrEqual(2);
    const csUnit = combatState.unitById.get("mult-power-unit")!;
    expect(csUnit.power).toBeGreaterThan(initialPower);
  });
});

describe("Effect integration — distribute_power", () => {
  it("distributes power from distributor to ally and logs accordingly", () => {
    const distributor = makeTestUnit({
      effects: [{ id: "distribute_power", permanent: false, targets: { id: "random_ally", count: 1 } }],
      power: 100,
      cooldown: 500,
      position: [0, 0],
    });
    distributor.id = "distributor";

    const receiver = makeTestUnit({
      effects: [{ id: "damage" }],
      cooldown: 99999,
      position: [1, 0],
    });
    receiver.id = "receiver";

    const { combatState, combatRunner } = setupCombat([distributor, receiver]);

    const initialDistPower = distributor.power;

    const logs = runFrames(combatRunner, combatState, 200);

    const csDistributor = combatState.unitById.get("distributor")!;
    expect(csDistributor.power).toBeLessThan(initialDistPower);

    const incLogs = logs.filter((l) => l.type === "increase_power" && l.targetId === receiver.id);
    // distributor gives 50% to ally, but random_ally may target core instead
    // In any case, distributor should have lost power
    expect(incLogs.length + logs.filter((l) => l.type === "increase_power" && l.targetId !== csDistributor.id && l.targetId !== receiver.id).length).toBeGreaterThanOrEqual(1);
  });
});

describe("Effect integration — absorb_power", () => {
  it("absorbs power from enemy and logs decrease_power + increase_power", () => {
    const absorber = makeTestUnit({
      effects: [{ id: "absorb_power", permanent: false, targets: { id: "random_enemy", count: 1 } }],
      cooldown: 500,
    });
    absorber.id = "absorber";
    const initialAbsorberPower = absorber.power;

    const { combatState, combatRunner } = setupCombat([absorber]);

    const cpuCore = combatState.cpuCore;
    cpuCore.power = 100;
    const initialCpuPower = cpuCore.power;

    const logs = runFrames(combatRunner, combatState, 200);

    const decLogs = logs.filter((l) => l.type === "decrease_power");
    expect(decLogs.length).toBeGreaterThanOrEqual(2);
    const csAbsorber = combatState.unitById.get("absorber")!;
    expect(csAbsorber.power).toBeGreaterThan(initialAbsorberPower);
    const csCpuCore = combatState.cpuCore;
    expect(csCpuCore.power).toBeLessThan(initialCpuPower);
  });
});

describe("Effect integration — sacrifice_effect", () => {
  it("removes an effect and increases own power", () => {
    const initialPower = 10;
    const unit = makeTestUnit({
      effects: [
        { id: "sacrifice_effect", targets: { id: "self" } },
        { id: "shield" },
      ],
      power: initialPower,
      cooldown: 500,
    });
    unit.id = "sacrifice-unit";
    const { combatState, combatRunner } = setupCombat([unit]);

    const logs = runFrames(combatRunner, combatState, 200);

    const incLogs = logs.filter((l) => l.type === "increase_power");
    expect(incLogs.length).toBeGreaterThanOrEqual(1);
    const csUnit = combatState.unitById.get("sacrifice-unit")!;
    expect(csUnit.power).toBeGreaterThan(initialPower);
  });
});
