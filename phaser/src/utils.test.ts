import { runPromisesInOrder, pickRandom, pickOne, breakLines, follows, parseTable } from './utils';

describe('utils.ts', () => {
	describe('runPromisesInOrder', () => {
		it('runs promise functions in order', async () => {
			const order: number[] = [];
			const funcs = [
				() => Promise.resolve(order.push(1)),
				() => Promise.resolve(order.push(2)),
				() => Promise.resolve(order.push(3)),
			];
			await runPromisesInOrder(funcs);
			expect(order).toEqual([1, 2, 3]);
		});
	});

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

	describe('breakLines', () => {
		it('breaks text into lines fitting width', () => {
			const text = 'The quick brown fox jumps over the lazy dog';
			const lines = breakLines(text, 10);
			lines.forEach(line => expect(line.length).toBeLessThanOrEqual(10 + 1)); // +1 for possible space
			expect(lines.join(' ')).toContain('quick brown fox');
		});
	});

	describe('follows', () => {
		it('makes object a follow b on update and stops on destroy', () => {
			const events: Record<string, Function[]> = {};
			const a = { x: 0, y: 0, scene: { on: jest.fn((e: string, fn: () => void) => { (events[e] ||= []).push(fn); }), off: jest.fn((e: string, fn: () => void) => { events[e] = (events[e] || []).filter(f => f !== fn); }) } };
			const b = { x: 5, y: 7, on: jest.fn((e: string, fn: () => void) => { if (e === 'destroy') b._destroy = fn; }) } as any;
			follows(a, b);
			events['update'].forEach(fn => fn());
			expect(a.x).toBe(5);
			expect(a.y).toBe(7);
			b.x = 9; b.y = 11;
			events['update'].forEach(fn => fn());
			expect(a.x).toBe(9);
			expect(a.y).toBe(11);
			b._destroy();
			b.x = 1; b.y = 2;
			if (events['update']) events['update'].forEach(fn => fn());
			expect(a.x).toBe(9);
			expect(a.y).toBe(11);
		});
	});

	describe('parseTable', () => {
		it('parses a markdown table string', () => {
			const table = `Name | Age\n--- | ---\nAlice | 30\nBob | 25`;
			const data = parseTable(table);
			expect(data).toEqual([
				{ Name: 'Alice', Age: '30' },
				{ Name: 'Bob', Age: '25' },
			]);
		});
	});
});
