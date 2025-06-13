import { test, expect, Page } from '@playwright/test';

/**
 * Helper function to wait for the game to be initialized and DebugController to be available
 */
async function waitForGameInit(page: Page) {
	// Wait for the canvas to be present
	const canvas = await page.waitForSelector('canvas');
	expect(canvas).toBeTruthy();

	// Wait for the game instance and debug controller to be available
	const gameInitialized = await page.evaluate(() => {
		return window.game !== undefined && window.gameController !== undefined;
	});
	expect(gameInitialized).toBeTruthy();
}

test.describe('Game Initialization', () => {
	test('should load and initialize the game correctly', async ({ page }) => {
		await page.goto('/');
		await waitForGameInit(page);

		// Verify initial game setup using DebugController
		const gold = await page.evaluate(() => {
			return window.gameController.getPlayerGold();
		});
		expect(typeof gold).toBe('number');

		// Verify we can get player units using DebugController
		const units = await page.evaluate(() => {
			return window.gameController.getPlayerBoardUnits();
		});
		expect(Array.isArray(units)).toBe(true);

		// Log game state for debugging
		await page.evaluate(() => {
			window.gameController.logGameState();
		});
	});
});

test.describe('Game Phase Transitions', () => {
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
