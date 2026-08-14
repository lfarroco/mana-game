/**
 * Shared harness for the CombatSimulation integration tests.
 * Provides the session/combat factories and frame runner used by
 * CombatSimulation.test.ts and its split sibling test files.
 */
/// <reference types="jest" />

import * as Models from "../Models";
import * as Card from "../Entities/Card";
import * as Constants from "../Constants";
import * as CombatSimulation from "../Combat/CombatSimulation";
import * as CombatRunner from "../Combat/CombatRunner";
import * as BoardLogic from "../BoardLogic";
import * as F from "../Functional";

/**
 * Create a minimal session and enemy team for combat testing.
 * Uses "critical_crystal" which has a "damage" effect and isCore: true.
 */
export function createTestCombat(
  playerCoreLife: number,
  cpuCoreLife: number,
  playerPower: number = 35,
  cpuPower: number = 35,
  seed: string = "test-seed",
) {
  const playerCore = Card.makeUnit(
    Constants.FORCE_ID_PLAYER,
    "critical_crystal",
    [0, 0],
  );
  playerCore.life = playerCoreLife;
  playerCore.maxLife = playerCoreLife;
  playerCore.power = playerPower;
  playerCore.charge = 0;
  playerCore.refresh = 0;

  const cpuCore = Card.makeUnit(
    Constants.FORCE_ID_CPU,
    "critical_crystal",
    [0, 2],
  );
  cpuCore.life = cpuCoreLife;
  cpuCore.maxLife = cpuCoreLife;
  cpuCore.power = cpuPower;
  cpuCore.charge = 0;
  cpuCore.refresh = 0;

  const session: Models.SessionData = {
    id: "test-combat-session",
    player_id: "test-player",
    phase: "combat",
    session_type: { type: "singleplayer" },
    round: 1,
    step: 0,
    seed,
    initial_seed: seed,
    options: [],
    team: { units: [playerCore] },
    wins: 0,
    losses: 0,
    action_log: [],
    encounter_history: [],
  };

  return {
    session,
    combatState: CombatSimulation.createCombatState(session, [cpuCore]),
  };
}

/**
 * Create a test combat with custom player units (including a specific core).
 * Both cores are set with very long cooldowns so they don't fire during tests.
 */
export function createCustomCombat(
  playerUnits: Models.Unit[],
  cpuCoreLife: number = 500,
  cpuCorePower: number = 1,
  seed: string = "test-custom-seed",
) {
  playerUnits.forEach((u) => {
    u.force = Constants.FORCE_ID_PLAYER;
    u.charge = 0;
    u.refresh = 0;
  });

  const hasPlayerCore = playerUnits.some((u) => u.isCore);
  if (!hasPlayerCore) {
    const freeSlot = BoardLogic.findFreeSlot(
      playerUnits,
      Constants.FORCE_ID_PLAYER,
      [1, 1],
    );
    const core = Card.makeUnit(
      Constants.FORCE_ID_PLAYER,
      "critical_crystal",
      F.getOrElse(freeSlot, [1, 1]),
    );
    core.power = 1;
    core.cooldown = 99999;
    playerUnits.push(core);
  } else {
    const playerCore = playerUnits.find((u) => u.isCore)!;
    playerCore.cooldown = 99999;
    playerCore.charge = 0;
  }

  const cpuCore = Card.makeUnit(
    Constants.FORCE_ID_CPU,
    "critical_crystal",
    [0, 2],
  );
  cpuCore.life = cpuCoreLife;
  cpuCore.maxLife = cpuCoreLife;
  cpuCore.power = cpuCorePower;
  cpuCore.cooldown = 99999;
  cpuCore.charge = 0;
  cpuCore.refresh = 0;

  const session: Models.SessionData = {
    id: "test-combat-session",
    player_id: "test-player",
    phase: "combat",
    session_type: { type: "singleplayer" },
    round: 1,
    step: 0,
    seed,
    initial_seed: seed,
    options: [],
    team: { units: playerUnits },
    wins: 0,
    losses: 0,
    action_log: [],
    encounter_history: [],
  };

  return { session, enemyTeam: [cpuCore] };
}

/** Run combat for a specific number of frames to control timing precisely. */
export function simulateCombatForFrames(
  session: Models.SessionData,
  enemyTeam: Models.Unit[],
  maxFrames: number,
) {
  const combatState = CombatSimulation.createCombatState(session, enemyTeam);

  const combatRunner = CombatRunner.runCombat(session, combatState);

  const SIM_DELTA = 16.67;
  let frame = 0;

  while (combatRunner.isActive() && frame < maxFrames) {
    combatRunner.updateFrame(combatState, frame * SIM_DELTA, SIM_DELTA);
    frame++;
  }

  const env = combatRunner.getEnv();
  return env.logger.getLogs();
}
