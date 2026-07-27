/**
 * In-memory session persistence.
 *
 * Stores sessions in a Map keyed by session ID. A separate
 * reference tracks the "current" (only active) session.
 */

import type { SessionData } from "@game/types/session";

/** In-memory store of all sessions. */
const sessions = new Map<string, SessionData>();

/** The single currently active session ID. */
let currentSessionId: string | null = null;

export function getCurrentSession(): SessionData | null {
  if (!currentSessionId) return null;
  return sessions.get(currentSessionId) ?? null;
}

export function setCurrentSession(session: SessionData): void {
  sessions.set(session.id, session);
  currentSessionId = session.id;
}

export function clearCurrentSession(): void {
  if (currentSessionId) {
    sessions.delete(currentSessionId);
    currentSessionId = null;
  }
}

/** Test-only: reset all state. */
export function _reset(): void {
  sessions.clear();
  currentSessionId = null;
}
