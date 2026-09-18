/**
 * Regression: the Void Crystal mirror match (player report, 2026-09-16).
 *
 * "When you get the void crystal mirror match, the -10 power from your crystal
 * does not work, but the enemy's does — you automatically lose the mirror."
 *
 * Root cause: the baseline sap targeted `strongestEnemy`. Enemy teams are built
 * with full-card-power units and a core that only receives a flat share of the
 * round's power points, so the enemy core is essentially never the enemy's
 * strongest unit. The player's sap therefore drained an enemy unit while the
 * enemy's sap drained the player's core — which IS the player's strongest as
 * soon as they invest in it (the reported "stack power on the core" meta).
 *
 * The baseline now targets `enemyCore`, so a mirror is symmetric.
 */
/// <reference types="jest" />

import {
  registerBaseCollection,
  resetCardRegistry,
  filterLogs,
} from "../__test_utils__/combatHarness";
import * as Card from "../Entities/Card";
import * as CombatSimulation from "../Combat/CombatSimulation";
import * as CombatRunner from "../Combat/CombatRunner";
import * as Constants from "../Constants";
import * as Models from "../Models";

beforeAll(registerBaseCollection);
afterAll(resetCardRegistry);

const SIM_DELTA = 16.67;

function makeSession(units: Models.Unit[]): Models.SessionData {
  return {
    id: "void-mirror-session",
    player_id: "player",
    phase: "combat",
    session_type: { type: "singleplayer" },
    round: 4,
    step: 0,
    seed: "void-mirror-seed",
    initial_seed: "void-mirror-seed",
    options: [],
    team: { units },
    wins: 0,
    losses: 0,
    action_log: [],
    encounter_history: [],
  };
}

function runMirror(playerCorePower: number, enemyCorePower: number) {
  const playerCore = Card.makeUnit(
    Constants.FORCE_ID_PLAYER,
    "void_crystal",
    [1, 1],
  );
  playerCore.power = playerCorePower;
  const enemyCore = Card.makeUnit(
    Constants.FORCE_ID_CPU,
    "void_crystal",
    [1, 1],
  );
  enemyCore.power = enemyCorePower;

  // Decoy units shape each side's "strongest enemy" the way real boards do:
  // the enemy's strongest is a unit; the player's strongest is their core.
  const playerDecoy = Card.makeUnit(
    Constants.FORCE_ID_PLAYER,
    "thornback",
    [0, 1],
  );
  playerDecoy.power = 20;
  const enemyDecoy = Card.makeUnit(Constants.FORCE_ID_CPU, "thornback", [0, 1]);
  enemyDecoy.power = 80;

  const session = makeSession([playerCore, playerDecoy]);
  const combatState = CombatSimulation.createCombatState(session, [
    enemyCore,
    enemyDecoy,
  ]);
  const runner = CombatRunner.runCombat(session, combatState);

  // Both cores have a 5000ms cooldown; 11s covers their first two casts each
  // without letting either core die (the player's 120-power core needs ~5 hits
  // to chew through 500 life).
  for (let frame = 0; frame < 660; frame++) {
    runner.updateFrame(combatState, frame * SIM_DELTA, SIM_DELTA);
  }

  return {
    logs: runner.getEnv().logger.getLogs(),
    playerCore: combatState.units.find((u) => u.id === playerCore.id)!,
    enemyCore: combatState.units.find((u) => u.id === enemyCore.id)!,
  };
}

describe("Void Crystal mirror", () => {
  it("saps the enemy crystal, not the strongest enemy unit", () => {
    const { logs, playerCore, enemyCore } = runMirror(120, 30);

    const playerSaps = filterLogs(logs, "decrease_power").filter(
      (log) => log.sourceId === playerCore.id,
    );

    expect(playerSaps.length).toBeGreaterThanOrEqual(2);
    for (const sap of playerSaps) {
      expect(sap.targetId).toBe(enemyCore.id);
      expect(sap.affectedUnitId).toBe(enemyCore.id);
      expect(sap.amount).toBe(10);
    }
  });

  it("drains both crystals by the same amount — the mirror is symmetric", () => {
    const { logs, playerCore, enemyCore } = runMirror(120, 30);

    const saps = filterLogs(logs, "decrease_power");
    const ontoPlayerCore = saps.filter(
      (l) => l.affectedUnitId === playerCore.id,
    );
    const ontoEnemyCore = saps.filter((l) => l.affectedUnitId === enemyCore.id);

    expect(ontoPlayerCore.length).toBeGreaterThanOrEqual(2);
    expect(ontoPlayerCore.length).toBe(ontoEnemyCore.length);

    // `decrease_power` logs the applied magnitude as a positive number (the
    // client subtracts it), so the totals add up.
    const totalOntoPlayer = ontoPlayerCore.reduce((s, l) => s + l.amount, 0);
    const totalOntoEnemy = ontoEnemyCore.reduce((s, l) => s + l.amount, 0);
    expect(totalOntoPlayer).toBe(totalOntoEnemy);

    expect(playerCore.power).toBe(120 - totalOntoEnemy);
    expect(enemyCore.power).toBe(30 - totalOntoPlayer);
  });
});
