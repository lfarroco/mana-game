import {
	buildSlideInProgram,
	buildSlideOutProgram,
	runShopUIProgram,
	ShopUIProgram,
} from './ShopUI.pure';

describe('ShopUI IO programs', () => {
	test('buildSlideInProgram returns expected instruction sequence', () => {
		const prog = buildSlideInProgram();
		expect(prog).toEqual([
			{ _tag: 'PlaySound', key: 'sfx_ui_modalwindow_swoosh_enter' },
			{ _tag: 'BringToTop', target: 'shopContainer' },
			{ _tag: 'TweenShopContainerToY', y: 0 },
			{ _tag: 'SetIsOpen', value: true },
		]);
	});

	test('buildSlideOutProgram returns expected instruction sequence', () => {
		const prog = buildSlideOutProgram();
		expect(prog).toEqual([
			{ _tag: 'PlaySound', key: 'sfx_ui_modalwindow_swoosh_exit' },
			{ _tag: 'TweenShopContainerToY', y: expect.any(Number) },
			{ _tag: 'SetIsOpen', value: false },
		]);
		// ensure the y is negative screen height; we cannot import constants without Phaser runtime here,
		// but we can assert it's negative to capture intent
		const tweenY = (prog[1] as any).y;
		expect(typeof tweenY).toBe('number');
		expect(tweenY).toBeLessThan(0);
	});

	test('runShopUIProgram calls env in order and awaits tween', async () => {
		const calls: string[] = [];
		const env = {
			playSound: (key: string) => calls.push(`sound:${key}`),
			bringShopContainerToTop: () => calls.push('top'),
			tweenShopContainerToY: async (y: number) => {
				calls.push(`tween:${y}`);
				await new Promise(r => setTimeout(r, 1));
			},
			setIsOpen: (v: boolean) => calls.push(`open:${v}`),
		};

		const program: ShopUIProgram = [
			{ _tag: 'PlaySound', key: 'a' },
			{ _tag: 'BringToTop', target: 'shopContainer' },
			{ _tag: 'TweenShopContainerToY', y: 10 },
			{ _tag: 'SetIsOpen', value: true },
		];

		await runShopUIProgram(program, env);

		expect(calls).toEqual([
			'sound:a',
			'top',
			'tween:10',
			'open:true',
		]);
	});
});
