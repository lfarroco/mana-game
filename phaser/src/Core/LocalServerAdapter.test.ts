import { LocalServerAdapter } from "@Core/LocalServerAdapter";
import * as GameLogic from "@Core/GameLogic";
import { SessionData } from "@Core/Types";

// Polyfill structuredClone for Jest environment
if (typeof global.structuredClone === "undefined") {
	global.structuredClone = <T>(obj: T): T => JSON.parse(JSON.stringify(obj)) as T;
}

describe("LocalServerAdapter", () => {
	let adapter: LocalServerAdapter;
	const testPlayerId = "test-player-1";
	const testCrystalId = "crystal_core";

	beforeEach(() => {
		adapter = new LocalServerAdapter();
	});

	describe("createSession", () => {
		it("should create a new session with crystal", async () => {
			const session = await adapter.createSession(testPlayerId, testCrystalId);

			expect(session).toBeDefined();
			expect(session.player_id).toBe(testPlayerId);
			expect(session.phase).toBe("encounter");
			expect(session.round).toBe(1);
			expect(session.team.units.length).toBeGreaterThan(0);
			// Note: makeUnit may fall back to dummy_card if crystal_core doesn't exist in test env
			expect(session.team.units[0].isCore).toBe(true);
		});

		it("should create session with unique ID", async () => {
			const session1 = await adapter.createSession(testPlayerId, testCrystalId);
			const session2 = await adapter.createSession("test-player-2", testCrystalId);

			expect(session1.id).not.toBe(session2.id);
		});
	});

	describe("getSession", () => {
		it("should retrieve existing session", async () => {
			await adapter.createSession(testPlayerId, testCrystalId);
			const session = await adapter.getSession(testPlayerId);

			expect(session).toBeDefined();
			expect(session?.player_id).toBe(testPlayerId);
		});

		it("should return null for non-existent session", async () => {
			const session = await adapter.getSession("non-existent-player");
			expect(session).toBeNull();
		});
	});

	describe("getPhaseOptions", () => {
		it("should return encounter options for new session", async () => {
			await adapter.createSession(testPlayerId, testCrystalId);
			const options = await adapter.getPhaseOptions(testPlayerId);

			expect(options.phase).toBe("encounter");
			expect(options.round).toBe(1);
			expect(options.options.length).toBeGreaterThan(0);
		});

		it("should return shop options after encounter", async () => {
			await adapter.createSession(testPlayerId, testCrystalId);

			// Get initial options to find a valid encounter
			const initialOptions = await adapter.getPhaseOptions(testPlayerId);
			const encounterId = initialOptions.options[0].id;

			// Select an encounter
			await adapter.handleAction(testPlayerId, encounterId);

			const options = await adapter.getPhaseOptions(testPlayerId);
			expect(["shop", "orb_shop"].includes(options.phase)).toBe(true);
			expect(options.options.length).toBeGreaterThan(0);
		});

		it("should throw error for non-existent session", async () => {
			await expect(adapter.getPhaseOptions("non-existent-player")).rejects.toThrow();
		});
	});

	describe("handleAction", () => {
		it("should handle encounter selection", async () => {
			await adapter.createSession(testPlayerId, testCrystalId);

			// Get initial options to find a valid encounter
			const initialOptions = await adapter.getPhaseOptions(testPlayerId);
			const encounterId = initialOptions.options[0].id;

			const result = await adapter.handleAction(testPlayerId, encounterId);

			expect(result).toBe(true);

			const session = await adapter.getSession(testPlayerId);
			expect(["shop", "orb_shop"].includes(session?.phase || "")).toBe(true);
		});

		it("should handle buying a unit in shop", async () => {
			await adapter.createSession(testPlayerId, testCrystalId);
			await adapter.handleAction(testPlayerId, "armory");

			// Get shop options to see what's available
			const options = await adapter.getPhaseOptions(testPlayerId);
			const firstUnit = options.options[0]?.id;

			if (firstUnit) {
				const result = await adapter.handleAction(testPlayerId, firstUnit);
				expect(result).toBe(true);
			}
		});

		it("should return false for non-existent session", async () => {
			const result = await adapter.handleAction("non-existent-player", "some-action");
			expect(result).toBe(false);
		});

		it("should use updated team positions when combat starts", async () => {
			const session = await adapter.createSession(testPlayerId, testCrystalId);

			const movedTeam = {
				units: session.team.units.map((unit) =>
					unit.isCore ? { ...unit, position: { x: 0, y: 0 } } : unit
				),
			};

			adapter.sessionManager.updateSession(testPlayerId, {
				...session,
				phase: "encounter",
				current_options: { options: [{ id: "combat_encounter" }] },
			});

			const updated = await adapter.handleAction(testPlayerId, "update_team", {
				team: movedTeam,
			});
			expect(updated).toBe(true);

			const startedCombat = await adapter.handleAction(testPlayerId, "combat_encounter");
			expect(startedCombat).toBe(true);

			const combatOptions = await adapter.getPhaseOptions(testPlayerId);
			expect(combatOptions.phase).toBe("combat");

			const coreInInitialUnits = combatOptions.combatState?.initialUnits?.find((u) => u.isCore);
			expect(coreInInitialUnits?.position).toEqual({ x: 0, y: 0 });
		});

		it("should persist run stats through purchases and combat", async () => {
			const session = await adapter.createSession(testPlayerId, testCrystalId);
			const shopOptions = GameLogic.generateShopOptions(session);

			adapter.sessionManager.updateSession(testPlayerId, {
				...session,
				phase: "shop",
				current_options: { options: shopOptions.options },
			});

			let options = await adapter.getPhaseOptions(testPlayerId);
			expect(options.phase).toBe("shop");

			const unitId = options.options[0]?.id;
			expect(unitId).toBeDefined();

			await adapter.handleAction(testPlayerId, unitId!);

			const updatedSession = await adapter.getSession(testPlayerId);
			expect(updatedSession?.runStats?.totalUnitsRecruited).toBe(1);
			expect(updatedSession?.runStats?.unitUsage[unitId!]).toBe(1);

			for (let guard = 0; guard < 10; guard++) {
				options = await adapter.getPhaseOptions(testPlayerId);

				if (
					options.phase === "encounter" &&
					options.options.some((option) => option.id === "combat_encounter")
				) {
					break;
				}

				if (options.phase === "encounter") {
					await adapter.handleAction(testPlayerId, options.options[0].id);
					continue;
				}

				if (options.phase === "shop") {
					await adapter.handleAction(testPlayerId, "skip_shop");
					continue;
				}

				if (options.phase === "orb_shop") {
					await adapter.handleAction(testPlayerId, "orb_shop_done");
					continue;
				}

				throw new Error(`Unexpected phase before combat: ${options.phase}`);
			}

			await adapter.handleAction(testPlayerId, "combat_encounter");

			const combatSession = await adapter.getSession(testPlayerId);
			expect(combatSession?.runStats).toBeDefined();
			expect(combatSession?.runStats?.totalUnitsRecruited).toBe(1);
			expect(combatSession?.runStats?.mostPowerfulUnit).toBeTruthy();
		});
	});

	describe("game flow", () => {
		it("should progress through multiple phases", async () => {
			await adapter.createSession(testPlayerId, testCrystalId);

			// Start: encounter phase
			let options = await adapter.getPhaseOptions(testPlayerId);
			expect(options.phase).toBe("encounter");

			// Select encounter
			await adapter.handleAction(testPlayerId, options.options[0].id);

			// Should be in shop or orb_shop phase (depends on encounter chosen)
			options = await adapter.getPhaseOptions(testPlayerId);
			expect(["shop", "orb_shop"]).toContain(options.phase);
			const phaseAfterEncounter = options.phase;

			// Skip shop/orb_shop
			const skipAction = phaseAfterEncounter === "shop" ? "skip_shop" : "orb_shop_done";
			await adapter.handleAction(testPlayerId, skipAction);

			// Should progress to next phase
			options = await adapter.getPhaseOptions(testPlayerId);
			expect(options.phase).not.toBe(phaseAfterEncounter);
		});
	});

	describe("deterministic behavior", () => {
		it("should generate same options with same seed", () => {
			const seed = "test-seed";
			const session1: SessionData = {
				id: "test1",
				player_id: "player-1",
				phase: "encounter",
				round: 1,
				step: 1,
				seed,
				initial_seed: seed,
				action_log: [],
				wins: 0,
				losses: 0,
				team: { units: [] },
				current_options: null,
			};
			const session2: SessionData = {
				id: "test2",
				player_id: "player-2",
				phase: "encounter",
				round: 1,
				step: 1,
				seed,
				initial_seed: seed,
				action_log: [],
				wins: 0,
				losses: 0,
				team: { units: [] },
				current_options: null,
			};

			const options1 = GameLogic.generateEncounterOptions(session1);
			const options2 = GameLogic.generateEncounterOptions(session2);

			expect(options1.options).toEqual(options2.options);
		});
	});
});
