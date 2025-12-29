import { test, expect } from '@playwright/test';
import { waitForGameInit, getDebugController } from '../src/test-utils/debugController';

test.describe('Settings Flow', () => {
	test('should open settings and return to title', async ({ page }) => {
		page.on('console', msg => console.log(`Browser Console: ${msg.text()}`));

		// 1. Open game
		await page.goto('/', { timeout: 60000 });
		await waitForGameInit(page);

		const debugController = getDebugController(page);

		// 2. Click "OPTIONS"
		await page.waitForTimeout(2000); // Wait for title to animate in

		// Inspect scene graph directly
		await page.evaluate(() => {
			const game = (window as any).game;
			const allScenes = game.scene.getScenes(false);
			const reportAll = allScenes.map((s: any) => {
				return `Scene: ${s.scene.key}, Status: ${s.sys.settings.status}, Active: ${s.sys.settings.active}, Visible: ${s.sys.settings.visible}`;
			}).join('\n');
			console.log(`Debug Report All Scenes:\n${reportAll}`);

			const activeScenes = game.scene.getScenes(true);
			const report = activeScenes.map((s: any) => {
				return `Scene: ${s.scene.key}, Children: ${s.children.list.length}, DisplayList: ${s.sys.displayList?.list?.length}`;
			}).join('\n');

			const scene = activeScenes.find((s: any) => s.scene.key === 'TitleScene');
			if (scene) {
				const dump = (list: any[], indent: string) => {
					return list.map(c => {
						let str = `${indent}${c.type}`;
						if (c.text) str += ` text="${c.text}"`;
						if (c.list) str += `\n${dump(c.list, indent + '  ')}`;
						return str;
					}).join('\n');
				};
				// Log to console so we can see it
				console.log(`DEBUG_DUMP:\n${dump(scene.children.list, '')}`);

				// Also throw it so it appears in error if we want
				if (scene.children.list.length === 0) {
					throw new Error(`TitleScene is empty! Report: ${report}`);
				}
			} else {
				console.log(`Debug Report Active Scenes: ${report}`);
			}
		});

		const res1 = await debugController.clickButton("OPTIONS");
		console.log(`Click Options Result: ${res1}`);
		if (res1.startsWith("Error")) throw new Error(res1);

		// 3. Verify Submenu appears (Settings, Stats, Credits, Back)
		await page.waitForTimeout(1000); // Animation

		// 4. Click "SETTINGS"
		const res2 = await debugController.clickButton("SETTINGS");
		console.log(`Click Settings Result: ${res2}`);
		if (res2.startsWith("Error")) throw new Error(res2);

		// 5. Verify OptionsScene is active
		await page.waitForFunction(() => {
			return window.debugController.getCurrentSceneName() === 'OptionsScene';
		});

		// 6. Click "BACK" (in OptionsScene)
		await page.waitForTimeout(500);
		const res3 = await debugController.clickButton("BACK");
		console.log(`Click Back Result: ${res3}`);
		if (res3.startsWith("Error")) throw new Error(res3);

		// 7. Verify return to TitleScene
		await page.waitForFunction(() => {
			return window.debugController.getCurrentSceneName() === 'TitleScene';
		});
	});
});
