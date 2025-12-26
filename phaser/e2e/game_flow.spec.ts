
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

		// 6. When facing an enemy team, click ready.
		// We might need to advance phases until Combat.
		// If we are still in Encounter/Shop, we might need to close it?
		// DebugController.clickNextRound() advances phase.
		// Let's try to advance to Combat.
		await debugController.clickNextRound(); // End Shop/Encounter

		await page.waitForTimeout(3000); // Wait for Combat transition

		// Now we should be in Combat.
		await debugController.clickReady();

		// 7. When the combat is done, advance to the next phase.
		// Wait for combat to finish. Length depends on simulation.
		// We can just wait a fixed time or check logs.
		await page.waitForTimeout(5000); // Let combat run a bit

		// Advance
		await debugController.clickNextRound();

		// 8. Check that no errors showed up in the console
		expect(consoleErrors.length).toBe(0);
	});
});
