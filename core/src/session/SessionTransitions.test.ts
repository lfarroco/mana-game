/**
 * Tests for SessionTransitions — session state machine.
 *
 * Covers the full start_combat → end_combat flow, including the
 * critical wonCombat derivation (P0 bug fix).
 */
/// <reference types="jest" />

import * as Card from "../Entities/Card";
import * as Constants from "../math/Constants";
import * as SessionTransitions from "./SessionTransitions";

// Cards are statically available — no registration needed.

afterAll(() => {
	Card.resetCardsMap();
});

describe("SessionTransitions", () => {
	describe("full combat flow (start_combat → end_combat)", () => {
		it("records a win when the player wins the combat", () => {
			const session = createTestSession("z" /* seed that reliably produces a win with a strong core */);
			// Give the player a very strong core that wins against round 1 enemies
			makeCoreStrong(session);

			// Phase 1: start_combat triggers combat simulation
			const afterCombat = SessionTransitions.transitionToNextState(session, {
				type: "start_combat",
			});

			expect(afterCombat.session.phase).toBe("combat");
			expect(afterCombat.combatState).toBeDefined();
			expect(afterCombat.combatState!.wonCombat).toBe(true);

			// Phase 2: end_combat consumes the result
			const afterEnd = SessionTransitions.transitionToNextState(
				afterCombat.session,
				{ type: "end_combat" },
			);

			expect(afterEnd.session.wins).toBe(1);
			expect(afterEnd.session.losses).toBe(0);
		});

		it("records a loss when the player loses the combat", () => {
			const session = createTestSession("test-loss-001");
			// Give the player a very weak core that loses quickly
			makeCoreWeak(session);

			const afterCombat = SessionTransitions.transitionToNextState(session, {
				type: "start_combat",
			});

			expect(afterCombat.session.phase).toBe("combat");
			expect(afterCombat.combatState).toBeDefined();
			expect(afterCombat.combatState!.wonCombat).toBe(false);

			const afterEnd = SessionTransitions.transitionToNextState(
				afterCombat.session,
				{ type: "end_combat" },
			);

			expect(afterEnd.session.wins).toBe(0);
			expect(afterEnd.session.losses).toBe(1);
		});

		it("throws end_combat if start_combat was not called first", () => {
			const session = createTestSession("test-no-start-001");
			// No pendingCombatState — calling end_combat directly should fail
			expect(() =>
				SessionTransitions.transitionToNextState(session, {
					type: "end_combat",
				}),
			).toThrow("Missing combat state");
		});
	});

	describe("transitionToNextState", () => {
		it("throws for unknown action types", () => {
			const session = createTestSession("test-unknown-001");
			expect(() =>
				SessionTransitions.transitionToNextState(session, {
					type: "unknown" as never,
				}),
			).toThrow("No transition handler");
		});
	});
});

/**
 * Create a minimal test session in pre_combat phase with a basic core.
 */
function createTestSession(seed: string) {
	const playerCore = Card.makeUnit(
		Constants.FORCE_ID_PLAYER,
		"critical_crystal",
		[1, 1],
	);

	return {
		id: "test-session-transitions",
		player_id: "test-player",
		phase: "pre_combat" as const,
		session_type: { type: "singleplayer" as const },
		round: 1,
		step: 3,
		seed,
		initial_seed: seed,
		options: [],
		team: { units: [playerCore] },
		wins: 0,
		losses: 0,
		action_log: [],
	};
}

/**
 * Boost the core to be near-invincible (survives any round 1 enemy).
 */
function makeCoreStrong(session: ReturnType<typeof createTestSession>): void {
	const core = session.team.units[0];
	core.life = 5000;
	core.maxLife = 5000;
	core.power = 100;
	core.cooldown = 1000;
	core.charge = 0;
	core.refresh = 0;
}

/**
 * Make the core fragile (dies quickly to any enemy).
 */
function makeCoreWeak(session: ReturnType<typeof createTestSession>): void {
	const core = session.team.units[0];
	core.life = 1;
	core.maxLife = 1;
	core.power = 10;
	core.cooldown = 99999;
	core.charge = 0;
	core.refresh = 99999;
}
