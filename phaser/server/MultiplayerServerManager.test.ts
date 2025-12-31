import { MultiplayerServerManager } from './MultiplayerServerManager';

describe('MultiplayerServerManager', () => {
	let manager: MultiplayerServerManager;

	beforeEach(() => {
		// Reset singleton instance by accessing logical property if possible, 
		// or just accept we are testing a singleton. 
		// JavaScript private/static persistence makes resetting singletons hard without explicit support.
		// For this test, we'll just get the instance and treat it as stateful, or create a method to reset it if needed.
		// Since we can't easily reset a private static instance without adding code to the class,
		// we will assume fresh state for new IDs.
		manager = MultiplayerServerManager.getInstance();
	});

	it('should create a session for a new player', () => {
		const playerId = 'test_player_1';
		const session = manager.createSession(playerId);

		expect(session).toBeDefined();
		expect(session.id).toBe(playerId);
		expect(session.phase).toBe('encounter'); // Default start phase
		expect(session.round).toBe(1);
	});

	it('should retrieve an existing session', () => {
		const playerId = 'test_player_2';
		manager.createSession(playerId);
		const session = manager.getSession(playerId);

		expect(session).toBeDefined();
		expect(session?.id).toBe(playerId);
	});

	it('should return undefined for non-existent session', () => {
		const session = manager.getSession('non_existent_player');
		expect(session).toBeUndefined();
	});

	it('should get phase options for a session', () => {
		const playerId = 'test_player_3';
		manager.createSession(playerId);

		const options = manager.getPhaseOptions(playerId);

		expect(options.phase).toBe('encounter');
		expect(options.options.length).toBeGreaterThan(0);
		expect(options.options[0]).toHaveProperty('id');
	});

	it('should advance phase on action', () => {
		const playerId = 'test_player_4';
		manager.createSession(playerId);

		// Initial: encounter
		// Advance to Shop
		const result = manager.handleAction(playerId, 'upgrade_unit');
		expect(result).toBe(true);

		const session = manager.getSession(playerId);
		expect(session?.phase).toBe('shop');

		// Shop -> Combat
		manager.handleAction(playerId, 'card:archer');
		expect(session?.phase).toBe('combat');

		// Combat -> Encounter (Next Round)
		manager.handleAction(playerId, 'combat_result');
		expect(session?.phase).toBe('encounter');
		expect(session?.round).toBe(2);
	});
});
