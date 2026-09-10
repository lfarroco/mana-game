/**
 * Route catalog — the single source of truth for screen navigation.
 *
 * The game runs one Phaser scene per screen. A "route" is the app-level name
 * screens navigate with, and it IS the Phaser scene key (e.g. "title",
 * "battleground"). Add a route here, implement a `ScreenScene` with the same
 * key, and register it in `main.ts`.
 *
 * Migrating another screen: extend `ScreenScene`, register the scene class in
 * `main.ts`, and add the route below. Full checklist:
 * docs/scene-migration.md.
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
