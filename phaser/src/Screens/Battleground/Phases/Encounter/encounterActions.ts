import * as Models from "@game/Models";

/**
 * Map a selected encounter option id to the action that resolves it.
 *
 * The pre_combat phase's only option is the combat-start card
 * (`session.options = [{ id: "start_combat" }]` — core SessionTransitions).
 * It is semantically the `start_combat` action, not an encounter pick:
 * dispatching it as `start_combat` is what lets the multiplayer server run
 * ghost snapshotting + opponent resolution (docs/game-server.md), while
 * single-player core handles `start_combat` as the same PvE combat. Every
 * other encounter pick (shops, core upgrades, roulette reveals, ...) stays a
 * `select_encounter`.
 */
export function encounterActionFor(id: string): Models.Action {
	return id === "start_combat"
		? { type: "start_combat" }
		: { type: "select_encounter", encounterId: id };
}
