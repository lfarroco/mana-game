import { test, expect, Page } from '@playwright/test';
import "../src/globals";
import shopSpec from '../src/Scenes/Battleground/Systems/Shop/shop.spec';
import boardSpec from '../src/Scenes/Battleground/Systems/Board/board.spec';
import battlegroundSpec from '../src/Scenes/Battleground/Systems/battleground.spec';

// Guideline for when adding tests to this file:
// To trigger actions in game, create methods in gameController that
// fire game events. This way we can control the game without performing
// actual clicks and drags

// Valid card ids for testing: wizzy, bumble, bubblegum, bowsie

/**
 * Helper function to wait for the game to be initialized and DebugController to be available
 */
async function waitForGameInit(page: Page) {
	// Wait for the canvas to be present
	const canvas = await page.waitForSelector('canvas');
	expect(canvas).toBeTruthy();

	// Wait for the debug controller to be available
	await page.waitForFunction(() => {
		return window.gameController !== undefined;
	}, { timeout: 5000 });

	// Verify both are initialized
	const gameInitialized = await page.evaluate(() => {
		return window.gameController !== undefined;
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

battlegroundSpec(waitForGameInit);

boardSpec(waitForGameInit);

shopSpec(waitForGameInit);