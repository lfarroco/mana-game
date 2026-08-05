/**
 * @mana/framework — Barrel export.
 *
 * Engine-agnostic client framework: screen lifecycle, resource tracking, and
 * typed navigation.  Phaser-specific adapters live in `phaser/src/` and build
 * on top of this package.
 *
 * Directory structure:
 *   Screen.ts        — ScreenModule contract
 *   createScreen.ts  — resource-tracking screen factory + screenModule helper
 *   ScreenManager.ts — navigation core (registry, nav mutex, typed routes)
 *   Router.ts        — typed navigation helper
 *   Event.ts         — re-export of the typed pub/sub primitive from @mana/core
 */

export type { ScreenModule } from "./Screen";

export {
	createScreen,
	screenModule,
	findTrackedById,
} from "./createScreen";
export type {
	ScreenCtx,
	ScreenResult,
	Destroyable,
	EventRecord,
	PhaseEntry,
	PhaseTransition,
} from "./createScreen";

export { createScreenManager } from "./ScreenManager";
export type {
	ScreenManager,
	ScreenManagerHooks,
	Routes,
} from "./ScreenManager";

export { go, setRouter, currentScreen } from "./Router";

export type { Event } from "./Event";
export { createEvent } from "./Event";