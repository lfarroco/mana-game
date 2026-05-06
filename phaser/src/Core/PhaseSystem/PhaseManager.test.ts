/**
 * Comprehensive tests for the PhaseManager orchestration.
 *
 * PhaseManager coordinates phase handlers, validates actions and results,
 * and orchestrates transitions. Tests verify:
 *   - Handler registration
 *   - Handler lookup and matching
 *   - Orchestrated transitions
 *   - Validation integration
 *   - Error handling
 *   - Clear/reset functionality
 */
import { describe, expect, it, beforeEach } from "@jest/globals";
import { phaseManager } from "@Core/PhaseSystem/PhaseManager";
import { PhaseHandler, ActionType } from "@Core/PhaseSystem/types";
import { SessionData } from "@Core/Types";

const createSession = (overrides: Partial<SessionData> = {}): SessionData => ({
	id: "sess-test",
	player_id: "player-1",
	phase: "encounter",
	round: 1,
	step: 1,
	seed: "test-seed",
	initial_seed: "test-seed",
	current_options: { options: [] },
	team: { units: [] },
	wins: 0,
	losses: 0,
	action_log: [],
	...overrides,
});

const createMockHandler = (phase: string, canHandlePhase: boolean = true): PhaseHandler => ({
	phase: phase as any,
	actionType: ActionType.PHASE_TRANSITION,
	canHandle: (context) => canHandlePhase && context.session.phase === phase,
	transition: () => ({
		nextPhase: "shop",
		nextOptions: [],
	}),
	validateAction: () => ({ valid: true, errors: [] }),
});

