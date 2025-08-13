import * as CombatStatsTracker from './CombatStatsTracker';
import { BattlegroundScene } from '../BattlegroundScene';
import { GameEvents } from '../../../constants/events';

// Mock BattlegroundScene
const mockScene = {
	state: {
		battleData: {
			units: [
				{
					id: 'unit1',
					name: 'Test Unit 1',
					force: 'player',
					power: 10
				},
				{
					id: 'unit2',
					name: 'Test Unit 2',
					force: 'cpu',
					power: 15
				}
			],
			forces: [
				{
					id: 'player',
					units: [{ id: 'unit1' }]
				},
				{
					id: 'cpu',
					units: [{ id: 'unit2' }]
				}
			]
		}
	},
	events: {
		on: jest.fn(),
		off: jest.fn(),
		emit: jest.fn()
	}
} as any as BattlegroundScene;

describe('CombatStatsTracker', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		CombatStatsTracker.reset(); // Reset singleton state between tests
	});

	describe('initialization', () => {
		it('should initialize stats for all units', () => {
			CombatStatsTracker.initialize(mockScene);

			const allStats = CombatStatsTracker.getAllStats();
			expect(allStats).toHaveLength(2);

			const unit1Stats = CombatStatsTracker.getUnitStats('unit1');
			expect(unit1Stats).toEqual({
				unitId: 'unit1',
				unitName: 'Test Unit 1',
				forceId: 'player',
				damageDealt: 0,
				poisonApplied: 0,
				healingDone: 0,
				regenApplied: 0,
				shieldGranted: 0,
				actionsPerformed: 0,
				timeAlive: 0
			});
		});

		it('should set up event listeners', () => {
			CombatStatsTracker.initialize(mockScene);

			expect(mockScene.events.on).toHaveBeenCalledWith(GameEvents.MORALE_UPDATED, expect.any(Function));
			expect(mockScene.events.on).toHaveBeenCalledWith(GameEvents.UNIT_MORALE_RESTORED, expect.any(Function));
			expect(mockScene.events.on).toHaveBeenCalledWith(GameEvents.UNIT_SHIELD_GAINED, expect.any(Function));
			expect(mockScene.events.on).toHaveBeenCalledWith(GameEvents.UNIT_ATTACK, expect.any(Function));
		});
	});

	describe('manual tracking', () => {
		beforeEach(() => {
			CombatStatsTracker.initialize(mockScene);
		});

		it('should track damage manually', () => {
			CombatStatsTracker.trackDamage('unit1', 25, 'normal');

			const stats = CombatStatsTracker.getUnitStats('unit1');
			expect(stats?.damageDealt).toBe(25);
			expect(stats?.poisonApplied).toBe(0);
		});

		it('should track poison damage manually', () => {
			CombatStatsTracker.trackDamage('unit1', 15, 'poison');

			const stats = CombatStatsTracker.getUnitStats('unit1');
			expect(stats?.damageDealt).toBe(0);
			expect(stats?.poisonApplied).toBe(15);
		});

		it('should track healing manually', () => {
			CombatStatsTracker.trackHealing('unit1', 20, 'direct');

			const stats = CombatStatsTracker.getUnitStats('unit1');
			expect(stats?.healingDone).toBe(20);
			expect(stats?.regenApplied).toBe(0);
		});

		it('should track regen manually', () => {
			CombatStatsTracker.trackHealing('unit1', 12, 'regen');

			const stats = CombatStatsTracker.getUnitStats('unit1');
			expect(stats?.healingDone).toBe(0);
			expect(stats?.regenApplied).toBe(12);
		});

		it('should track shield manually', () => {
			CombatStatsTracker.trackShield('unit1', 30);

			const stats = CombatStatsTracker.getUnitStats('unit1');
			expect(stats?.shieldGranted).toBe(30);
		});
	});

	describe('aggregation', () => {
		beforeEach(() => {
			CombatStatsTracker.initialize(mockScene);
		});

		it('should aggregate force stats correctly', () => {
			// Set up some stats for player units
			CombatStatsTracker.trackDamage('unit1', 30, 'normal');
			CombatStatsTracker.trackHealing('unit1', 20, 'direct');
			CombatStatsTracker.trackShield('unit1', 15);

			const forceStats = CombatStatsTracker.getAggregatedForceStats('player');
			expect(forceStats).toEqual({
				forceId: 'player',
				damageDealt: 30,
				poisonApplied: 0,
				healingDone: 20,
				regenApplied: 0,
				shieldGranted: 15,
				actionsPerformed: 0,
				timeAlive: 0
			});
		});

		it('should filter stats by force correctly', () => {
			CombatStatsTracker.trackDamage('unit1', 30, 'normal');
			CombatStatsTracker.trackDamage('unit2', 25, 'normal');

			const playerStats = CombatStatsTracker.getForceStats('player');
			const cpuStats = CombatStatsTracker.getForceStats('cpu');

			expect(playerStats).toHaveLength(1);
			expect(cpuStats).toHaveLength(1);
			expect(playerStats[0].damageDealt).toBe(30);
			expect(cpuStats[0].damageDealt).toBe(25);
		});
	});

	describe('time tracking', () => {
		beforeEach(() => {
			CombatStatsTracker.initialize(mockScene);
		});

		it('should update time alive for active units', () => {
			CombatStatsTracker.updateTimeAlive(1000); // 1 second

			const stats = CombatStatsTracker.getUnitStats('unit1');
			expect(stats?.timeAlive).toBe(1000);
		});

		it('should accumulate time alive over multiple updates', () => {
			CombatStatsTracker.updateTimeAlive(500);
			CombatStatsTracker.updateTimeAlive(300);
			CombatStatsTracker.updateTimeAlive(200);

			const stats = CombatStatsTracker.getUnitStats('unit1');
			expect(stats?.timeAlive).toBe(1000);
		});
	});

	describe('lifecycle', () => {
		it('should stop correctly and finalize time alive', () => {
			CombatStatsTracker.initialize(mockScene);

			// Mock Date.now to control time
			const mockNow = jest.spyOn(Date, 'now');
			mockNow.mockReturnValueOnce(1000); // Start time
			CombatStatsTracker.initialize(mockScene); // Re-initialize to set start time

			mockNow.mockReturnValueOnce(3000); // End time (2 seconds later)
			CombatStatsTracker.stop();

			expect(mockScene.events.off).toHaveBeenCalledTimes(5); // Should remove all event listeners

			const stats = CombatStatsTracker.getUnitStats('unit1');
			expect(stats?.timeAlive).toBe(2000); // Should be finalized to combat duration

			mockNow.mockRestore();
		});

		it('should ignore events when not active', () => {
			// Don't initialize, so tracker is not active
			CombatStatsTracker.trackDamage('unit1', 25, 'normal');

			const stats = CombatStatsTracker.getUnitStats('unit1');
			expect(stats).toBeUndefined();
		});
	});

	describe('configuration', () => {
		it('should return correct configuration', () => {
			CombatStatsTracker.initialize(mockScene);

			const config = CombatStatsTracker.getConfig();
			expect(config.isActive).toBe(true);
			expect(config.trackedUnits).toBe(2);
			expect(typeof config.combatDuration).toBe('number');
		});
	});
});