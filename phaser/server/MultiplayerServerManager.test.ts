/**
 * @jest-environment node
 */
import { MultiplayerServerManager } from './MultiplayerServerManager';
import { registerCollection } from '../src/Models/Entities/Card';
import { BASE_COLLECTION_DATA } from '../src/Data/BaseCollection';

jest.mock('../src/i18n/i18n', () => ({
	t: (key: string) => key,
	getName: (key: string) => key,
	initialize: () => { },
	setLocale: () => { },
	getCurrentLocale: () => 'en',
	getAvailableLocales: () => ['en'],
	getNativeName: () => 'English',
}));

describe('MultiplayerServerManager', () => {
	let manager: MultiplayerServerManager;

	beforeAll(() => {
		registerCollection(BASE_COLLECTION_DATA);
	});

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
		await manager.getPhaseOptions(playerId);
		const result = await manager.handleAction(playerId, 'upgrade_unit');
		expect(result).toBe(true);

		let session = await manager.getSession(playerId);
		expect(session?.phase).toBe('shop');
		expect(session?.step).toBe(2);

		// Shop -> Encounter (Step 3)
		await manager.getPhaseOptions(playerId);
		// Need valid shop option
		// In previous test run we saw picking valid options is needed.
		// For this test we might mock it or just pick first one.
		const shopOpts = await manager.getPhaseOptions(playerId);
		const shopAction = shopOpts.options[0].id;
		await manager.handleAction(playerId, shopAction);
		session = await manager.getSession(playerId);
		expect(session?.phase).toBe('encounter');
		expect(session?.step).toBe(3);

		// Encounter -> Combat
		await manager.getPhaseOptions(playerId);
		// armory is valid encounter option
		await manager.handleAction(playerId, 'armory'); // Step 3->4 (Shop)

		await manager.getPhaseOptions(playerId);
		const shopOpts2 = await manager.getPhaseOptions(playerId);
		const shopAction2 = shopOpts2.options[0].id;
		// Step 4 -> Combat
		await manager.handleAction(playerId, shopAction2);

		session = await manager.getSession(playerId);
		expect(session?.phase).toBe('combat');

		// Combat -> Encounter (Next Round)
		await manager.getPhaseOptions(playerId);
		await manager.handleAction(playerId, 'combat_done');
		session = await manager.getSession(playerId);
		expect(session?.phase).toBe('encounter');
		expect(session?.round).toBe(2);
	});
	it('should generate combat logs and ensure combat runs', async () => {
		const playerId = 'test_player_final_fix';
		await manager.createSession(playerId);

		// Step 1: Encounter -> Shop
		await manager.getPhaseOptions(playerId);
		// upgrade_unit is index 0
		await manager.handleAction(playerId, 'upgrade_unit');

		let session = await manager.getSession(playerId);
		expect(session?.phase).toBe('shop');

		// Step 2: Shop -> Encounter
		let opts = await manager.getPhaseOptions(playerId);
		if (opts.options.length === 0) throw new Error("Shop options empty");
		if (opts.options.length === 0) throw new Error("Shop options empty");

		// Verify Team Persistence
		const dummyTeam = { units: [{ id: "persistent_unit", cardId: "knight", isCore: false, force: "player" }] };
		await manager.handleAction(playerId, opts.options[0].id, { team: dummyTeam });

		session = await manager.getSession(playerId);
		expect(session?.phase).toBe('encounter');
		// Check if team was persisted
		expect(session?.team).toBeDefined();
		expect((session?.team as any).units).toBeDefined();
		expect((session?.team as any).units[0].id).toBe("persistent_unit");

		session = await manager.getSession(playerId);
		expect(session?.phase).toBe('encounter');

		// Step 3: Encounter -> Shop (Step 4)
		await manager.getPhaseOptions(playerId);
		// armory is index 1
		await manager.handleAction(playerId, 'armory');

		session = await manager.getSession(playerId);
		expect(session?.phase).toBe('shop');

		// Step 4: Shop -> Combat
		opts = await manager.getPhaseOptions(playerId);
		if (opts.options.length === 0) throw new Error("Shop 2 options empty");
		await manager.handleAction(playerId, opts.options[0].id, { team: { units: [] } });

		const options = await manager.getPhaseOptions(playerId);
		expect(options.phase).toBe('combat');
		expect(options.combatState).toBeDefined();
		expect(options.combatState?.units).toBeDefined();
		expect(options.combatState?.units.length).toBeGreaterThan(0);
		expect(options.combatState?.logs).toBeDefined();
		expect(options.combatState?.logs.length).toBeGreaterThan(0);

		const outcomeLog = options.combatState?.logs.find((l: any) => l.type === 'outcome');
		expect(outcomeLog).toBeDefined();
		expect(outcomeLog.frame).toBeGreaterThan(0);
	});
});
