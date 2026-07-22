/**
 * Events — typed event catalog for cross-module communication.
 *
 * Each event is a named export with its own listener set.
 * Import exactly what you need:
 *   import { BattlegroundEvent } from "../Events";
 *
 * No EventEmitter, no string keys, no shared state between events.
 * Each event is an independent subject.
 */

import * as Models from "@game/Models";

// ---------------------------------------------------------------------------
// Event primitive
// ---------------------------------------------------------------------------

type Event<T> = {
  listen: (cb: (payload: T) => void) => void;
  emit: (payload: T) => void;
};

/** Creates a self-contained typed event — no EventEmitter, no strings. */
const make = <T>(): Event<T> => {
  const listeners = new Set<(payload: T) => void>();
  return {
    listen: (cb) => { listeners.add(cb); },
    emit: (payload) => { listeners.forEach((cb) => cb(payload)); },
  };
};

// ---------------------------------------------------------------------------
// Battleground events
// ---------------------------------------------------------------------------

export const BattlegroundEvent = {
  /** Emitted when a phase completes and the next phase should begin. */
  phaseFinished: make<{ previousPhase: Models.PhaseType }>(),

  /** Emitted when dragging a shop unit to the board fails. */
  shopUnitDragPurchaseFailed: make<{
    shopCharaId: string;
    dragStartVec: Vec2;
  }>(),
  onShopUnitDragPurchaseFailed: make<{
    shopCharaId: string;
    dragStartVec: Vec2;
  }>(),

  /** Emitted when the player drops an orb onto a unit. */
  orbApplyRequested: make<{
    orbId: string;
    targetUnitId: string;
  }>(),

  /** Emitted when the player clicks "Continue" after combat. */
  combatContinueRequested: make<void>(),

  /** Emitted when replay is requested during combat playback. */
  combatReplayRequested: make<void>(),

  /** Emitted when combat playback should pause. */
  combatPauseRequested: make<void>(),

  /** Emitted when combat playback should resume. */
  combatResumeRequested: make<void>(),

  /** Emitted when the player wants a new run. */
  newRunRequested: make<void>(),

  /** Emitted when the player requests the main menu. */
  mainMenuRequested: make<void>(),

  /** HUD update: wins count changed. */
  winsChanged: make<{ wins: number; delta: number }>(),
  onWinsChanged: make<{ wins: number; delta: number }>(),

  /** HUD update: lives count changed. */
  livesChanged: make<{ lives: number; delta: number }>(),
  onLivesChanged: make<{ lives: number; delta: number }>(),

  /** HUD update: round number changed. */
  roundChanged: make<{ round: number; delta: number }>(),
  onRoundChanged: make<{ round: number; delta: number }>(),
};
