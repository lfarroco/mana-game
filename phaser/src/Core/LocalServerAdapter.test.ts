import { LocalServerAdapter } from './LocalServerAdapter';
import * as GameLogic from './GameLogic';
import { SessionData } from './Types';

// Polyfill structuredClone for Jest environment
if (typeof global.structuredClone === 'undefined') {
	global.structuredClone = (obj: any) => JSON.parse(JSON.stringify(obj));
}

describe('LocalServerAdapter', () => {
	let adapter: LocalServerAdapter;
	const testPlayerId = 'test-player-1';
	const testCrystalId = 'crystal_core';

	beforeEach(() => {
		adapter = new LocalServerAdapter();
	});

	describe('createSession', () => {
		it('should create a new session with crystal', async () => {
			const session = await adapter.createSession(testPlayerId, testCrystalId);

			expect(session).toBeDefined();
			expect(session.player_id).toBe(testPlayerId);
			expect(session.phase).toBe('encounter');
			expect(session.round).toBe(1);
			expect(session.team.units.length).toBeGreaterThan(0);
			// Note: makeUnit may fall back to dummy_card if crystal_core doesn't exist in test env
			expect(session.team.units[0].isCore).toBe(true);
		});

		it('should create session with unique ID', async () => {
			const session1 = await adapter.createSession(testPlayerId, testCrystalId);
			const session2 = await adapter.createSession('test-player-2', testCrystalId);

			expect(session1.id).not.toBe(session2.id);
		});
	});

	describe('getSession', () => {
		it('should retrieve existing session', async () => {
			await adapter.createSession(testPlayerId, testCrystalId);
			const session = await adapter.getSession(testPlayerId);

			expect(session).toBeDefined();
			expect(session?.player_id).toBe(testPlayerId);
		});

		it('should return null for non-existent session', async () => {
			const session = await adapter.getSession('non-existent-player');
			expect(session).toBeNull();
		});
	});

	describe('getPhaseOptions', () => {
		it('should return encounter options for new session', async () => {
			await adapter.createSession(testPlayerId, testCrystalId);
			const options = await adapter.getPhaseOptions(testPlayerId);

			expect(options.phase).toBe('encounter');
			expect(options.round).toBe(1);
			expect(options.options.length).toBeGreaterThan(0);
		});

		it('should return shop options after encounter', async () => {
			await adapter.createSession(testPlayerId, testCrystalId);

			// Get initial options to find a valid encounter
			const initialOptions = await adapter.getPhaseOptions(testPlayerId);
			const encounterId = initialOptions.options[0].id;

			// Select an encounter
			await adapter.handleAction(testPlayerId, encounterId);

			const options = await adapter.getPhaseOptions(testPlayerId);
			expect(['shop', 'orb_shop'].includes(options.phase)).toBe(true);
			expect(options.options.length).toBeGreaterThan(0);
		});

		it('should throw error for non-existent session', async () => {
			await expect(adapter.getPhaseOptions('non-existent-player'))
				.rejects.toThrow();
		});
	});

	describe('handleAction', () => {
		it('should handle encounter selection', async () => {
			await adapter.createSession(testPlayerId, testCrystalId);

			// Get initial options to find a valid encounter
			const initialOptions = await adapter.getPhaseOptions(testPlayerId);
			const encounterId = initialOptions.options[0].id;

			const result = await adapter.handleAction(testPlayerId, encounterId);

			expect(result).toBe(true);

			const session = await adapter.getSession(testPlayerId);
			expect(session?.phase).toBe('orb_shop');
		});

		it('should handle buying a unit in shop', async () => {
			await adapter.createSession(testPlayerId, testCrystalId);
			await adapter.handleAction(testPlayerId, 'armory');

			// Get shop options to see what's available
			const options = await adapter.getPhaseOptions(testPlayerId);
			const firstUnit = options.options[0]?.id;

			if (firstUnit) {
				const result = await adapter.handleAction(testPlayerId, firstUnit);
				expect(result).toBe(true);
			}
		});

		it('should return false for non-existent session', async () => {
			const result = await adapter.handleAction('non-existent-player', 'some-action');
			expect(result).toBe(false);
		});
	});

	describe('game flow', () => {
		it('should progress through multiple phases', async () => {
			await adapter.createSession(testPlayerId, testCrystalId);

			// Start: encounter phase
			let options = await adapter.getPhaseOptions(testPlayerId);
			expect(options.phase).toBe('encounter');

			// Select encounter
			await adapter.handleAction(testPlayerId, options.options[0].id);

			// Should be in shop or orb_shop phase (depends on encounter chosen)
			options = await adapter.getPhaseOptions(testPlayerId);
			expect(['shop', 'orb_shop']).toContain(options.phase);
			const phaseAfterEncounter = options.phase;

			// Skip shop
			const skipAction = phaseAfterEncounter === 'shop' ? 'skip_shop' : 'skip_orb_shop';
			await adapter.handleAction(testPlayerId, skipAction);

			// Should progress to next phase
			options = await adapter.getPhaseOptions(testPlayerId);
			expect(options.phase).not.toBe(phaseAfterEncounter);
		});
	});

	describe('deterministic behavior', () => {
		it('should generate same options with same seed', () => {
			const seed = 'test-seed';
			const session1: SessionData = {
				id: 'test1',
				player_id: 'player-1',
				phase: 'encounter',
				round: 1,
				step: 1,
				seed,
				initial_seed: seed,
				action_log: [],
				wins: 0,
				losses: 0,
				team: { units: [] },
				current_options: null
			};
			const session2: SessionData = {
				id: 'test2',
				player_id: 'player-2',
				phase: 'encounter',
				round: 1,
				step: 1,
				seed,
				initial_seed: seed,
				action_log: [],
				wins: 0,
				losses: 0,
				team: { units: [] },
				current_options: null
			};

			const options1 = GameLogic.generateEncounterOptions(session1);
			const options2 = GameLogic.generateEncounterOptions(session2);

			expect(options1.options).toEqual(options2.options);
		});
	});
});
