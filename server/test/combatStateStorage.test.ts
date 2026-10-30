/**
 * Log-free combat serialization — regression coverage for the Firestore 1 MiB
 * document limit and the wire payload. Both storage and HTTP responses drop
 * the logs; the client rebuilds them from `seed` + `units`.
 */
/// <reference types="jest" />

import * as CombatCodec from "@game/Combat/CombatCodec";
import type { CombatState } from "@game/types/combat";
import {
  serializeCombatStateForStorage,
  serializeCombatStateForWire,
} from "../src/persistence/combatStateStorage";

/** A combat state whose log array is large enough to exceed 1 MiB. */
function makeCombatStateWithLogs(logCount: number): CombatState {
  const logs = Array.from({ length: logCount }, (_, index) => ({
    timeMs: index,
    type: "damage",
    payload: { sourceId: "unit-1", targetId: "unit-2", amount: index },
  }));
  return {
    units: [],
    initialUnits: [],
    finalPlayerUnits: [],
    logs,
    seed: "pre-combat-seed",
    wonCombat: true,
    enemyPlayerName: "Enemy",
  } as unknown as CombatState;
}

describe("log-free combat serialization", () => {
  it("empties logs while preserving every other field", () => {
    const combatState = makeCombatStateWithLogs(3);

    const full = CombatCodec.serializeCombatState(combatState);
    const stored = serializeCombatStateForStorage(combatState);

    expect(full.logs).toHaveLength(3);
    expect(stored).toEqual({ ...full, logs: [] });
    expect(stored.units).toBe(full.units);
    expect(stored.finalPlayerUnits).toBe(full.finalPlayerUnits);
    // The pre-combat seed must survive so the logs can be reconstructed.
    expect(stored.seed).toBe("pre-combat-seed");
    expect(stored.wonCombat).toBe(true);
    expect(stored.enemyPlayerName).toBe("Enemy");
  });

  it("uses the same log-free shape on the wire", () => {
    const combatState = makeCombatStateWithLogs(3);

    const wire = serializeCombatStateForWire(combatState);

    expect(wire.logs).toEqual([]);
    expect(wire.seed).toBe("pre-combat-seed");
    expect(wire).toEqual(serializeCombatStateForStorage(combatState));
  });

  it("keeps a long fight's stored JSON far below the 1 MiB limit", () => {
    const combatState = makeCombatStateWithLogs(20_000);

    const fullBytes = JSON.stringify(
      CombatCodec.serializeCombatState(combatState),
    ).length;
    const storedBytes = JSON.stringify(
      serializeCombatStateForStorage(combatState),
    ).length;

    expect(fullBytes).toBeGreaterThan(1_048_487);
    expect(storedBytes).toBeLessThan(1_000);
  });

  it("does not mutate the live combat state", () => {
    const combatState = makeCombatStateWithLogs(10);

    serializeCombatStateForStorage(combatState);

    expect(combatState.logs).toHaveLength(10);
  });
});
