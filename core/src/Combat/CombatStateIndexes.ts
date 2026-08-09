/**
 * CombatState derived-index helpers.
 *
 * CombatState carries a hot, mutable `units` array plus derived indexes
 * (unitById, playerCore, cpuCore, playerUnits, cpuUnits). These indexes are
 * built from `units` and must be rebuilt whenever `units` is replaced — e.g.
 * when playback swaps in a fresh clone of `initialUnits`. Keeping them in sync
 * by hand at every call site is error-prone (stale references silently
 * double-count power/life). Centralize the rebuild here so the invariant has a
 * single source of truth, and expose an assertion to catch drift in dev.
 */

import { CombatState } from "../Models";

/**
 * Rebuild all derived indexes from `state.units`.
 *
 * `playerForce` identifies which force owns the player core; it is stable
 * across the combat (forces never change), so callers can pass the existing
 * `state.playerCore.force` even if that reference is stale.
 *
 * Returns a new CombatState with the same source data but fresh indexes.
 */
export function rebuildCombatStateIndexes(
  state: CombatState,
  playerForce: string,
): CombatState {
  const units = state.units;
  const unitById = new Map(units.map((u) => [u.id, u]));
  const playerCore = units.find((u) => u.isCore && u.force === playerForce)!;
  const cpuCore = units.find((u) => u.isCore && u.force !== playerForce)!;

  return {
    ...state,
    unitById,
    playerCore,
    cpuCore,
    playerUnits: units.filter((u) => u.force === playerForce),
    cpuUnits: units.filter((u) => u.force !== playerForce),
  };
}

/**
 * Assert that the derived indexes are consistent with `units`.
 *
 * Throws if unitById is missing/extra entries or references objects that are
 * not the same instances as those in `units` — i.e. the classic stale-reference
 * bug. Cheap for a ~6-unit board, so it can run unconditionally.
 */
export function assertCombatStateIndexes(state: CombatState): void {
  const { units, unitById } = state;

  if (unitById.size !== units.length) {
    throw new Error(
      `CombatState index mismatch: unitById has ${unitById.size} entries but units has ${units.length}`,
    );
  }

  for (const u of units) {
    if (unitById.get(u.id) !== u) {
      throw new Error(
        `CombatState index stale for unit ${u.id}: unitById does not reference the same object as units`,
      );
    }
  }
}
