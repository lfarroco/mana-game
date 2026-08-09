/**
 * Demo vs Full Version Configuration
 * IS_DEMO_BUILD is injected by webpack DefinePlugin at build time
 */

// This will be injected by webpack DefinePlugin at build time
declare const IS_DEMO_BUILD: boolean;

export const IS_DEMO = typeof IS_DEMO_BUILD !== "undefined" ? IS_DEMO_BUILD : false;

// Pull ?disable_assets param (default false)
export const DISABLE_ASSETS =
	typeof window !== "undefined"
		? new URLSearchParams(window.location.search).get("disable_assets") === "true"
		: false;

export const DEMO_CONFIG = {
	MAX_VICTORIES: 5,
	ENABLE_UNLOCKS: false,
	ENABLE_ACHIEVEMENTS: false,
} as const;

export const FULL_CONFIG = {
	MAX_VICTORIES: Infinity,
	ENABLE_UNLOCKS: true,
	ENABLE_ACHIEVEMENTS: true,
} as const;

export const GAME_CONFIG = IS_DEMO ? DEMO_CONFIG : FULL_CONFIG;

/**
 * Which visual effect to use when a unit is summoned onto the board.
 * - "smoke": the original white rectangles that disperse like smoke.
 * - "beam": a beam of light that comes down from the top of the screen,
 *   as if the unit were being beamed in from a ship.
 */
export const SUMMON_EFFECT: "smoke" | "beam" = "beam";
