import { encounterActionFor } from "./encounterActions";

/**
 * Unit tests for the encounter-option → action mapping.
 *
 * The pre_combat "fight" card is core's combat-start option
 * (`session.options = [{ id: "start_combat" }]`). It must dispatch the
 * `start_combat` action — not `select_encounter` — because the multiplayer
 * server only runs ghost snapshotting + matchmaking on `start_combat`
 * (docs/game-server.md; sessionService.handleAction). Single-player core
 * handles `start_combat` identically to the old select_encounter route (PvE).
 */
describe("encounterActionFor", () => {
	it("maps the pre_combat combat-start card to the start_combat action", () => {
		expect(encounterActionFor("start_combat")).toEqual({ type: "start_combat" });
	});

	it("maps every other encounter pick to select_encounter", () => {
		expect(encounterActionFor("recruit_a")).toEqual({
			type: "select_encounter",
			encounterId: "recruit_a",
		});
		expect(encounterActionFor("upgrade_orb")).toEqual({
			type: "select_encounter",
			encounterId: "upgrade_orb",
		});
		expect(encounterActionFor("roulette_core_power")).toEqual({
			type: "select_encounter",
			encounterId: "roulette_core_power",
		});
	});
});
