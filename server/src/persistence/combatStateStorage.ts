/**
 * Log-free combat-state serialization for the server boundary.
 *
 * Combat is deterministic: `CombatState.seed` (the pre-combat RNG seed) plus
 * the initial `units` are enough for the client to rebuild `logs` locally via
 * `CombatReplay.reconstructCombatLogs`. The log array is therefore omitted
 * from both:
 *
 *   - durable rows — a long fight's history exceeds Firestore's 1 MiB
 *     per-document limit ("The value of property `combatJson` is longer than
 *     1048487 bytes"), and
 *   - HTTP responses — the client re-simulates for playback instead of
 *     downloading (and the server storing) thousands of events.
 *
 * Keep `CombatCodec.serializeCombatState` for local callers/tests that need
 * the full DTO; every server write/response goes through these helpers.
 */

import * as CombatCodec from "@game/Combat/CombatCodec";
import type { CombatState } from "@game/types/combat";

/**
 * Serialize a combat state for durable storage with `logs` emptied.
 *
 * Everything else (`units`, `seed`, `finalPlayerUnits`, `wonCombat`,
 * `enemyPlayerName`) is kept so a session can resume mid-combat, reconstruct
 * its playback logs, and resolve `end_combat` correctly.
 */
export function serializeCombatStateForStorage(
  combatState: CombatState,
): CombatCodec.CombatStateDto {
  const serialized = CombatCodec.serializeCombatState(combatState);
  return {
    ...serialized,
    // NEVER store combat log history in the database: it is reconstructible
    // from `seed` + `units`, and long fights blow past the 1 MiB limit.
    logs: [],
  };
}

/**
 * Serialize a combat state for an HTTP response. Same log-free shape as
 * storage: the client rebuilds the playback timeline from `seed` + `units`.
 */
export function serializeCombatStateForWire(
  combatState: CombatState,
): CombatCodec.CombatStateDto {
  return serializeCombatStateForStorage(combatState);
}
