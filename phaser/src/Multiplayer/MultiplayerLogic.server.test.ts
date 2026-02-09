import { MultiplayerLogic } from './MultiplayerLogic';

describe('MultiplayerLogic Server Compatibility', () => {
	test('should generate initial session without browser APIs', () => {
		const session = MultiplayerLogic.createInitialSession('test_player', 'mana_crystal');
		expect(session).toBeDefined();
		expect(session.team.units.length).toBeGreaterThan(0);
	});

	test('should generate shop options without StatsStore', () => {
		const session = MultiplayerLogic.createInitialSession('test_player');
		// Mock session to be at shop step
		session.step = 2; // Step 2 is Shop (Upgrade Unit -> Orb Shop, or other -> Shop)
		// Previous step 1 was Encounter
		session.action_log = [{ round: 1, step: 1, phase: 'encounter', actionId: 'gold_shop' }];

		const result = MultiplayerLogic.generateShopOptions(session, undefined);
		expect(result.options).toBeDefined();
		expect(result.options.length).toBeGreaterThan(0);
	});

	test('should simulate combat without browser APIs', () => {
		// Mock session with a team
		const session = MultiplayerLogic.createInitialSession('test_player', 'mana_crystal');
		session.phase = 'combat';

		const result = MultiplayerLogic.simulateCombat(session);
		expect(result).toBeDefined();
		expect(result.logs).toBeDefined();
		expect(result.finalState).toBeDefined();
	});

	test('should transition from Encounter to Shop', () => {
		const session = MultiplayerLogic.createInitialSession('test_player', 'mana_crystal');
		session.step = 1; // Encounter

		// Get a valid encounter action from the current options
		const actionId = session.current_options?.[0]?.id || 'armory';

		const { session: nextSession } = MultiplayerLogic.transitionToNextState(session, actionId, {});
		expect(nextSession.step).toBe(2);
		expect(nextSession.phase).toBe('shop');
		expect(nextSession.current_options).toBeDefined();
	});

	test('should transition from Shop to Encounter', () => {
		const session = MultiplayerLogic.createInitialSession('test_player', 'mana_crystal');
		session.step = 2; // Shop
		session.phase = 'shop';
		// Mock that we came from a shop action
		session.current_options = [{ id: 'some_unit' }];

		const { session: nextSession } = MultiplayerLogic.transitionToNextState(session, 'some_unit', {});
		expect(nextSession.step).toBe(3);
		expect(nextSession.phase).toBe('encounter');
		expect(nextSession.current_options).toBeDefined();
	});

	test('should transition to Combat at Step 7', () => {
		const session = MultiplayerLogic.createInitialSession('test_player', 'mana_crystal');
		session.step = 3; // Shop before Combat (last encounter of round 1)
		session.phase = 'shop';
		session.current_options = [{ id: 'some_unit' }]; // Mock shop options

		const { session: nextSession, combatResult } = MultiplayerLogic.transitionToNextState(session, 'some_unit', {});
		expect(nextSession.step).toBe(4);
		expect(nextSession.phase).toBe('combat');
		expect(nextSession.current_options).toBeDefined();
		expect(combatResult).toBeDefined(); // Should have simulated combat
	});

	test('should validate and apply valid team position updates', () => {
		const session = MultiplayerLogic.createInitialSession('test_player', 'mana_crystal');
		const originalTeam = JSON.parse(JSON.stringify(session.team));

		// Move unit slightly
		const newTeam = JSON.parse(JSON.stringify(originalTeam));
		newTeam.units[0].position = { x: 5, y: 5 };

		const result = MultiplayerLogic.validateAndApplyTeamUpdate(session, newTeam);
		expect(result.valid).toBe(true);
		expect(result.team.units[0].position).toEqual({ x: 5, y: 5 });
		expect(result.team.units[0].id).toBe(originalTeam.units[0].id);
	});

	test('should reject team update with added units', () => {
		const session = MultiplayerLogic.createInitialSession('test_player', 'mana_crystal');
		const newTeam = JSON.parse(JSON.stringify(session.team));

		// Add a fake unit
		newTeam.units.push({ id: 'fake_unit', cardId: 'dragon', rank: 3, position: { x: 0, y: 0 } });

		const result = MultiplayerLogic.validateAndApplyTeamUpdate(session, newTeam);
		expect(result.valid).toBe(false);
	});

	test('should reject team update with modified stats', () => {
		const session = MultiplayerLogic.createInitialSession('test_player', 'mana_crystal');
		const newTeam = JSON.parse(JSON.stringify(session.team));

		// Try to upgrade rank
		newTeam.units[0].rank += 1;

		const result = MultiplayerLogic.validateAndApplyTeamUpdate(session, newTeam);
		expect(result.valid).toBe(false);
	});
});
