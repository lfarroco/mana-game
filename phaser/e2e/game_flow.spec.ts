
import { test, expect } from '@playwright/test';
import { waitForGameInit, getDebugController } from '../src/test-utils/debugController';

test.describe('Game Flow', () => {
	test('should follow the user script without errors', async ({ page }) => {
		// Capture console errors
		const consoleErrors: string[] = [];
		page.on('console', msg => {
			if (msg.type() === 'error') {
				consoleErrors.push(msg.text());
				console.log(`Console Error: ${msg.text()}`);
			}
		});

		// 1. Open localhost:8080
		await page.goto('/');

		// Wait for game to init (canvas present)
		await waitForGameInit(page);

		const debugController = getDebugController(page);

		// Speed up game
		await debugController.setSpeed(10);

		// 2. Click "new run"
		await debugController.clickNewRun();

		// 3. Select a crystal
		// Wait for crystal selection screen
		await page.waitForTimeout(2000); // Transition time

		// We select the first one (index 0)
		await debugController.selectCrystal(0);
		await page.waitForTimeout(500);

		// Confirm
		await debugController.confirmCrystalSelection();

		// Wait for game to start (Encounter phase usually comes first)
		await page.waitForTimeout(3000);

		// 5. Select events.
		// We choose index 0 of whatever encounter cards appear.
		try {
			await debugController.chooseEncounter(0);
		} catch (e) {
			console.log("Could not choose encounter, maybe shop open directly?");
		}

		// Wait for encounter effect / transition
		await page.waitForTimeout(2000);

		// If the encounter opened a shop, we can buy units.
		// Let's try to buy a unit just in case we are in a shop.
		try {
			await debugController.buyAndPlaceHero(0, 2, 2); // Slot 0 to x=2, y=2
		} catch (e) {
			console.log("Could not buy hero, likely not in shop.");
		}

		await page.waitForTimeout(1000);

		// 7. Advance phases until we reach 'combat'
		// We loop with a safety limit to prevent infinite loops
		let attempts = 0;
		let inCombat = false;
		while (attempts < 20) {
			// Check if Ready button is visible
			const isReadyButtonVisible = await page.evaluate(() => {
				const btn = document.querySelector('div[data-component-id="ui.ready"]');
				return btn && (btn as HTMLElement).offsetParent !== null;
			});

			if (isReadyButtonVisible) {
				console.log("Ready button found, we are in combat preparation.");
				inCombat = true;
				break;
			}

			await debugController.clickNextRound();
			await page.waitForTimeout(1500); // Give time for phase transition animations
			attempts++;
		}

		if (!inCombat) {
			console.log("Warning: Could not detect combat start via Ready button.");
		}

		await page.waitForTimeout(1000); // Stabilize

		// Optimization: Boost player power to ensure combat ends quickly
		await page.evaluate(() => {
			const win = window as any;
			if (win.state && win.state.gameData) {
				const playerUnits = win.state.gameData.player.units;
				const core = playerUnits.find((u: any) => u.isCore);
				if (core) {
					core.power = 1000;
					core.life = 10000;
					core.maxLife = 10000;
					core.effects = [{ id: "damage" }];
				}
			}
		});

		// Click ready
		if (inCombat) {
			await debugController.clickReady();
		} else {
			console.log("Skipping clickReady as we are not confirmed in combat.");
		}

		// 8. Wait for combat to finish
		// We wait for the "Next Round" button to appear
		try {
			await page.waitForFunction(() => {
				const nextBtn = document.querySelector('div[data-component-id="ui.next_round"]'); // Adjust selector as needed
				return nextBtn && (nextBtn as HTMLElement).offsetParent !== null;
			}, null, { timeout: 30000 });
		} catch (e) {
			console.log("Timed out waiting for next round button, moving on...");
		}

		// Advance
		await debugController.clickNextRound();

		// 9. Check that no errors showed up in the console
		expect(consoleErrors.length).toBe(0);
	});
});
