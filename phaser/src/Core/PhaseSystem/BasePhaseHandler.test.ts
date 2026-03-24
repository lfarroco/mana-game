/**
 * Comprehensive tests for BasePhaseHandler (createPhaseHandler).
 *
 * The createPhaseHandler factory creates handler instances with built-in
 * validation and transition logic. Tests verify:
 *   - Handler creation
 *   - canHandle() logic
 *   - Transition execution
 *   - Validation integration
 *   - Error handling
 *   - Custom validators
 */
import { describe, expect, it } from "@jest/globals";
import { createPhaseHandler } from "@Core/PhaseSystem/BasePhaseHandler";
import { ActionType, PhaseTransitionContext, ValidationResult } from "@Core/PhaseSystem/types";
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

describe("createPhaseHandler", () => {
	// ---------------------------------------------------------------------------
	// Basic Creation Tests
	// ---------------------------------------------------------------------------

	describe("handler creation", () => {
		it("creates a handler with required config", () => {
			const handler = createPhaseHandler({
				phase: "encounter",
				actionType: ActionType.PHASE_TRANSITION,
				computeTransition: (context) => ({
					nextPhase: "shop",
					nextOptions: [],
				}),
			});

			expect(handler).toBeDefined();
			expect(handler.phase).toBe("encounter");
			expect(handler.actionType).toBe(ActionType.PHASE_TRANSITION);
		});

		it("creates handler with all optional properties", () => {
			const handler = createPhaseHandler({
				phase: "shop",
				actionType: ActionType.PHASE_SKIP,
				computeTransition: () => ({ nextPhase: "encounter", nextOptions: [] }),
				validateAction: () => ({ valid: true, errors: [] }),
				canHandle: () => true,
			});

			expect(handler.validateAction).toBeDefined();
			expect(handler.canHandle).toBeDefined();
		});

		it("preserves phase and actionType from config", () => {
			const phases = ["encounter", "shop", "combat", "upgrade_core", "add_reaction_core"];
			const types = [
				ActionType.PHASE_TRANSITION,
				ActionType.META_ACTION,
				ActionType.SUB_PHASE,
				ActionType.PHASE_SKIP,
			];

			phases.forEach((phase) => {
				types.forEach((type) => {
					const handler = createPhaseHandler({
						phase: phase as any,
						actionType: type,
						computeTransition: () => ({ nextPhase: "shop", nextOptions: [] }),
					});

					expect(handler.phase).toBe(phase);
					expect(handler.actionType).toBe(type);
				});
			});
		});
	});

	// ---------------------------------------------------------------------------
	// canHandle() Tests
	// ---------------------------------------------------------------------------

	describe("canHandle", () => {
		it("uses default canHandle when not provided", () => {
			const handler = createPhaseHandler({
				phase: "encounter",
				actionType: ActionType.PHASE_TRANSITION,
				computeTransition: () => ({ nextPhase: "shop", nextOptions: [] }),
			});

			const encounterSession = createSession({ phase: "encounter" });
			expect(handler.canHandle({ session: encounterSession, actionId: "test" })).toBe(true);

			const shopSession = createSession({ phase: "shop" });
			expect(handler.canHandle({ session: shopSession, actionId: "test" })).toBe(false);
		});

		it("uses custom canHandle when provided", () => {
			const customCanHandle = (context: PhaseTransitionContext) => {
				return context.actionId === "special_action";
			};

			const handler = createPhaseHandler({
				phase: "encounter",
				actionType: ActionType.PHASE_TRANSITION,
				computeTransition: () => ({ nextPhase: "shop", nextOptions: [] }),
				canHandle: customCanHandle,
			});

			expect(handler.canHandle({ session: createSession(), actionId: "special_action" })).toBe(true);
			expect(handler.canHandle({ session: createSession(), actionId: "normal_action" })).toBe(false);
		});

		it("allows custom handlers to ignore phase matching", () => {
			const handler = createPhaseHandler({
				phase: "encounter",
				actionType: ActionType.PHASE_TRANSITION,
				computeTransition: () => ({ nextPhase: "shop", nextOptions: [] }),
				canHandle: () => true, // Always handles
			});

			const shopSession = createSession({ phase: "shop" });
			const combatSession = createSession({ phase: "combat" });

			expect(handler.canHandle({ session: shopSession, actionId: "test" })).toBe(true);
			expect(handler.canHandle({ session: combatSession, actionId: "test" })).toBe(true);
		});
	});

	// ---------------------------------------------------------------------------
	// validateAction() Tests
	// ---------------------------------------------------------------------------

	describe("validateAction", () => {
		it("uses PhaseValidator when no custom validator provided", () => {
			const handler = createPhaseHandler({
				phase: "shop",
				actionType: ActionType.PHASE_SKIP,
				computeTransition: () => ({ nextPhase: "encounter", nextOptions: [] }),
			});

			const session = createSession({ phase: "shop" });
			const result = handler.validateAction({
				session,
				actionId: "skip_shop",
			});

			expect(result.valid).toBe(true);
		});

		it("rejects action when session phase doesn't match handler phase", () => {
			const handler = createPhaseHandler({
				phase: "shop",
				actionType: ActionType.PHASE_TRANSITION,
				computeTransition: () => ({ nextPhase: "encounter", nextOptions: [] }),
			});

			const session = createSession({ phase: "encounter" });
			const result = handler.validateAction({
				session,
				actionId: "test",
			});

			expect(result.valid).toBe(false);
			expect(result.errors[0]).toContain("session in 'encounter'");
		});

		it("uses custom validateAction when provided", () => {
			const customValidate = (context: PhaseTransitionContext): ValidationResult => {
				if (context.actionId === "allowed") {
					return { valid: true, errors: [] };
				}
				return { valid: false, errors: ["Only 'allowed' is valid"] };
			};

			const handler = createPhaseHandler({
				phase: "encounter",
				actionType: ActionType.PHASE_TRANSITION,
				computeTransition: () => ({ nextPhase: "shop", nextOptions: [] }),
				validateAction: customValidate,
			});

			expect(
				handler.validateAction({
					session: createSession(),
					actionId: "allowed",
				}).valid
			).toBe(true);

			expect(
				handler.validateAction({
					session: createSession(),
					actionId: "not_allowed",
				}).valid
			).toBe(false);
		});

		it("passes through validator warnings and errors", () => {
			const customValidate = (context: PhaseTransitionContext): ValidationResult => {
				return {
					valid: true,
					errors: [],
					warnings: ["Some warning"],
				};
			};

			const handler = createPhaseHandler({
				phase: "encounter",
				actionType: ActionType.PHASE_TRANSITION,
				computeTransition: () => ({ nextPhase: "shop", nextOptions: [] }),
				validateAction: customValidate,
			});

			const result = handler.validateAction({
				session: createSession(),
				actionId: "test",
			});

			expect(result.warnings).toContain("Some warning");
		});
	});

	// ---------------------------------------------------------------------------
	// transition() Tests
	// ---------------------------------------------------------------------------

	describe("transition", () => {
		it("throws when validation fails", () => {
			const handler = createPhaseHandler({
				phase: "shop",
				actionType: ActionType.PHASE_TRANSITION,
				computeTransition: () => ({ nextPhase: "encounter", nextOptions: [] }),
				validateAction: () => ({
					valid: false,
					errors: ["Test validation error"],
				}),
			});

			const session = createSession({ phase: "shop" });

			expect(() => {
				handler.transition({ session, actionId: "test" });
			}).toThrow("Invalid action: Test validation error");
		});

		it("calls computeTransition when validation passes", () => {
			let computeTransitionCalled = false;

			const handler = createPhaseHandler({
				phase: "encounter",
				actionType: ActionType.PHASE_TRANSITION,
				computeTransition: (context) => {
					computeTransitionCalled = true;
					return { nextPhase: "shop", nextOptions: [] };
				},
			});

			const session = createSession({ phase: "encounter", current_options: { options: [{ id: "test" }] } });
			handler.transition({ session, actionId: "test" });

			expect(computeTransitionCalled).toBe(true);
		});

		it("returns result from computeTransition", () => {
			const expectedResult = {
				nextPhase: "combat" as const,
				nextOptions: [{ id: "combat_1" }],
				stepIncrement: 2,
				roundIncrement: 0,
			};

			const handler = createPhaseHandler({
				phase: "encounter",
				actionType: ActionType.PHASE_TRANSITION,
				computeTransition: () => expectedResult,
			});

			const session = createSession({ phase: "encounter", current_options: { options: [{ id: "test" }] } });
			const result = handler.transition({ session, actionId: "test" });

			expect(result).toEqual(expectedResult);
		});

		it("passes payload to computeTransition", () => {
			let receivedPayload: any;

			const handler = createPhaseHandler({
				phase: "encounter",
				actionType: ActionType.PHASE_TRANSITION,
				computeTransition: (context) => {
					receivedPayload = context.payload;
					return { nextPhase: "shop", nextOptions: [] };
				},
			});

			const session = createSession({ phase: "encounter", current_options: { options: [{ id: "test" }] } });
			const payload = { cardId: "card_123" };

			handler.transition({ session, actionId: "test", payload });

			expect(receivedPayload).toEqual(payload);
		});

		it("transitions handle complex scenarios", () => {
			const handler = createPhaseHandler({
				phase: "combat",
				actionType: ActionType.PHASE_TRANSITION,
				computeTransition: (context) => {
					if (context.actionId === "combat_done" && context.session.wins >= 10) {
						return {
							nextPhase: "victory",
							nextOptions: [],
						};
					}

					if (context.actionId === "victory") {
						return {
							nextPhase: "encounter",
							nextOptions: [{ id: "next_round_encounter" }],
							roundIncrement: 1,
						};
					}

					return {
						nextPhase: "upgrade_core",
						nextOptions: [{ id: "upgrade_1" }],
					};
				},
			});

			// Scenario 1: Regular combat completion
			let session = createSession({ phase: "combat", wins: 3, current_options: { options: [{ id: "combat_done" }] } });
			let result = handler.transition({ session, actionId: "combat_done" });
			expect(result.nextPhase).toBe("upgrade_core");

			// Scenario 2: Victory condition
			session = createSession({ phase: "combat", wins: 15, current_options: { options: [{ id: "combat_done" }] } });
			result = handler.transition({ session, actionId: "combat_done" });
			expect(result.nextPhase).toBe("victory");

			// Scenario 3: Victory action
			session = createSession({ phase: "combat", wins: 5, current_options: { options: [{ id: "victory" }] } });
			result = handler.transition({ session, actionId: "victory" });
			expect(result.nextPhase).toBe("encounter");
			expect(result.roundIncrement).toBe(1);
		});
	});

	// ---------------------------------------------------------------------------
	// Integration Tests
	// ---------------------------------------------------------------------------

	describe("integration", () => {
		it("handler works through full validation and transition cycle", () => {
			const handler = createPhaseHandler({
				phase: "shop",
				actionType: ActionType.PHASE_SKIP,
				computeTransition: (context) => {
					return {
						nextPhase: "encounter",
						nextOptions: [{ id: "new_enc" }],
						roundIncrement: 1,
					};
				},
			});

			const session = createSession({
				phase: "shop",
				round: 1,
				current_options: { options: [{ id: "skip_shop" }] },
			});

			// Should pass validation
			const validation = handler.validateAction({
				session,
				actionId: "skip_shop",
			});
			expect(validation.valid).toBe(true);

			// Should execute transition
			const result = handler.transition({
				session,
				actionId: "skip_shop",
			});

			expect(result.nextPhase).toBe("encounter");
			expect(result.roundIncrement).toBe(1);
		});

		it("handles all action types correctly", () => {
			const types = [
				ActionType.PHASE_TRANSITION,
				ActionType.META_ACTION,
				ActionType.SUB_PHASE,
				ActionType.PHASE_SKIP,
			];

			types.forEach((type) => {
				const handler = createPhaseHandler({
					phase: "test_phase",
					actionType: type,
					computeTransition: () => ({
						nextPhase: "shop",
						nextOptions: [],
					}),
					canHandle: () => true,
				});

				expect(handler.actionType).toBe(type);
			});
		});

		it("custom validators can enforce complex rules", () => {
			let validationCount = 0;

			const handler = createPhaseHandler({
				phase: "combat",
				actionType: ActionType.PHASE_TRANSITION,
				computeTransition: () => ({
					nextPhase: "upgrade_core",
					nextOptions: [],
				}),
				validateAction: (context) => {
					validationCount++;
					// Only allow combat_done if player won or lost
					if (
						context.actionId === "combat_done" &&
						context.session.wins + context.session.losses > 0
					) {
						return { valid: true, errors: [] };
					}
					return {
						valid: false,
						errors: ["Must have won or lost before proceeding"],
					};
				},
			});

			const sessionWithoutWins = createSession({
				phase: "combat",
				wins: 0,
				losses: 0,
			});

			const sessionWithWin = createSession({
				phase: "combat",
				wins: 1,
				losses: 0,
			});

			// Should fail validation
			let result = handler.validateAction({
				session: sessionWithoutWins,
				actionId: "combat_done",
			});
			expect(result.valid).toBe(false);

			// Should pass validation
			result = handler.validateAction({
				session: sessionWithWin,
				actionId: "combat_done",
			});
			expect(result.valid).toBe(true);

			// Should still be able to transition once valid
			const transition = handler.transition({
				session: sessionWithWin,
				actionId: "combat_done",
			});
			expect(transition.nextPhase).toBe("upgrade_core");
		});

		it("creates distinct handler instances", () => {
			const handler1 = createPhaseHandler({
				phase: "encounter",
				actionType: ActionType.PHASE_TRANSITION,
				computeTransition: () => ({
					nextPhase: "shop",
					nextOptions: [],
				}),
			});

			const handler2 = createPhaseHandler({
				phase: "shop",
				actionType: ActionType.PHASE_SKIP,
				computeTransition: () => ({
					nextPhase: "encounter",
					nextOptions: [],
				}),
			});

			expect(handler1).not.toBe(handler2);
			expect(handler1.phase).not.toBe(handler2.phase);
			expect(handler1.actionType).not.toBe(handler2.actionType);
		});
	});

	// ---------------------------------------------------------------------------
	// Edge Cases
	// ---------------------------------------------------------------------------

	describe("edge cases", () => {
		it("handles undefined payload gracefully", () => {
			const handler = createPhaseHandler({
				phase: "encounter",
				actionType: ActionType.PHASE_TRANSITION,
				computeTransition: (context) => {
					// Payload is undefined but code should handle it
					expect(context.payload).toBeUndefined();
					return { nextPhase: "shop", nextOptions: [] };
				},
			});

			const session = createSession({ phase: "encounter", current_options: { options: [{ id: "test" }] } });
			handler.transition({ session, actionId: "test" });
		});

		it("omitted transition result fields defaulttarget to undefined", () => {
			const handler = createPhaseHandler({
				phase: "shop",
				actionType: ActionType.PHASE_TRANSITION,
				computeTransition: () => ({
					nextPhase: "encounter",
					nextOptions: [],
					// stepIncrement and roundIncrement omitted
				}),
			});

			const session = createSession({ phase: "shop", current_options: { options: [{ id: "test" }] } });
			const result = handler.transition({ session, actionId: "test" });

			expect(result.stepIncrement).toBeUndefined();
			expect(result.roundIncrement).toBeUndefined();
		});

		it("handler remains functional after failed transition", () => {
			const handler = createPhaseHandler({
				phase: "shop",
				actionType: ActionType.PHASE_TRANSITION,
				computeTransition: () => ({
					nextPhase: "encounter",
					nextOptions: [],
				}),
			});

			const wrongPhaseSession = createSession({ phase: "encounter", current_options: { options: [{ id: "test" }] } });

			// First attempt with wrong phase should fail
			expect(() => {
				handler.transition({
					session: wrongPhaseSession,
					actionId: "test",
				});
			}).toThrow();

			// Second attempt with correct phase should work
			const correctPhaseSession = createSession({ phase: "shop", current_options: { options: [{ id: "test" }] } });
			const result = handler.transition({
				session: correctPhaseSession,
				actionId: "test",
			});

			expect(result.nextPhase).toBe("encounter");
		});
	});
});
