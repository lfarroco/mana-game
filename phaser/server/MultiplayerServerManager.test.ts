import { MultiplayerServerManager } from './MultiplayerServerManager';

describe('MultiplayerServerManager', () => {
	let manager: MultiplayerServerManager;

	beforeEach(() => {
		manager = MultiplayerServerManager.getInstance();
	});

	it('should create a session for a new player', async () => {
		const playerId = 'test_player_1';
		const session = await manager.createSession(playerId);

		expect(session).toBeDefined();
		expect(session.player_id).toBe(playerId);
		expect(session.phase).toBe('encounter'); // Default start phase
		expect(session.round).toBe(1);
	});

	it('should retrieve an existing session', async () => {
		const playerId = 'test_player_2';
		await manager.createSession(playerId);
		const session = await manager.getSession(playerId);

		expect(session).toBeDefined();
		expect(session?.player_id).toBe(playerId);
	});

	it('should return undefined for non-existent session', async () => {
		const session = await manager.getSession('non_existent_player');
		expect(session).toBeUndefined();
	});

	it('should get phase options for a session', async () => {
		const playerId = 'test_player_3';
		await manager.createSession(playerId);

		const options = await manager.getPhaseOptions(playerId);

		expect(options.phase).toBe('encounter');
		expect(options.options.length).toBeGreaterThan(0);
		expect(options.options[0]).toHaveProperty('id');
	});

	it('should advance phase on action', async () => {
		const playerId = 'test_player_4';
		await manager.createSession(playerId);

		// Initial: encounter -> Shop (step 1 -> 2)
		const result = await manager.handleAction(playerId, 'upgrade_unit');
		expect(result).toBe(true);

		let session = await manager.getSession(playerId);
		expect(session?.phase).toBe('shop');
		expect(session?.step).toBe(2);

		// Shop -> Encounter (Step 3)
		await manager.handleAction(playerId, 'card:archer');
		session = await manager.getSession(playerId);
		expect(session?.phase).toBe('encounter');
		expect(session?.step).toBe(3);

		// Encounter -> Combat
		await manager.handleAction(playerId, 'combat_result');
		session = await manager.getSession(playerId);
		expect(session?.phase).toBe('combat');

		// Combat -> Encounter (Next Round)
		await manager.handleAction(playerId, 'combat_result');
		session = await manager.getSession(playerId);
		expect(session?.phase).toBe('encounter');
		expect(session?.round).toBe(2);
	});
});
