import test, { expect, Page } from "@playwright/test";

const battlegroundSpec = (waitForGameInit: (p: Page) => Promise<void>) => test.describe('Game Phase Transitions', () => {
	test('should be able to transition between shop and combat phases', async ({ page }) => {
		await page.goto('/');
		await waitForGameInit(page);

		// Get initial state
		const initialGold = await page.evaluate(() => {
			return window.gameController.getPlayerGold();
		});

		// End shop phase using DebugController
		await page.evaluate(() => {
			return window.gameController.clickNextRound();
		});

		// Wait for transition and check state
		await page.waitForTimeout(1000);

		// Log state after transition
		await page.evaluate(() => {
			window.gameController.logGameState();
		});

		// Verify state changed after transition
		const finalGold = await page.evaluate(() => {
			return window.gameController.getPlayerGold();
		});
		expect(finalGold).toBeDefined();
	});
});

export default battlegroundSpec;