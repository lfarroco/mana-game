/**
 * Tests for seed-based combat replay: the client rebuilds the log array from
 * the pre-combat seed + initial units, so the server never has to send it.
 */
/// <reference types="jest" />

import * as Card from "../Entities/Card";
import * as Constants from "../math/Constants";
import * as CombatCodec from "./CombatCodec";
import * as CombatReplay from "./CombatReplay";
import * as CombatSimulation from "./CombatSimulation";

afterAll(() => {
  Card.resetCardsMap();
});

function createMinimalSession(seed: string) {
  const playerCore = Card.makeUnit(
    Constants.FORCE_ID_PLAYER,
    "critical_crystal",
    [1, 1],
  );
  playerCore.isCore = true;

  return {
    id: "test-replay-session",
    player_id: "test-player",
    session_type: { type: "singleplayer" as const },
    phase: "pre_combat" as const,
    round: 1,
    step: 3,
    seed,
    initial_seed: seed,
    options: [],
    team: { units: [playerCore] },
    wins: 0,
    losses: 0,
    action_log: [],
  };
}

function simulate(seed: string, weakenPlayer = false) {
  const session = createMinimalSession(seed);
  if (weakenPlayer) {
    const core = session.team.units[0];
    core.life = 1;
    core.maxLife = 1;
    core.power = 1;
  }
  const enemy = [Card.makeUnit(Constants.FORCE_ID_CPU, "mana_crystal", [3, 1])];
  const state = CombatSimulation.createCombatState(session, enemy, "TestRival");
  return CombatSimulation.simulateCombat(session, state);
}

/** What the server/store keeps: the DTO with the logs dropped. */
function stripLogs(
  dto: CombatCodec.CombatStateDto,
): CombatCodec.CombatStateDto {
  return { ...dto, logs: [] };
}

describe("reconstructCombatLogs", () => {
  it("rebuilds the exact server logs from seed + initial units", () => {
    const simulated = simulate("replay-win-001");
    const stored = stripLogs(CombatCodec.serializeCombatState(simulated));
    const decoded = CombatCodec.deserializeCombatState(stored);

    expect(stored.logs).toEqual([]);
    expect(simulated.logs.length).toBeGreaterThan(0);

    const reconstructed = CombatReplay.reconstructCombatLogs(decoded);

    expect(reconstructed).toEqual(simulated.logs);
    expect(reconstructed.length).toBe(simulated.logs.length);
  });

  it("also reproduces a loss", () => {
    const simulated = simulate("replay-loss-001", true);
    const decoded = CombatCodec.deserializeCombatState(
      stripLogs(CombatCodec.serializeCombatState(simulated)),
    );

    expect(simulated.wonCombat).toBe(false);
    expect(CombatReplay.reconstructCombatLogs(decoded)).toEqual(simulated.logs);
  });

  it("returns no logs for a state that predates the seed field", () => {
    const simulated = simulate("replay-legacy-001");
    const decoded = CombatCodec.deserializeCombatState(
      stripLogs(CombatCodec.serializeCombatState(simulated)),
    );
    decoded.seed = undefined;

    expect(CombatReplay.reconstructCombatLogs(decoded)).toEqual([]);
  });

  it("does not mutate the stored state", () => {
    const simulated = simulate("replay-pure-001");
    const decoded = CombatCodec.deserializeCombatState(
      stripLogs(CombatCodec.serializeCombatState(simulated)),
    );
    const snapshot = structuredClone({
      ...decoded,
      unitById: [...decoded.unitById.keys()],
    });

    CombatReplay.reconstructCombatLogs(decoded);

    expect(decoded.logs).toEqual([]);
    expect(decoded.initialUnits).toEqual(snapshot.initialUnits);
    expect(decoded.units).toEqual(snapshot.units);
    expect(decoded.wonCombat).toBe(snapshot.wonCombat);
  });
});
