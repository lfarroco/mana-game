/**
 * @file Tests for grant gold trait effect implementation
 */
import { grantGoldLogicPure } from './grantGold';

describe('grantGoldLogicPure', () => {
	const mockPlayerForceId = 'player-force';
	const mockEnemyForceId = 'enemy-force';

	it('should grant gold when source unit is from player force and amount > 0', () => {
		const result = grantGoldLogicPure(100, mockPlayerForceId, mockPlayerForceId);

		expect(result.shouldGrantGold).toBe(true);
		expect(result.popTextMessage).toBe('+100 Gold');
	});

	it('should not grant gold when amount is 0', () => {
		const result = grantGoldLogicPure(0, mockPlayerForceId, mockPlayerForceId);

		expect(result.shouldGrantGold).toBe(false);
		expect(result.popTextMessage).toBeUndefined();
	});

	it('should not grant gold when source unit is not from player force', () => {
		const result = grantGoldLogicPure(100, mockEnemyForceId, mockPlayerForceId);

		expect(result.shouldGrantGold).toBe(false);
		expect(result.popTextMessage).toBeUndefined();
	});

	it('should handle negative amounts correctly', () => {
		const result = grantGoldLogicPure(-50, mockPlayerForceId, mockPlayerForceId);

		expect(result.shouldGrantGold).toBe(true);
		expect(result.popTextMessage).toBe('+-50 Gold');
	});

	it('should handle large amounts correctly', () => {
		const result = grantGoldLogicPure(9999, mockPlayerForceId, mockPlayerForceId);

		expect(result.shouldGrantGold).toBe(true);
		expect(result.popTextMessage).toBe('+9999 Gold');
	});

	it('should not grant gold when both amount is 0 and force is enemy', () => {
		const result = grantGoldLogicPure(0, mockEnemyForceId, mockPlayerForceId);

		expect(result.shouldGrantGold).toBe(false);
		expect(result.popTextMessage).toBeUndefined();
	});
});
