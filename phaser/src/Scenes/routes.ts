/**
 * Route catalog — the single source of truth for screen navigation.
 *
 * The game runs one Phaser scene per screen. A "route" is the app-level name
 * screens navigate with; for a migrated screen the route IS the Phaser scene
 * key (e.g. "title"). Routes that are still served by the legacy
 * `@mana/framework` screens are marked in `LEGACY_ROUTES` and are hosted
 * inside `LegacyHostScene` until each is migrated.
 *
 * Migration checklist for a legacy route:
 *   1. Give the screen its own `ScreenScene` with key === route.
 *   2. Register the scene class in `main.ts`.
 *   3. Delete the route from `LEGACY_ROUTES` and from `legacyScreens.ts`.
 */

export type Route =
	"title" | "battleground" | "crystals" | "multiplayer_login" | "multiplayer_lobby" | "options";

/** Params each route accepts. `void` means "no params". */
export type RouteParams = {
	title: void;
	/** crystalId is optional — resume-game navigates without creating a new session. */
	battleground: { crystalId?: string };
	crystals: void;
	/** Multiplayer login hub — Google/itch.io/Log out/Back (no params). */
	multiplayer_login: void;
	/** Multiplayer lobby — profile, stats, and play/resume entry (no params). */
	multiplayer_lobby: void;
	options: { tab?: "audio" | "graphics" | "game" };
};

export type ParamsFor<R extends Route> = RouteParams[R];

/** Phaser scene key of the transitional host for not-yet-migrated screens. */
export const LEGACY_HOST_KEY = "legacy";

/**
 * Routes still served by the legacy `@mana/framework` screens. Shrinks as
 * screens are migrated to raw Phaser scenes.
 */
export const LEGACY_ROUTES = [
	"battleground",
	"crystals",
	"multiplayer_login",
	"multiplayer_lobby",
	"options",
] as const;

export type LegacyRoute = (typeof LEGACY_ROUTES)[number];

export function isLegacyRoute(route: Route): route is LegacyRoute {
	return (LEGACY_ROUTES as readonly string[]).includes(route);
}

/** Params carried into the legacy host scene so it knows which screen to build. */
export type LegacyHostData = {
	route: LegacyRoute;
	params?: unknown;
};
