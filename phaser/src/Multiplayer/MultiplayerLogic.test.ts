import { MultiplayerLogic } from './MultiplayerLogic';
import { FORCE_ID_CPU, FORCE_ID_PLAYER } from '../Scenes/Battleground/ServerConstants';

// Polyfill structuredClone for Jest environment
if (typeof global.structuredClone === 'undefined') {
	global.structuredClone = (obj: any) => JSON.parse(JSON.stringify(obj));
}

describe('MultiplayerLogic', () => {
	describe('generateEnemyTeamForRound', () => {
		it('should generate units with CPU force', () => {
			const round = 1;
			const wins = 0;
			const units = MultiplayerLogic.generateEnemyTeamForRound(round, wins);

			expect(units.length).toBeGreaterThan(0);

			units.forEach(unit => {
				expect(unit.force).toBe(FORCE_ID_CPU);
				expect(unit.force).not.toBe(FORCE_ID_PLAYER);
			});
		});
	});

	describe('generateNextSeed', () => {
		it('should generate deterministic seeds', () => {
			const seed1 = MultiplayerLogic.generateNextSeed('abc', 'action1');
			const seed2 = MultiplayerLogic.generateNextSeed('abc', 'action1');
			expect(seed1).toBe(seed2);
		});
	});

	describe('resolveAction', () => {
		it('should upgrade unit with apply_orb', () => {
			const session: any = {
				team: {
					units: [{ id: 'unit_1', rank: 1, maxLife: 100, power: 10 }]
				},
				step: 1
			};
			const payload = { orbId: 'upgrade_orb', targetUnitId: 'unit_1' };
			const result = MultiplayerLogic.resolveAction(session, 'apply_orb', payload);

			expect(result.updates).toBeDefined();
			expect(result.updates?.length).toBeGreaterThan(0);

			const unit = result.team.units.find((u: any) => u.id === 'unit_1');
			expect(unit.rank).toBe(2);
			expect(unit.maxLife).toBeGreaterThan(100);
		});

		it('should handle missing unit gracefully', () => {
			const session: any = {
				team: { units: [] },
				step: 1
			};
			const payload = { orbId: 'upgrade_orb', targetUnitId: 'unit_1' };
			const result = MultiplayerLogic.resolveAction(session, 'apply_orb', payload);

			expect(result.updates).toEqual([]);
		});
	});
});
