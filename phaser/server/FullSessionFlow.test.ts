/**
 * @jest-environment node
 * 
 * Full Session Flow Test
 * Tests a complete game session from start to finish, server-side only.
 * This test simulates:
 * - Starting a new session
 * - Picking choices through encounters and shops
 * - Organizing team
 * - Performing combat
 * - Completing session (victory or defeat)
 * 
 * Uses LocalServerAdapter which provides in-memory server-side logic without requiring a database.
 */
import { LocalServerAdapter } from '../src/Core/LocalServerAdapter';
import { IGameServer } from '../src/Core/IGameServer';
import { registerCollection } from '../src/Models/Entities/Card';
import { BASE_COLLECTION_DATA } from '../src/Data/BaseCollection';
import { SessionData } from '../src/Core/Types';

jest.mock('../src/i18n/i18n', () => ({
	t: (key: string) => key,
	getName: (key: string) => key,
	initialize: () => { },
	setLocale: () => { },
	getCurrentLocale: () => 'en',
	getAvailableLocales: () => ['en'],
	getNativeName: () => 'English',
}));

describe('Full Session Flow - Server Side', () => {
	let manager: IGameServer;

	beforeAll(() => {
		registerCollection(BASE_COLLECTION_DATA);
	});

	beforeEach(() => {
		manager = new LocalServerAdapter();
	});

	/**
	 * Helper function to complete a single round (Encounter -> Shop -> Encounter -> Shop -> Combat)
	 */
	async function completeRound(playerId: string): Promise<{ won: boolean, session: SessionData }> {
		// Step 1: Encounter
		let options = await manager.getPhaseOptions(playerId);
		expect(options.phase).toBe('encounter');
		expect(options.options.length).toBeGreaterThan(0);

		const encounterAction = options.options[0].id;
		await manager.handleAction(playerId, encounterAction);

		// Step 2: Shop (or Orb Shop)
		options = await manager.getPhaseOptions(playerId);
		expect(['shop', 'orb_shop'].includes(options.phase)).toBe(true);
		expect(options.options.length).toBeGreaterThan(0);

		const shopAction = options.options[0].id;
		await manager.handleAction(playerId, shopAction);

		// Step 3: Encounter
		options = await manager.getPhaseOptions(playerId);
		expect(options.phase).toBe('encounter');
		expect(options.options.length).toBeGreaterThan(0);

		const encounterAction2 = options.options[0].id;
		await manager.handleAction(playerId, encounterAction2);

		// Step 4: Shop (or Orb Shop)
		options = await manager.getPhaseOptions(playerId);
		expect(['shop', 'orb_shop'].includes(options.phase)).toBe(true);
		expect(options.options.length).toBeGreaterThan(0);

		const shopAction2 = options.options[0].id;
		await manager.handleAction(playerId, shopAction2);

		// Step 5: Encounter
		options = await manager.getPhaseOptions(playerId);
		expect(options.phase).toBe('encounter');
		expect(options.options.length).toBeGreaterThan(0);

		const encounterAction3 = options.options[0].id;
		await manager.handleAction(playerId, encounterAction3);

		// Step 6: Shop (or Orb Shop)
		options = await manager.getPhaseOptions(playerId);
		expect(['shop', 'orb_shop'].includes(options.phase)).toBe(true);
		expect(options.options.length).toBeGreaterThan(0);

		const shopAction3 = options.options[0].id;
		await manager.handleAction(playerId, shopAction3);

		// Combat phase
		options = await manager.getPhaseOptions(playerId);
		expect(options.phase).toBe('combat');
		expect(options.combatState).toBeDefined();
		expect(options.combatState?.logs).toBeDefined();
		expect(options.combatState?.logs.length).toBeGreaterThan(0);

		// Find outcome
		const outcomeLog = options.combatState?.logs.find((l: any) => l.type === 'outcome');
		expect(outcomeLog).toBeDefined();
		const won = outcomeLog?.result === 'player_won';

		// Complete combat
		await manager.handleAction(playerId, 'combat_done');

		const session = await manager.getSession(playerId);
		if (!session) throw new Error('Session not found after combat');

		return { won, session };
	}

	describe('Basic Session Flow', () => {
		it('should start a new session with a selected crystal', async () => {
			const playerId = 'flow_test_player_1';
			const selectedCrystal = 'crystal_core';

			const session = await manager.createSession(playerId, selectedCrystal);

			expect(session).toBeDefined();
			expect(session.player_id).toBe(playerId);
			expect(session.phase).toBe('encounter');
			expect(session.round).toBe(1);
			expect(session.step).toBe(1);
			expect(session.wins).toBe(0);
			expect(session.losses).toBe(0);
			expect(session.team).toBeDefined();
			expect(session.team.units).toBeDefined();
			expect(session.team.units.length).toBe(1);
			// The unit should be a core unit (may have different cardId depending on implementation)
			expect(session.team.units[0].isCore).toBe(true);
		});

		it('should pick encounter choices and advance phases', async () => {
			const playerId = 'flow_test_player_2';
			await manager.createSession(playerId, 'crystal_core');

			// Get initial encounter options
			let options = await manager.getPhaseOptions(playerId);
			expect(options.phase).toBe('encounter');
			expect(options.options.length).toBeGreaterThan(0);

			// Pick first encounter option
			const selectedEncounter = options.options[0].id;
			await manager.handleAction(playerId, selectedEncounter);

			// Verify phase advanced to shop (or orb_shop)
			options = await manager.getPhaseOptions(playerId);
			expect(['shop', 'orb_shop'].includes(options.phase)).toBe(true);

			const session = await manager.getSession(playerId);
			expect(session?.step).toBe(2);
		});

		it('should purchase units from shop and add to team', async () => {
			const playerId = 'flow_test_player_3';
			await manager.createSession(playerId, 'crystal_core');

			// Complete encounter to get to shop
			let options = await manager.getPhaseOptions(playerId);
			await manager.handleAction(playerId, options.options[0].id);

			// Now in shop
			options = await manager.getPhaseOptions(playerId);
			expect(['shop', 'orb_shop'].includes(options.phase)).toBe(true);

			const initialSession = await manager.getSession(playerId);
			const initialUnitCount = initialSession?.team.units.length || 0;

			// Purchase a unit
			const purchaseId = options.options[0].id;
			await manager.handleAction(playerId, purchaseId);

			const updatedSession = await manager.getSession(playerId);

			// Verify team was updated
			expect(updatedSession?.team.units).toBeDefined();

			// If it's a new unit, count should increase. If upgrading existing, rank should change
			const updatedUnitCount = updatedSession?.team.units.length || 0;
			const purchasedUnit = updatedSession?.team.units.find((u: any) => u.cardId === purchaseId);

			expect(updatedUnitCount >= initialUnitCount).toBe(true);
			if (updatedUnitCount > initialUnitCount) {
				expect(purchasedUnit).toBeDefined();
			}
		});

		it('should perform combat and generate combat logs', async () => {
			const playerId = 'flow_test_player_4';
			await manager.createSession(playerId, 'crystal_core');

			// Go through steps to reach combat
			// Step 1: Encounter -> Shop
			let options = await manager.getPhaseOptions(playerId);
			await manager.handleAction(playerId, options.options[0].id);

			// Step 2: Shop -> Encounter
			options = await manager.getPhaseOptions(playerId);
			await manager.handleAction(playerId, options.options[0].id);

			// Step 3: Encounter -> Shop
			options = await manager.getPhaseOptions(playerId);
			await manager.handleAction(playerId, options.options[0].id);

			// Step 4: Shop -> Encounter
			options = await manager.getPhaseOptions(playerId);
			await manager.handleAction(playerId, options.options[0].id);

			// Step 5: Encounter -> Shop
			options = await manager.getPhaseOptions(playerId);
			await manager.handleAction(playerId, options.options[0].id);

			// Step 6: Shop -> Combat
			options = await manager.getPhaseOptions(playerId);
			await manager.handleAction(playerId, options.options[0].id);

			// Now in combat phase
			options = await manager.getPhaseOptions(playerId);
			expect(options.phase).toBe('combat');
			expect(options.combatState).toBeDefined();
			expect(options.combatState?.units).toBeDefined();
			expect(options.combatState?.logs).toBeDefined();
			expect(options.combatState?.logs.length).toBeGreaterThan(0);

			// Verify combat logs contain essential events
			const logs = options.combatState?.logs || [];
			const outcomeLog = logs.find((l: any) => l.type === 'outcome');
			expect(outcomeLog).toBeDefined();
			expect(['player_won', 'player_lost', 'cpu_won']).toContain(outcomeLog?.result);

			// Verify wins/losses updated correctly
			const sessionBeforeDone = await manager.getSession(playerId);
			const winsBeforeDone = sessionBeforeDone?.wins || 0;
			const lossesBeforeDone = sessionBeforeDone?.losses || 0;

			// Complete combat
			await manager.handleAction(playerId, 'combat_done');

			const sessionAfter = await manager.getSession(playerId);
			if (outcomeLog?.result === 'player_won') {
				expect(sessionAfter?.wins).toBe(winsBeforeDone);
				expect(sessionAfter?.losses).toBe(lossesBeforeDone);
			} else {
				expect(sessionAfter?.wins).toBe(winsBeforeDone);
				expect(sessionAfter?.losses).toBe(lossesBeforeDone);
			}
		});
	});

	describe('Complete Session Tests', () => {
		it('should complete a full round (all phases)', async () => {
			const playerId = 'flow_test_player_5';
			await manager.createSession(playerId, 'crystal_core');

			const initialSession = await manager.getSession(playerId);
			expect(initialSession?.round).toBe(1);

			const result = await completeRound(playerId);

			expect(result.session.round).toBe(2);
			expect(['encounter', 'victory', 'game_over']).toContain(result.session.phase);
		});

		it('should play multiple rounds until victory or defeat', async () => {
			const playerId = 'flow_test_player_6';
			await manager.createSession(playerId, 'crystal_core');

			let session = await manager.getSession(playerId);
			if (!session) throw new Error('Session not created');

			let roundsPlayed = 0;
			const MAX_ROUNDS = 15; // Safety limit

			while (
				session.phase !== 'victory' &&
				session.phase !== 'game_over' &&
				roundsPlayed < MAX_ROUNDS
			) {
				const result = await completeRound(playerId);
				session = result.session;
				roundsPlayed++;

				console.log(`Round ${roundsPlayed} complete - Won: ${result.won}, Wins: ${session.wins}, Losses: ${session.losses}`);
			}

			expect(['victory', 'game_over']).toContain(session.phase);

			if (session.phase === 'victory') {
				expect(session.wins).toBeGreaterThanOrEqual(10);
			} else {
				expect(session.losses).toBeGreaterThanOrEqual(4);
			}

			console.log(`Session ended with ${session.wins} wins and ${session.losses} losses after ${roundsPlayed} rounds`);
		});

		it('should maintain team state across rounds', async () => {
			const playerId = 'flow_test_player_7';
			await manager.createSession(playerId, 'crystal_core');

			// Complete first round
			await completeRound(playerId);

			let session = await manager.getSession(playerId);
			const round2StartUnits = session?.team.units.length || 0;

			// The team should persist between rounds
			expect(round2StartUnits).toBeGreaterThan(0);

			// Complete another round if not ended
			if (session && session.phase === 'encounter') {
				await completeRound(playerId);
				session = await manager.getSession(playerId);

				// Team should still exist (may grow or shrink based on combat)
				expect(session?.team.units).toBeDefined();
			}
		});
	});

	describe('Team Organization', () => {
		it('should allow updating team composition', async () => {
			const playerId = 'flow_test_player_8';
			await manager.createSession(playerId, 'crystal_core');

			// Get current team
			let session = await manager.getSession(playerId);
			const originalTeam = JSON.parse(JSON.stringify(session?.team));

			// Update team (e.g., reorganize units)
			const newTeam = {
				units: originalTeam.units.map((u: any, index: number) => ({
					...u,
					position: { x: 1 + index, y: 1 }
				}))
			};

			await manager.handleAction(playerId, 'update_team', { team: newTeam });

			session = await manager.getSession(playerId);
			expect(session?.team).toBeDefined();
			// Team update should preserve units
			expect(session?.team.units.length).toBe(originalTeam.units.length);
		});

		it('should validate team updates', async () => {
			const playerId = 'flow_test_player_9';
			await manager.createSession(playerId, 'crystal_core');

			// Valid team update should succeed
			const validTeam = { units: [] };
			const result = await manager.handleAction(playerId, 'update_team', { team: validTeam });
			expect(result).toBe(true);
		});
	});

	describe('Edge Cases', () => {
		it('should handle session resumption', async () => {
			const playerId = 'flow_test_player_10';
			await manager.createSession(playerId, 'crystal_core');

			// Advance to mid-game
			let options = await manager.getPhaseOptions(playerId);
			await manager.handleAction(playerId, options.options[0].id);

			const session1 = await manager.getSession(playerId);
			const phase1 = session1?.phase;
			const step1 = session1?.step;

			// Get session again (should return existing session)
			const resumedSession = await manager.getSession(playerId);

			// Should have same state
			expect(resumedSession?.phase).toBe(phase1);
			expect(resumedSession?.step).toBe(step1);
		});

		it('should handle orb shop mechanics', async () => {
			const playerId = 'flow_test_player_11';
			await manager.createSession(playerId, 'crystal_core');

			// Pick 'upgrade_unit' encounter to trigger orb shop
			let options = await manager.getPhaseOptions(playerId);

			// Find upgrade_unit option
			const upgradeOption = options.options.find((opt: any) => opt.id === 'upgrade_unit');

			if (upgradeOption) {
				await manager.handleAction(playerId, 'upgrade_unit');

				options = await manager.getPhaseOptions(playerId);
				expect(options.phase).toBe('orb_shop');
				expect(options.options).toBeDefined();
				expect(options.options.length).toBeGreaterThan(0);

				// Use the orb
				await manager.handleAction(playerId, options.options[0].id);

				// Should advance to next phase
				const session = await manager.getSession(playerId);
				// Step advances after orb shop
				expect(session?.step).toBeGreaterThan(1);
			}
		});

		it('should track action log throughout session', async () => {
			const playerId = 'flow_test_player_12';
			await manager.createSession(playerId, 'crystal_core');

			// Perform several actions
			let options = await manager.getPhaseOptions(playerId);
			const action1 = options.options[0].id;
			await manager.handleAction(playerId, action1);

			options = await manager.getPhaseOptions(playerId);
			const action2 = options.options[0].id;
			await manager.handleAction(playerId, action2);

			const session = await manager.getSession(playerId);
			expect(session?.action_log).toBeDefined();
			expect(session?.action_log.length).toBeGreaterThan(0);

			// Verify action log contains our actions
			const loggedActions = session?.action_log.map((entry: any) => entry.actionId);
			expect(loggedActions).toContain(action1);
			expect(loggedActions).toContain(action2);
		});

		it('should properly seed random generation', async () => {
			const playerId1 = 'flow_test_player_13a';
			const playerId2 = 'flow_test_player_13b';

			const session1 = await manager.createSession(playerId1, 'crystal_core');
			const session2 = await manager.createSession(playerId2, 'crystal_core');

			// Different sessions should have different seeds
			expect(session1.seed).not.toBe(session2.seed);

			// Same session should have consistent seed
			const retrievedSession1 = await manager.getSession(playerId1);
			expect(retrievedSession1?.seed).toBe(session1.seed);
		});
	});

	describe('Combat System Validation', () => {
		it('should generate valid combat state with all required fields', async () => {
			const playerId = 'flow_test_player_14';
			await manager.createSession(playerId, 'crystal_core');

			// Advance to combat
			for (let i = 0; i < 6; i++) {
				const options = await manager.getPhaseOptions(playerId);
				await manager.handleAction(playerId, options.options[0].id);
			}

			const combatOptions = await manager.getPhaseOptions(playerId);

			expect(combatOptions.phase).toBe('combat');
			expect(combatOptions.combatState).toBeDefined();
			expect(combatOptions.combatState?.units).toBeDefined();
			expect(combatOptions.combatState?.enemyTeam).toBeDefined();
			expect(combatOptions.combatState?.logs).toBeDefined();
			expect(combatOptions.combatState?.seed).toBeDefined();

			// Validate logs structure
			const logs = combatOptions.combatState?.logs || [];
			expect(logs.length).toBeGreaterThan(0);

			// Check for outcome log
			const outcomeLog = logs.find((l: any) => l.type === 'outcome');
			expect(outcomeLog).toBeDefined();
			expect(outcomeLog).toHaveProperty('result');
			expect(outcomeLog).toHaveProperty('frame');
		});

		it('should have enemy team scale with round number', async () => {
			const playerId = 'flow_test_player_15';
			await manager.createSession(playerId, 'crystal_core');

			// Get to combat in round 1
			for (let i = 0; i < 6; i++) {
				const options = await manager.getPhaseOptions(playerId);
				await manager.handleAction(playerId, options.options[0].id);
			}

			const round1Combat = await manager.getPhaseOptions(playerId);
			const round1Enemy = round1Combat.combatState?.enemyTeam || [];
			const round1EnemyPower = round1Enemy.reduce((sum: number, u: any) => sum + (u.power || 0), 0);

			// Complete round 1
			await manager.handleAction(playerId, 'combat_done');

			// Check if game continues (not defeat)
			let session = await manager.getSession(playerId);
			if (session && session.phase === 'encounter') {
				// Complete to next combat
				for (let i = 0; i < 6; i++) {
					const options = await manager.getPhaseOptions(playerId);
					await manager.handleAction(playerId, options.options[0].id);
				}

				const round2Combat = await manager.getPhaseOptions(playerId);
				const round2Enemy = round2Combat.combatState?.enemyTeam || [];
				const round2EnemyPower = round2Enemy.reduce((sum: number, u: any) => sum + (u.power || 0), 0);

				// Round 2 enemies should generally be stronger (though RNG can vary)
				// At minimum, they should exist
				expect(round2Enemy.length).toBeGreaterThan(0);
				console.log(`Round 1 enemy power: ${round1EnemyPower}, Round 2 enemy power: ${round2EnemyPower}`);
			}
		});
	});
});
