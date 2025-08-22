// Pure IO instruction layer for ShopUI (no Phaser imports)
import * as c from "../../../../constants/constants";

export type ShopUIIO =
	| { _tag: 'PlaySound'; key: string }
	| { _tag: 'BringToTop'; target: 'shopContainer' }
	| { _tag: 'TweenShopContainerToY'; y: number }
	| { _tag: 'SetIsOpen'; value: boolean };

export type ShopUIProgram = ShopUIIO[];

export const buildSlideInProgram = (): ShopUIProgram => ([
	{ _tag: 'PlaySound', key: 'sfx_ui_modalwindow_swoosh_enter' },
	{ _tag: 'BringToTop', target: 'shopContainer' },
	{ _tag: 'TweenShopContainerToY', y: 0 },
	{ _tag: 'SetIsOpen', value: true },
]);

export const buildSlideOutProgram = (): ShopUIProgram => ([
	{ _tag: 'PlaySound', key: 'sfx_ui_modalwindow_swoosh_exit' },
	{ _tag: 'TweenShopContainerToY', y: c.SCREEN_HEIGHT * -1 },
	{ _tag: 'SetIsOpen', value: false },
]);

export type ShopUIEnv = {
	playSound: (key: string) => void,
	bringShopContainerToTop: () => void,
	tweenShopContainerToY: (y: number) => Promise<void>,
	setIsOpen: (value: boolean) => void,
};

export async function runShopUIProgram(program: ShopUIProgram, env: ShopUIEnv): Promise<void> {
	for (const instr of program) {
		switch (instr._tag) {
			case 'PlaySound':
				env.playSound(instr.key);
				break;
			case 'BringToTop':
				env.bringShopContainerToTop();
				break;
			case 'TweenShopContainerToY':
				await env.tweenShopContainerToY(instr.y);
				break;
			case 'SetIsOpen':
				env.setIsOpen(instr.value);
				break;
		}
	}
}
