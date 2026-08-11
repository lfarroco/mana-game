/**
 * In-memory session repository.
 *
 * Stores sessions in a Map keyed by player id. Create a fresh repo per app
 * instance via createMemorySessionRepo() — tests get fully isolated state
 * and `createApp()` gets a clean default.
 */

import type { SessionData } from "@game/types/session";
import type { SessionRepo } from "./repositories";

export function createMemorySessionRepo(): SessionRepo {
  const sessions = new Map<string, SessionData>();

  return {
    get: (playerId) => sessions.get(playerId) ?? null,
    upsert: (playerId, session) => {
      sessions.set(playerId, session);
    },
    delete: (playerId) => {
      sessions.delete(playerId);
    },
  };
}
