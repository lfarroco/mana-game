
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

		// 1. Open localhost:8080 (handled by baseURL in config usually, but explicit here)
		await page.goto('/');

		// Wait for game to init (canvas present)
		await waitForGameInit(page);

		const debugController = getDebugController(page);

		// Speed up game
		await debugController.setSpeed(10);

		// 2. Click "new run"
		await debugController.clickNewRun();

		// Give time for transition
		await page.waitForTimeout(2000);

		// 3. Select a crystal
		// We select the first one (index 0)
		await debugController.selectCrystal(0);
		await page.waitForTimeout(500);

		// Confirm
		await debugController.confirmCrystalSelection();

		// Wait for game to start (Encounter phase usually comes first)
		await page.waitForTimeout(3000);

		// 4. Select units to add to the team?
		// Note: The game starts with an Encounter. If we don't buy units now, we might die?
		// But "select units" implies we have a shop.
		// Let's try to pass the first Encounter. 
		// 5. Select events.
		// We choose index 0 of whatever encounter cards appear.
		await debugController.chooseEncounter(0);

		// Wait for encounter effect / transition
		await page.waitForTimeout(2000);

		// If the encounter opened a shop, we can buy units.
		// Let's try to buy a unit just in case we are in a shop.
		// If not in shop, this might log an error or do nothing.
		// The user script says "select units" then "select events".
		// Maybe we should try to buy BEFORE encounter? (Only if Shop phase starts first, which we found unlikely).
		// Let's try to buy AFTER encounter (maybe it was a shop encounter).
		await debugController.buyAndPlaceHero(0, 2, 2); // Slot 0 to x=2, y=2

		await page.waitForTimeout(1000);

		// 7. Advance phases until we reach 'combat'
		// We loop with a safety limit to prevent infinite loops
		let attempts = 0;
		while (attempts < 10) {
			const phase = await page.evaluate(() => window.state.currentState.gameData.hour);
			const phaseName = await page.evaluate((h) => {
				const predefined = ["encounter", "encounter", "encounter", "combat", "upgrade_core"]; // simplified check from PhaseManager logic or just check UI
				// Better: check global state phase directly if accessible, or just check if ready button exists
				// For now let's just click next round until we see the Ready button
				const readyBtn = document.querySelector('div[data-component-id="ui.ready"]'); // Hypothetical selector
				// Actually debugController.clickReady() handles the click, but we want to know if we SHOULD click it.
				// Let's rely on checking if we are in combat.
				// We can check `window.state.currentState` logic for phase, but let's just use debugController to get phase if possible, or just clickNextRound blindly a few times?

				// Let's use the explicit phase logic we saw in PhaseManager:
				// 0,1,2 = encounter, 3 = combat.
				return h;
			}, phase);

			// We know hour starts at 0.
			// 0: Encounter
			// 1: Encounter
			// 2: Encounter
			// 3: Combat

			const currentHour = await page.evaluate(() => window.state.currentState.gameData.hour);
			console.log(`Current Hour: ${currentHour}`);

			if (currentHour === 3) {
				break;
			}

			await debugController.clickNextRound();
			await page.waitForTimeout(1000);
			attempts++;
		}

		await page.waitForTimeout(2000); // Wait for combat setup

		// Now we should be in Combat and Ready button should be active/visible (even if we can't see it in DOM easily from here without selector).
		// Click ready
		await debugController.clickReady();

		// 8. When the combat is done, advance to the next phase.
		await page.waitForTimeout(5000); // Let combat run

		// Advance
		await debugController.clickNextRound();

		// 9. Check that no errors showed up in the console
		expect(consoleErrors.length).toBe(0);
	});
});
