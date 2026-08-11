/**
 * Repository interfaces for server persistence.
 *
 * v1 uses in-memory implementations (memory.ts). Phase 4 adds durable SQLite
 * implementations behind the same interfaces so the app layer never changes.
 */

import type { SessionData } from "@game/types/session";

/** Session repository keyed by player id — one active session per player. */
export type SessionRepo = {
  get(playerId: string): SessionData | null;
  upsert(playerId: string, session: SessionData): void;
  delete(playerId: string): void;
};
