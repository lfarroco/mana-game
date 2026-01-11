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
});
