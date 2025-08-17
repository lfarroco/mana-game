import { pickRandom, pickOne } from './utils';

describe('utils.ts', () => {
	describe('pickRandom', () => {
		it('picks n random elements from array', () => {
			const arr = [1, 2, 3, 4, 5];
			const picked = pickRandom(arr, 3);
			expect(picked).toHaveLength(3);
			picked.forEach(v => expect(arr).toContain(v));
		});
	});

	describe('pickOne', () => {
		it('picks one element from array', () => {
			const arr = ['a', 'b', 'c'];
			const picked = pickOne(arr);
			expect(arr).toContain(picked);
		});
	});
});
