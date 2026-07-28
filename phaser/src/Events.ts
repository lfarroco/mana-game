/**
 * Events — typed event catalog for cross-module communication.
 *
 * Each event is a named export with its own listener set.
 * Import exactly what you need:
 *   import { BattlegroundEvent, NavigationEvent } from "../Events";
 *
 * No EventEmitter, no string keys, no shared state between events.
 * Each event is an independent subject.
 *
 * Screen-scoped events should live in their own screen modules.
 * Only cross-cutting concerns (navigation, global state) belong here.
 */

import * as Models from "@game/Models";
import { createEvent } from "@game/Models";

// ---------------------------------------------------------------------------
// Navigation events (cross-screen)
// ---------------------------------------------------------------------------

export const NavigationEvent = {
  /** Navigate to the title / main menu screen. */
  toTitle:        createEvent<void>(),
  /** Navigate to the battleground screen. */
  toBattleground: createEvent<void>(),
  /** Navigate to crystal selection. */
  toCrystals:     createEvent<void>(),
  /** Navigate to the options screen. */
  toOptions:      createEvent<void>(),
};

// ---------------------------------------------------------------------------
// Battleground events
// ---------------------------------------------------------------------------

export const BattlegroundEvent = {
  /** Emitted when a phase completes and the next phase should begin. */
  phaseFinished: createEvent<{ previousPhase: Models.PhaseType }>(),

  /** Emitted when dragging a shop unit to the board fails. */
  shopUnitDragPurchaseFailed: createEvent<{
    shopCharaId: string;
    dragStartVec: Vec2;
  }>(),

  /** Emitted when the player drops an orb onto a unit. */
  orbApplyRequested: createEvent<{
    orbId: string;
    targetUnitId: string;
  }>(),

  /** Emitted when combat playback finishes (naturally, not via stop). */
  combatPlaybackFinished: createEvent<{ outcome: Models.WaveOutcome }>(),

  /** Emitted when the player clicks "Continue" after combat. */
  combatContinueRequested: createEvent<void>(),

  /** Emitted when replay is requested during combat playback. */
  combatReplayRequested: createEvent<void>(),

  /** Emitted when combat playback should pause. */
  combatPauseRequested: createEvent<void>(),

  /** Emitted when combat playback should resume. */
  combatResumeRequested: createEvent<void>(),

  /** Emitted when the player wants a new run. */
  newRunRequested: createEvent<void>(),

  /** Emitted when the player requests the main menu. */
  mainMenuRequested: createEvent<void>(),

  /** HUD update: wins count changed. */
  winsChanged: createEvent<{ wins: number; delta: number }>(),

  /** HUD update: lives count changed. */
  livesChanged: createEvent<{ lives: number; delta: number }>(),

  /** HUD update: round number changed. */
  roundChanged: createEvent<{ round: number; delta: number }>(),

  /** Emitted after a unit purchase completes (post-server dispatch). */
  unitPurchaseCompleted: createEvent<{
    unitId: string;
    previousTeamUnits: Models.Unit[];
    shopCharaId: string | null;
  }>(),

  /** Emitted after a unit is sold (post-server dispatch). */
  unitSoldCompleted: createEvent<{ unitId: string }>(),

  /** Emitted after an orb is applied to a unit (post-server dispatch). */
  orbApplied: createEvent<{ orbId: string; targetUnitId: string }>(),
};

// ---------------------------------------------------------------------------
// Global game events — wired once at boot, never torn down.
// These carry pure domain data (no Phaser refs).  Systems that need to react
// to game occurrences (audio, stats, achievements, tooltip) subscribe here
// instead of being imported by screens.
// ---------------------------------------------------------------------------

export const GameEvent = {
  /** A screen finished its create() + fade-in and is fully visible. */
  screenShown:  createEvent<{ name: string }>(),
  /** A screen is about to be destroyed (before destroy() is called). */
  screenHidden: createEvent<{ name: string }>(),

  /** A new run was started. */
  runStarted:   createEvent<void>(),
  /** A run ended (victory or game over). */
  runCompleted: createEvent<{ outcome: Models.WaveOutcome }>(),

  /** A unit was added to the player's team. */
  unitRecruited: createEvent<{ unitId: string }>(),
  /** A unit was removed from the player's team. */
  unitRemoved:   createEvent<{ unitId: string }>(),
};

