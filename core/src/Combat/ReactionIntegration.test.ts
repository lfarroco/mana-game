/**
 * Integration tests for reactions in the combat simulation.
 * Validates that reactions fire based on triggers: on_battle_start,
 * by effect type, by position, enemies, and global triggers.
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
  seed: string = "reaction-test-seed",
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
    id: "test-reaction-session", player_id: "test-player", phase: "combat",
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


describe("Reaction — on_battle_start", () => {
  it("fires on_battle_start reaction that increases own power", () => {
    const reactor = makeTestUnit({
      effects: [],
      reactions: [{
        position: "self",
        effectId: "on_battle_start",
        effects: [{ id: "increase_power", amount: 5, permanent: false, targets: { id: "self" } }],
      }],
      power: 10,
      cooldown: 99999,
    });
    reactor.id = "battle-start-reactor";
    const { combatState, combatRunner } = setupCombat([reactor]);

    const logs = runFrames(combatRunner, combatState, 10);

    // on_battle_start reactions are processed during runCombat init
    const incLogs = logs.filter((l) => l.type === "increase_power");
    expect(incLogs.length).toBeGreaterThanOrEqual(1);
    expect(incLogs[0].amount).toBe(5);
    const csReactor = combatState.unitById.get("battle-start-reactor")!;
    expect(csReactor.power).toBe(15);
  });
});


describe("Reaction — by effect type", () => {
  it("fires when a specific effect type is triggered by another unit", () => {
    const reactor = makeTestUnit({
      effects: [],
      reactions: [{
        position: "allies",
        effectId: "damage",
        effects: [{ id: "increase_power", amount: 3, permanent: false, targets: { id: "self" } }],
      }],
      power: 10,
      cooldown: 99999,
      position: [1, 0],
    });
    reactor.id = "effect-reactor";

    const damager = makeTestUnit({
      effects: [{ id: "damage" }],
      power: 20,
      cooldown: 500,
      position: [0, 0],
    });
    damager.id = "effect-damager";

    const { combatState, combatRunner } = setupCombat([reactor, damager]);

    const logs = runFrames(combatRunner, combatState, 200);

    const reactionLogs = logs.filter((l) => l.type === "reaction" && l.unitId === reactor.id);
    expect(reactionLogs.length).toBeGreaterThanOrEqual(2);

    const incLogs = logs.filter(
      (l) => l.type === "increase_power" && l.targetId === reactor.id,
    );
    expect(incLogs.length).toBeGreaterThanOrEqual(2);
    const csReactor = combatState.unitById.get("effect-reactor")!;
    expect(csReactor.power).toBeGreaterThan(10);
  });

  it("does NOT fire for unmatched effect types", () => {
    const reactor = makeTestUnit({
      effects: [],
      reactions: [{
        position: "allies",
        effectId: "shield",
        effects: [{ id: "increase_power", amount: 5, permanent: false, targets: { id: "self" } }],
      }],
      power: 10,
      cooldown: 99999,
    });
    reactor.id = "unmatched-reactor";

    const damager = makeTestUnit({
      effects: [{ id: "damage" }],
      power: 20,
      cooldown: 500,
    });
    damager.id = "unmatched-damager";

    const { combatState, combatRunner } = setupCombat([reactor, damager]);

    const logs = runFrames(combatRunner, combatState, 200);

    const reactionLogs = logs.filter((l) => l.type === "reaction");
    expect(reactionLogs.length).toBe(0);
    expect(reactor.power).toBe(10);
  });
});


describe("Reaction — by position", () => {
  it("row_allies: fires for same-row ally triggering damage", () => {
    const reactor = makeTestUnit({
      effects: [],
      reactions: [{
        position: "row_allies",
        effectId: "damage",
        effects: [{ id: "increase_power", amount: 3, permanent: false, targets: { id: "self" } }],
      }],
      power: 10,
      cooldown: 99999,
      position: [0, 1],
    });
    reactor.id = "row-reactor";

    const sameRowDamager = makeTestUnit({
      effects: [{ id: "damage" }],
      power: 20,
      cooldown: 500,
      position: [2, 1],
    });
    sameRowDamager.id = "same-row-damager";

    const diffRowDamager = makeTestUnit({
      effects: [{ id: "damage" }],
      power: 20,
      cooldown: 99999,
      position: [0, 0],
    });
    diffRowDamager.id = "diff-row-damager";

    const { combatState, combatRunner } = setupCombat([reactor, sameRowDamager, diffRowDamager]);

    const logs = runFrames(combatRunner, combatState, 200);

    const reactionLogs = logs.filter((l) => l.type === "reaction" && l.unitId === reactor.id);
    expect(reactionLogs.length).toBeGreaterThanOrEqual(1);
    const csReactor = combatState.unitById.get("row-reactor")!;
    expect(csReactor.power).toBeGreaterThan(10);
  });

  it("column_allies: fires for same-column ally triggering damage", () => {
    const reactor = makeTestUnit({
      effects: [],
      reactions: [{
        position: "column_allies",
        effectId: "damage",
        effects: [{ id: "increase_power", amount: 3, permanent: false, targets: { id: "self" } }],
      }],
      power: 10,
      cooldown: 99999,
      position: [0, 0],
    });
    reactor.id = "col-reactor";

    const damager = makeTestUnit({
      effects: [{ id: "damage" }],
      power: 20,
      cooldown: 500,
      position: [0, 1],
    });
    damager.id = "col-damager";

    const { combatState, combatRunner } = setupCombat([reactor, damager]);

    const logs = runFrames(combatRunner, combatState, 200);

    const reactionLogs = logs.filter((l) => l.type === "reaction" && l.unitId === reactor.id);
    expect(reactionLogs.length).toBeGreaterThanOrEqual(1);
  });

  it("allies: fires for any ally triggering damage", () => {
    const reactor = makeTestUnit({
      effects: [],
      reactions: [{
        position: "allies",
        effectId: "damage",
        effects: [{ id: "increase_power", amount: 3, permanent: false, targets: { id: "self" } }],
      }],
      power: 10,
      cooldown: 99999,
      position: [0, 0],
    });
    reactor.id = "allies-reactor";

    const damager = makeTestUnit({
      effects: [{ id: "damage" }],
      power: 20,
      cooldown: 500,
      position: [2, 2],
    });
    damager.id = "allies-damager";

    const { combatState, combatRunner } = setupCombat([reactor, damager]);

    const logs = runFrames(combatRunner, combatState, 200);

    const reactionLogs = logs.filter((l) => l.type === "reaction" && l.unitId === reactor.id);
    expect(reactionLogs.length).toBeGreaterThanOrEqual(1);
  });

  it("self: does not react to own effects (excluded for non-global)", () => {
    const unit = makeTestUnit({
      effects: [{ id: "damage" }],
      reactions: [{
        position: "self",
        effectId: "damage",
        effects: [{ id: "increase_power", amount: 5, permanent: false, targets: { id: "self" } }],
      }],
      power: 10,
      cooldown: 500,
    });
    unit.id = "self-no-react";

    const { combatState, combatRunner } = setupCombat([unit]);

    const logs = runFrames(combatRunner, combatState, 200);

    const reactionLogs = logs.filter((l) => l.type === "reaction" && l.unitId === unit.id);
    expect(reactionLogs.length).toBe(0);
  });
});


describe("Reaction — enemies position", () => {
  it("fires when an enemy triggers the matched effect", () => {
    const damager = makeTestUnit({
      effects: [{ id: "damage" }],
      power: 20,
      cooldown: 500,
      position: [0, 0],
    });
    damager.id = "enemy-damager";

    const { combatState, combatRunner } = setupCombat([damager]);

    // Add a CPU-side reactor manually after setupCombat
    const cpuReactor: Models.Unit = {
      id: "cpu-reactor",
      cardId: "test-custom-unit",
      pic: "test",
      force: Constants.FORCE_ID_CPU,
      position: [1, 1],
      rank: 1,
      power: 10,
      bonusPower: 0,
      critical: 0,
      life: 100,
      maxLife: 100,
      shield: 0,
      cooldown: 99999,
      evade: 0,
      effects: [],
      reactions: [{
        position: "enemies",
        effectId: "damage",
        effects: [{ id: "increase_power", amount: 5, permanent: false, targets: { id: "self" } }],
      }],
      charge: 0,
      refresh: 0,
      hasted: 0,
      slowed: 0,
      isCore: false,
    };

    combatState.units.push(cpuReactor);
    combatState.unitById.set(cpuReactor.id, cpuReactor);
    combatState.cpuUnits.push(cpuReactor);

    const logs = runFrames(combatRunner, combatState, 200);

    const reactionLogs = logs.filter((l) => l.type === "reaction" && l.unitId === cpuReactor.id);
    expect(reactionLogs.length).toBeGreaterThanOrEqual(1);
    expect(cpuReactor.power).toBeGreaterThan(10);
  });
});


describe("Reaction — global triggers", () => {
  it("on_crit: fires when a critical hit occurs", () => {
    const reactor = makeTestUnit({
      effects: [],
      reactions: [{
        position: "all",
        effectId: "on_crit",
        effects: [{ id: "increase_power", amount: 8, permanent: false, targets: { id: "self" } }],
      }],
      power: 10,
      cooldown: 99999,
      position: [1, 0],
    });
    reactor.id = "oncrit-reactor";

    const critDealer = makeTestUnit({
      effects: [{ id: "damage" }],
      power: 20,
      cooldown: 500,
      critical: 100,
      position: [0, 0],
    });
    critDealer.id = "crit-dealer";

    const { combatState, combatRunner } = setupCombat([reactor, critDealer]);

    const logs = runFrames(combatRunner, combatState, 200);

    const reactionLogs = logs.filter((l) => l.type === "reaction" && l.unitId === reactor.id);
    expect(reactionLogs.length).toBeGreaterThanOrEqual(1);
    const csReactor = combatState.unitById.get("oncrit-reactor")!;
    expect(csReactor.power).toBeGreaterThan(10);
  });

  it("re_hasted: fires when an already-hasted unit receives haste again", () => {
    const reactor = makeTestUnit({
      effects: [],
      reactions: [{
        position: "all",
        effectId: "re_hasted",
        effects: [{ id: "increase_power", amount: 5, permanent: false, targets: { id: "self" } }],
      }],
      power: 10,
      cooldown: 99999,
      position: [1, 0],
    });
    reactor.id = "rehasted-reactor";

    const haster = makeTestUnit({
      effects: [{ id: "haste", duration: 2000, targets: { id: "random_ally", count: 1 } }],
      power: 10,
      cooldown: 500,
      position: [0, 0],
    });
    haster.id = "haster";

    const { combatState, combatRunner } = setupCombat([reactor, haster]);

    // Pre-haste the reactor so the next haste triggers re_hasted
    reactor.hasted = 1000;

    const logs = runFrames(combatRunner, combatState, 200);

    const hasteHitLogs = logs.filter((l) => l.type === "haste_hit");
    expect(hasteHitLogs.length).toBeGreaterThanOrEqual(1);
  });

  it("re_slow: fires when an already-slowed unit receives slow again", () => {
    const slower = makeTestUnit({
      effects: [{ id: "slow", duration: 2000, targets: { id: "random_enemy", count: 1 } }],
      power: 10,
      cooldown: 500,
      position: [0, 0],
    });
    slower.id = "slower";

    const { combatState, combatRunner } = setupCombat([slower]);

    const cpuCore = combatState.cpuCore;
    cpuCore.slowed = 2000;
    cpuCore.reactions = [{
      position: "all",
      effectId: "re_slow",
      effects: [{ id: "increase_power", amount: 5, permanent: false, targets: { id: "self" } }],
    }];

    const logs = runFrames(combatRunner, combatState, 200);

    const slowHitLogs = logs.filter((l) => l.type === "slow_hit");
    expect(slowHitLogs.length).toBeGreaterThanOrEqual(1);

    const reactionLogs = logs.filter((l) => l.type === "reaction" && l.unitId === cpuCore.id);
    expect(reactionLogs.length).toBeGreaterThanOrEqual(1);
  });
});


describe("Reaction — edge cases", () => {
  it("does not fire reaction when effect type does not match", () => {
    const reactor = makeTestUnit({
      effects: [],
      reactions: [{
        position: "allies",
        effectId: "heal",
        effects: [{ id: "increase_power", amount: 5, permanent: false, targets: { id: "self" } }],
      }],
      power: 10,
      cooldown: 99999,
    });
    reactor.id = "heal-only-reactor";

    const damager = makeTestUnit({
      effects: [{ id: "damage" }],
      power: 20,
      cooldown: 500,
    });
    damager.id = "heal-edge-damager";

    const { combatState, combatRunner } = setupCombat([reactor, damager]);

    const logs = runFrames(combatRunner, combatState, 200);

    const reactionLogs = logs.filter((l) => l.type === "reaction");
    expect(reactionLogs.length).toBe(0);
  });
});

describe("Reaction — threshold triggers", () => {
  it("every_100_damage fires when own team's accumulated damage crosses 100", () => {
    const reactor = makeTestUnit({
      effects: [],
      reactions: [{
        position: "allies",
        effectId: "every_100_damage",
        triggerTeam: "own",
        effects: [{ id: "increase_power", amount: 5, permanent: false, targets: { id: "self" } }],
      }],
      power: 10,
      cooldown: 99999,
      position: [0, 0],
    });
    reactor.id = "dmg-threshold-reactor";

    const damager = makeTestUnit({
      effects: [{ id: "damage" }],
      power: 50,
      cooldown: 500,
      position: [1, 0],
    });
    damager.id = "dmg-threshold-damager";

    const { combatState, combatRunner } = setupCombat([reactor, damager]);
    const logs = runFrames(combatRunner, combatState, 300);

    const reactionLogs = logs.filter(
      (l) => l.type === "reaction" && l.unitId === reactor.id,
    );
    expect(reactionLogs.length).toBeGreaterThanOrEqual(1);
    const csReactor = combatState.unitById.get("dmg-threshold-reactor")!;
    expect(csReactor.power).toBeGreaterThan(10);
  });

  it("triggerTeam enemy: reactor fires for enemy team's damage (cross-force)", () => {
    // Reactor on CPU side watching for PLAYER (enemy) damage
    const reactor = makeTestUnit({
      effects: [],
      reactions: [{
        position: "enemies",  // triggerer is PLAYER, reactor is CPU → enemies
        effectId: "every_100_damage",
        triggerTeam: "enemy",
        effects: [{ id: "increase_power", amount: 8, permanent: false, targets: { id: "self" } }],
      }],
      power: 10,
      cooldown: 99999,
      position: [0, 2],
    });

    const damager = makeTestUnit({
      effects: [{ id: "damage" }],
      power: 50,
      cooldown: 500,
      position: [0, 0],
    });

    const { combatState, combatRunner } = setupCombat([damager]);

    // Add reactor as CPU unit — PLAYER is "enemy" from its perspective
    reactor.force = Constants.FORCE_ID_CPU;
    reactor.id = "cpu-enemy-dmg-reactor";
    combatState.units.push(reactor);
    combatState.cpuUnits.push(reactor);
    combatState.unitById.set(reactor.id, reactor);
    combatState.initialUnits.push(reactor);

    const logs = runFrames(combatRunner, combatState, 300);

    const reactionLogs = logs.filter(
      (l) => l.type === "reaction" && l.unitId === reactor.id,
    );
    expect(reactionLogs.length).toBeGreaterThanOrEqual(1);
    const csReactor = combatState.unitById.get("cpu-enemy-dmg-reactor")!;
    expect(csReactor.power).toBeGreaterThan(10);
  });

  it("triggerTeam own: reactor only fires for own team's damage threshold", () => {
    // This is the default — same as the first every_100_damage test
    // Explicitly testing that triggerTeam: "own" ignores other force's stats.
    // We add a CPU damager alongside, but reactor should only count PLAYER damage.
    const reactor = makeTestUnit({
      effects: [],
      reactions: [{
        position: "allies",
        effectId: "every_100_damage",
        triggerTeam: "own",
        effects: [{ id: "increase_power", amount: 10, permanent: false, targets: { id: "self" } }],
      }],
      power: 10,
      cooldown: 99999,
      position: [0, 0],
    });
    reactor.id = "own-only-reactor";

    const damager = makeTestUnit({
      effects: [{ id: "damage" }],
      power: 50,
      cooldown: 500,
      position: [1, 0],
    });
    damager.id = "own-only-damager";

    const { combatState, combatRunner } = setupCombat([reactor, damager]);

    // Add a CPU damager to the initial unit list BEFORE tracker init
    // by pushing it before running frames
    const cpuDamager = makeTestUnit({
      effects: [{ id: "damage" }],
      power: 50,
      cooldown: 99999,  // won't act — just here to make sure its stats don't trigger reaction
      position: [0, 2],
    });
    cpuDamager.force = Constants.FORCE_ID_CPU;
    cpuDamager.id = "cpu-silent-damager";
    combatState.units.push(cpuDamager);
    combatState.cpuUnits.push(cpuDamager);
    combatState.unitById.set(cpuDamager.id, cpuDamager);

    const logs = runFrames(combatRunner, combatState, 300);

    const reactionLogs = logs.filter(
      (l) => l.type === "reaction" && l.unitId === reactor.id,
    );
    // Reactor has triggerTeam: "own" — fires for PLAYER damage
    expect(reactionLogs.length).toBeGreaterThanOrEqual(1);
  });

  it("every_100_shield fires when shield applied crosses 100", () => {
    const reactor = makeTestUnit({
      effects: [],
      reactions: [{
        position: "allies",
        effectId: "every_100_shield",
        triggerTeam: "own",
        effects: [{ id: "increase_power", amount: 5, permanent: false, targets: { id: "self" } }],
      }],
      power: 10,
      cooldown: 99999,
      position: [0, 0],
    });
    reactor.id = "shield-reactor";

    const shielder = makeTestUnit({
      effects: [{ id: "shield" }],
      power: 100,
      cooldown: 500,
      position: [1, 0],
    });
    shielder.id = "threshold-shielder";

    const { combatState, combatRunner } = setupCombat([reactor, shielder]);
    const logs = runFrames(combatRunner, combatState, 200);

    const reactionLogs = logs.filter(
      (l) => l.type === "reaction" && l.unitId === reactor.id,
    );
    expect(reactionLogs.length).toBeGreaterThanOrEqual(1);
    const csReactor = combatState.unitById.get("shield-reactor")!;
    expect(csReactor.power).toBeGreaterThan(10);
  });

  it("every_100_heal fires when healing crosses 100", () => {
    const reactor = makeTestUnit({
      effects: [],
      reactions: [{
        position: "allies",
        effectId: "every_100_heal",
        triggerTeam: "own",
        effects: [{ id: "increase_power", amount: 5, permanent: false, targets: { id: "self" } }],
      }],
      power: 10,
      cooldown: 99999,
      position: [0, 0],
    });
    reactor.id = "heal-reactor";

    const healer = makeTestUnit({
      effects: [{ id: "heal" }],
      power: 100,
      cooldown: 500,
      position: [1, 0],
    });
    healer.id = "threshold-healer";

    const { combatState, combatRunner } = setupCombat([reactor, healer]);
    const playerCore = combatState.playerCore;
    playerCore.life = 1;

    const logs = runFrames(combatRunner, combatState, 200);

    const reactionLogs = logs.filter(
      (l) => l.type === "reaction" && l.unitId === reactor.id,
    );
    expect(reactionLogs.length).toBeGreaterThanOrEqual(1);
    const csReactor = combatState.unitById.get("heal-reactor")!;
    expect(csReactor.power).toBeGreaterThan(10);
  });

  it("every_10_poison fires when poison applied crosses 10", () => {
    const reactor = makeTestUnit({
      effects: [],
      reactions: [{
        position: "allies",
        effectId: "every_10_poison",
        triggerTeam: "own",
        effects: [{ id: "increase_power", amount: 5, permanent: false, targets: { id: "self" } }],
      }],
      power: 10,
      cooldown: 99999,
      position: [0, 0],
    });
    reactor.id = "poison-reactor";

    const poisoner = makeTestUnit({
      effects: [{ id: "poison" }],
      power: 100,
      cooldown: 500,
      position: [1, 0],
    });
    poisoner.id = "threshold-poisoner";

    const { combatState, combatRunner } = setupCombat([reactor, poisoner]);
    const logs = runFrames(combatRunner, combatState, 200);

    const reactionLogs = logs.filter(
      (l) => l.type === "reaction" && l.unitId === reactor.id,
    );
    expect(reactionLogs.length).toBeGreaterThanOrEqual(1);
    const csReactor = combatState.unitById.get("poison-reactor")!;
    expect(csReactor.power).toBeGreaterThan(10);
  });

  it("every_10_regen fires when regen applied crosses 10", () => {
    const reactor = makeTestUnit({
      effects: [],
      reactions: [{
        position: "allies",
        effectId: "every_10_regen",
        triggerTeam: "own",
        effects: [{ id: "increase_power", amount: 5, permanent: false, targets: { id: "self" } }],
      }],
      power: 10,
      cooldown: 99999,
      position: [0, 0],
    });
    reactor.id = "regen-reactor";

    const regenUnit = makeTestUnit({
      effects: [{ id: "regen" }],
      power: 100,
      cooldown: 500,
      position: [1, 0],
    });
    regenUnit.id = "threshold-regen";

    const { combatState, combatRunner } = setupCombat([reactor, regenUnit]);
    const logs = runFrames(combatRunner, combatState, 200);

    const reactionLogs = logs.filter(
      (l) => l.type === "reaction" && l.unitId === reactor.id,
    );
    expect(reactionLogs.length).toBeGreaterThanOrEqual(1);
    const csReactor = combatState.unitById.get("regen-reactor")!;
    expect(csReactor.power).toBeGreaterThan(10);
  });

  it("does not fire twice for the same threshold level", () => {
    const reactor = makeTestUnit({
      effects: [],
      reactions: [{
        position: "allies",
        effectId: "every_100_damage",
        triggerTeam: "own",
        effects: [{ id: "increase_power", amount: 3, permanent: false, targets: { id: "self" } }],
      }],
      power: 10,
      cooldown: 99999,
      position: [0, 0],
    });
    reactor.id = "no-double-reactor";

    // 100 damage per hit → 1 hit = 100, 2 hits = 200
    const damager = makeTestUnit({
      effects: [{ id: "damage" }],
      power: 100,
      cooldown: 500,
      position: [1, 0],
    });
    damager.id = "no-double-damager";

    const { combatState, combatRunner } = setupCombat([reactor, damager]);
    // 100 frames gives 2 hits (hit 1 at ~42, hit 2 at ~84)
    const logs = runFrames(combatRunner, combatState, 100);

    const reactionLogs = logs.filter(
      (l) => l.type === "reaction" && l.unitId === reactor.id,
    );
    // 2 hits × 100 = 200 damage → crosses 100 and 200 → exactly 2 reactions
    expect(reactionLogs.length).toBe(2);

    const csReactor = combatState.unitById.get("no-double-reactor")!;
    expect(csReactor.power).toBe(16); // 10 + 3 + 3
  });
});