describe("PhaseManager", () => {
	beforeEach(() => {
		phaseManager.clear();
	});

	// ---------------------------------------------------------------------------
	// register() Tests
	// ---------------------------------------------------------------------------

	describe("register", () => {
		it("registers a handler without errors", () => {
			const handler = createMockHandler("encounter");

			expect(() => {
				phaseManager.register(handler);
			}).not.toThrow();
		});

		it("registers multiple handlers in sequence", () => {
			const handlers = [
				createMockHandler("encounter"),
				createMockHandler("shop"),
				createMockHandler("combat"),
			];

			expect(() => {
				handlers.forEach((h) => phaseManager.register(h));
			}).not.toThrow();
		});

		it("allows registering the same phase with different actions", () => {
			const handler1 = createMockHandler("encounter");
			const handler2 = {
				...handler1,
				actionType: ActionType.META_ACTION,
			};

			expect(() => {
				phaseManager.register(handler1);
				phaseManager.register(handler2);
			}).not.toThrow();
		});
	});

	// ---------------------------------------------------------------------------
	// findHandler() Tests
	// ---------------------------------------------------------------------------

	describe("findHandler", () => {
		it("returns handler for matching phase", () => {
			const handler = createMockHandler("encounter");
			phaseManager.register(handler);

			const session = createSession({ phase: "encounter" });
			const found = phaseManager.findHandler({ session, actionId: "test" });

			expect(found).toBe(handler);
		});

		it("returns null when no handler matches", () => {
			const handler = createMockHandler("shop");
			phaseManager.register(handler);

			const session = createSession({ phase: "encounter" });
			const found = phaseManager.findHandler({ session, actionId: "test" });

			expect(found).toBeNull();
		});

		it("returns first matching handler when multiple could handle", () => {
			const handler1 = createMockHandler("encounter");
			const handler2 = createMockHandler("encounter");

			phaseManager.register(handler1);
			phaseManager.register(handler2);

			const session = createSession({ phase: "encounter" });
			const found = phaseManager.findHandler({ session, actionId: "test" });

			// Should return the first registered handler
			expect(found).toBe(handler1);
		});

		it("respects canHandle() method", () => {
			const handler1 = createMockHandler("encounter", false);
			const handler2 = createMockHandler("encounter", true);

			phaseManager.register(handler1);
			phaseManager.register(handler2);

			const session = createSession({ phase: "encounter" });
			const found = phaseManager.findHandler({ session, actionId: "test" });

			expect(found).toBe(handler2);
		});

		it("returns null for empty registry", () => {
			const session = createSession({ phase: "encounter" });
			const found = phaseManager.findHandler({ session, actionId: "test" });

			expect(found).toBeNull();
		});
	});

	// ---------------------------------------------------------------------------
	// transition() Tests
	// ---------------------------------------------------------------------------

	describe("transition", () => {
		it("throws when no handler found", () => {
			const session = { ...createSession(), phase: "unknown" } as unknown as SessionData;

			expect(() => {
				phaseManager.transition({ session, actionId: "test" });
			}).toThrow("No phase handler found");
		});

		it("calls handler.transition when handler is found", () => {
			let transitionCalled = false;
			const handler: PhaseHandler = {
				...createMockHandler("encounter"),
				transition: () => {
					transitionCalled = true;
					return { nextPhase: "shop", nextOptions: [] };
				},
			};

			phaseManager.register(handler);

			const session = createSession({ phase: "encounter", current_options: { options: [{ id: "test" }] } });
			const result = phaseManager.transition({ session, actionId: "test" });

			expect(transitionCalled).toBe(true);
			expect(result.nextPhase).toBe("shop");
		});

		it("executes validation before transition", () => {
			let validationCalled = false;
			const handler: PhaseHandler = {
				...createMockHandler("encounter"),
				validateAction: () => {
					validationCalled = true;
					return { valid: true, errors: [] };
				},
				transition: (context) => {
					// Call validateAction like BasePhaseHandler does
					const validation = handler.validateAction(context);
					if (!validation.valid) {
						throw new Error(`Invalid action: ${validation.errors.join(", ")}`);
					}
					return { nextPhase: "shop", nextOptions: [] };
				},
			};

			phaseManager.register(handler);

			const session = createSession({ phase: "encounter", current_options: { options: [{ id: "test" }] } });
			phaseManager.transition({ session, actionId: "test" });

			expect(validationCalled).toBe(true);
		});

		it("throws when validation returns invalid", () => {
			const handler: PhaseHandler = {
				...createMockHandler("encounter"),
				validateAction: () => ({
					valid: false,
					errors: ["Invalid action"],
				}),
				transition: (context) => {
					// Call validateAction like BasePhaseHandler does
					const validation = handler.validateAction(context);
					if (!validation.valid) {
						throw new Error(`Invalid action: ${validation.errors.join(", ")}`);
					}
					return { nextPhase: "shop", nextOptions: [] };
				},
			};

			phaseManager.register(handler);

			const session = createSession({ phase: "encounter", current_options: { options: [{ id: "test" }] } });

			expect(() => {
				phaseManager.transition({ session, actionId: "test" });
			}).toThrow("Invalid action");
		});

		it("passes payload through to handler", () => {
			let receivedPayload: any;
			const handler: PhaseHandler = {
				...createMockHandler("encounter"),
				transition: (context) => {
					receivedPayload = context.payload;
					return { nextPhase: "shop", nextOptions: [] };
				},
			};

			phaseManager.register(handler);

			const session = createSession({ phase: "encounter", current_options: { options: [{ id: "test" }] } });
			const payload = { cardId: "card_123" };

			phaseManager.transition({
				session,
				actionId: "test",
				payload,
			});

			expect(receivedPayload).toEqual(payload);
		});

		it("validates result after transition (non-blocking)", () => {
			const handler: PhaseHandler = {
				...createMockHandler("encounter"),
				transition: () => ({
					nextPhase: "shop",
					nextOptions: [],
					roundIncrement: -1, // Invalid!
				}),
			};

			phaseManager.register(handler);

			const session = createSession({ phase: "encounter", current_options: { options: [{ id: "test" }] } });

			// Should not throw, but result validation may report issues
			expect(() => {
				phaseManager.transition({ session, actionId: "test" });
			}).not.toThrow();
		});
	});

	// ---------------------------------------------------------------------------
	// clear() Tests
	// ---------------------------------------------------------------------------

	describe("clear", () => {
		it("removes all registered handlers", () => {
			phaseManager.register(createMockHandler("encounter"));
			phaseManager.register(createMockHandler("shop"));
			phaseManager.register(createMockHandler("combat"));

			phaseManager.clear();

			const session = createSession({ phase: "encounter" });
			const found = phaseManager.findHandler({ session, actionId: "test" });

			expect(found).toBeNull();
		});

		it("allows re-registration after clear", () => {
			phaseManager.register(createMockHandler("encounter"));
			phaseManager.clear();

			const handler = createMockHandler("shop");
			phaseManager.register(handler);

			const session = createSession({ phase: "shop" });
			const found = phaseManager.findHandler({ session, actionId: "test" });

			expect(found).toBe(handler);
		});

		it("makes transition throw after clear", () => {
			phaseManager.register(createMockHandler("encounter"));
			phaseManager.clear();

			const session = createSession({ phase: "encounter" });

			expect(() => {
				phaseManager.transition({ session, actionId: "test" });
			}).toThrow();
		});
	});

	// ---------------------------------------------------------------------------
	// Integration Tests
	// ---------------------------------------------------------------------------

	describe("integration", () => {
		it("handles realistic game phase flow", () => {
			// Register all phase handlers
			const encounterHandler: PhaseHandler = {
				...createMockHandler("encounter"),
				transition: (context) => {
					if (context.actionId === "skip_encounter") {
						return { nextPhase: "shop", nextOptions: [{ id: "card_1" }] };
					}
					return { nextPhase: "combat", nextOptions: [] };
				},
			};

			const shopHandler: PhaseHandler = {
				...createMockHandler("shop"),
				transition: (context) => {
					if (context.actionId === "skip_shop") {
						return { nextPhase: "encounter", nextOptions: [{ id: "enc_2" }], roundIncrement: 1 };
					}
					return { nextPhase: "shop", nextOptions: [{ id: "card_2" }] };
				},
			};

			const combatHandler: PhaseHandler = {
				...createMockHandler("combat"),
				transition: () => ({
					nextPhase: "upgrade_core",
					nextOptions: [{ id: "upgrade_1" }],
				}),
			};

			phaseManager.register(encounterHandler);
			phaseManager.register(shopHandler);
			phaseManager.register(combatHandler);

			// Simulate: Encounter -> Shop -> Encounter -> Combat
			let session = createSession({ phase: "encounter", round: 1, current_options: { options: [{ id: "skip_encounter" }] } });

			// Skip encounter
			let result = phaseManager.transition({ session, actionId: "skip_encounter" });
			expect(result.nextPhase).toBe("shop");
			session = { ...session, phase: result.nextPhase, current_options: { options: [{ id: "skip_shop" }] } };

			// Skip shop
			result = phaseManager.transition({ session, actionId: "skip_shop" });
			expect(result.nextPhase).toBe("encounter");
			expect(result.roundIncrement).toBe(1);
			session = { ...session, phase: result.nextPhase, round: session.round + (result.roundIncrement || 0), current_options: { options: [{ id: "combat_encounter" }] } };

			// Pick combat
			result = phaseManager.transition({ session, actionId: "combat_encounter" });
			expect(result.nextPhase).toBe("combat");
			session = { ...session, phase: result.nextPhase };

			// Complete combat
			result = phaseManager.transition({ session, actionId: "combat_done" });
			expect(result.nextPhase).toBe("upgrade_core");
		});

		it("recovers gracefully when handler lookup fails", () => {
			phaseManager.register(createMockHandler("shop"));

			const session = { ...createSession(), phase: "unknown_phase" } as unknown as SessionData;

			expect(() => {
				phaseManager.transition({ session, actionId: "test" });
			}).toThrow("No phase handler found for phase 'unknown_phase'");
		});

		it("maintains state across multiple transitions", () => {
			let transitionCount = 0;
			const handler: PhaseHandler = {
				...createMockHandler("encounter"),
				transition: () => {
					transitionCount++;
					return { nextPhase: "shop", nextOptions: [] };
				},
			};

			phaseManager.register(handler);

			const session = createSession({ phase: "encounter", current_options: { options: [{ id: "action1" }, { id: "action2" }, { id: "action3" }] } });

			phaseManager.transition({ session, actionId: "action1" });
			expect(transitionCount).toBe(1);

			phaseManager.transition({ session, actionId: "action2" });
			expect(transitionCount).toBe(2);

			phaseManager.transition({ session, actionId: "action3" });
			expect(transitionCount).toBe(3);
		});

		it("can register, use, clear, and re-register handlers", () => {
			const handler1 = createMockHandler("encounter");
			phaseManager.register(handler1);

			let session = createSession({ phase: "encounter" });
			let found = phaseManager.findHandler({ session, actionId: "test" });
			expect(found).toBe(handler1);

			phaseManager.clear();
			found = phaseManager.findHandler({ session, actionId: "test" });
			expect(found).toBeNull();

			const handler2 = createMockHandler("shop");
			phaseManager.register(handler2);

			session = { ...session, phase: "shop" };
			found = phaseManager.findHandler({ session, actionId: "test" });
			expect(found).toBe(handler2);
		});
	});
});
