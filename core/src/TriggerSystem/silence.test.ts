/// <reference types="jest" />

/**
 * D1 — `silence` (docs/wacky-content-plan.md).
 *
 * A silenced unit wastes its turn instead of casting (CombatRunner skips it and
 * logs silence_skip), and resumes casting once the duration expires.
 */

import {
  registerBaseCollection,
  resetCardRegistry,
  makeTestUnit,
  filterLogs,
  runUntil,
} from "../__test_utils__/combatHarness";
import * as CombatSimulation from "../Combat/CombatSimulation";
import * as CombatRunner from "../Combat/CombatRunner";
import * as Constants from "../math/Constants";
import * as Models from "../Models";
import { damage, silence, strongestEnemy } from "../data/effectBuilders";

beforeAll(registerBaseCollection);
afterAll(resetCardRegistry);

function makeCore(force: string, id: string): Models.Unit {
  const core = makeTestUnit({
    effects: [],
    isCore: true,
    power: 1,
    cooldown: 99999,
    life: 5000,
    position: force === Constants.FORCE_ID_PLAYER ? [1, 1] : [0, 2],
  });
  core.force = force;
  core.id = id;
  return core;
}

function setupCombat(playerUnits: Models.Unit[], enemyUnits: Models.Unit[]) {
  const session: Models.SessionData = {
    id: "silence-test-session",
    player_id: "p1",
    phase: "combat",
    session_type: { type: "singleplayer" },
    round: 1,
    step: 0,
    seed: "silence-seed",
    initial_seed: "silence-seed",
    options: [],
    team: { units: playerUnits },
    wins: 0,
    losses: 0,
    action_log: [],
    encounter_history: [],
  };
  const combatState = CombatSimulation.createCombatState(session, enemyUnits);
  const combatRunner = CombatRunner.runCombat(session, combatState);
  return { combatRunner, combatState };
}

describe("silence (D1)", () => {
  it("a silenced unit wastes its turn and casts nothing during the duration", () => {
    const playerCore = makeCore(Constants.FORCE_ID_PLAYER, "player-core");
    const silencer = makeTestUnit({
      effects: [silence(1500, strongestEnemy)],
      power: 1,
      cooldown: 1000,
      position: [0, 0],
    });
    silencer.id = "silencer";
    silencer.force = Constants.FORCE_ID_PLAYER;
    const enemyCore = makeCore(Constants.FORCE_ID_CPU, "enemy-core");
    const attacker = makeTestUnit({
      effects: [damage],
      power: 10,
      cooldown: 1000,
      position: [0, 1],
    });
    attacker.id = "attacker";
    attacker.force = Constants.FORCE_ID_CPU;

    const { combatRunner, combatState } = setupCombat(
      [playerCore, silencer],
      [enemyCore, attacker],
    );

    // Run until the attacker has wasted exactly one turn to silence.
    const logs = runUntil(
      combatRunner,
      combatState,
      (logs) =>
        filterLogs(logs, "silence_skip").filter((l) => l.unitId === "attacker")
          .length >= 1,
    );

    // The attacker's first cast (at t≈1s) landed before the silence projectile
    // did; its next turn (t≈2s) was skipped — no second cast while silenced.
    const casts = filterLogs(logs, "damage_cast").filter(
      (l) => l.sourceId === "attacker",
    );
    const skips = filterLogs(logs, "silence_skip").filter(
      (l) => l.unitId === "attacker",
    );
    expect(casts).toHaveLength(1);
    expect(skips).toHaveLength(1);
    // The silence was actually applied to the attacker.
    const silenceHits = filterLogs(logs, "silence_hit");
    expect(silenceHits.map((h) => h.targetId)).toContain("attacker");
  });

  it("the unit resumes casting after the silence expires", () => {
    const playerCore = makeCore(Constants.FORCE_ID_PLAYER, "player-core");
    const enemyCore = makeCore(Constants.FORCE_ID_CPU, "enemy-core");
    const attacker = makeTestUnit({
      effects: [damage],
      power: 10,
      cooldown: 1000,
      position: [0, 1],
    });
    attacker.id = "attacker";
    attacker.force = Constants.FORCE_ID_CPU;
    // Simulate the attacker entering combat already silenced for 1.5s.
    attacker.silenced = 1500;

    const { combatRunner, combatState } = setupCombat(
      [playerCore],
      [enemyCore, attacker],
    );

    // Run until the attacker casts again after the silence ends.
    const logs = runUntil(
      combatRunner,
      combatState,
      (logs) =>
        filterLogs(logs, "damage_cast").filter((l) => l.sourceId === "attacker")
          .length >= 1,
    );

    expect(
      filterLogs(logs, "silence_skip").filter((l) => l.unitId === "attacker"),
    ).toHaveLength(1); // the t≈1s turn was wasted
    expect(
      filterLogs(logs, "silence_end").filter((l) => l.unitId === "attacker"),
    ).toHaveLength(1); // duration expired at t≈1.5s
    expect(
      filterLogs(logs, "damage_cast").filter((l) => l.sourceId === "attacker"),
    ).toHaveLength(1); // the first post-silence cast
  });
});
