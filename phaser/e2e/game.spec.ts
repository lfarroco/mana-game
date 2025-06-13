import { test, expect, Page } from '@playwright/test';

/**
 * Helper function to wait for the game to be initialized
 */
async function waitForGameInit(page: Page) {
	// Wait for the canvas to be present
	const canvas = await page.waitForSelector('canvas');
	expect(canvas).toBeTruthy();

	// Wait for the game instance to be available
	const gameInitialized = await page.evaluate(() => {
		return window.game !== undefined;
	});
	expect(gameInitialized).toBeTruthy();
}

/**
 * Inject testing utilities into the game context
 */
async function injectTestHelpers(page: Page) {
	await page.evaluate(() => {
		window.gameTestHelpers = {
			// Get the current game state
			getGameState: () => {
				return window.game.state;
			},

			// Trigger a shop phase
			triggerShopPhase: () => {
				window.game.scene.getScene('BattlegroundScene').battleProgressionSystem.transitionToShopPhase();
			},

			// Trigger combat phase
			triggerCombatPhase: () => {
				window.game.scene.getScene('BattlegroundScene').battleProgressionSystem.transitionToCombatPhase();
			},

			// Get player's current gold
			getPlayerGold: () => {
				return window.game.state.gameData.player.gold;
			},

			// Get player's current units
			getPlayerUnits: () => {
				return window.game.state.gameData.player.units;
			}
		};
	});
}

test.describe('Game Initialization', () => {
	test('should load and initialize the game correctly', async ({ page }) => {
		await page.goto('/');
		await waitForGameInit(page);
		await injectTestHelpers(page);

		// Verify game state is accessible
		const gameState = await page.evaluate(() => {
			return window.gameTestHelpers.getGameState();
		});
		expect(gameState).toBeTruthy();

		// Verify initial game setup
		const gold = await page.evaluate(() => {
			return window.gameTestHelpers.getPlayerGold();
		});
		expect(typeof gold).toBe('number');

		// Verify we can get player units
		const units = await page.evaluate(() => {
			return window.gameTestHelpers.getPlayerUnits();
		});
		expect(Array.isArray(units)).toBe(true);
	});
});

test.describe('Game Phase Transitions', () => {
	test('should be able to transition between shop and combat phases', async ({ page }) => {
		await page.goto('/');
		await waitForGameInit(page);
		await injectTestHelpers(page);

		// Trigger shop phase
		await page.evaluate(() => {
			return window.gameTestHelpers.triggerShopPhase();
		});

		// Verify shop phase (could add more specific checks here)
		await page.waitForTimeout(1000); // Give time for transition

		// Trigger combat phase
		await page.evaluate(() => {
			return window.gameTestHelpers.triggerCombatPhase();
		});

		// Verify combat phase (could add more specific checks here)
		await page.waitForTimeout(1000); // Give time for transition
	});
});
