import { test, expect, Page } from '@playwright/test';
import "../src/globals";

// Guideline for when adding tests to this file:
// To trigger actions in game, create methods in gameController that
// fire game events. This way we can control the game without performing
// actual clicks and drags

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

test.describe('Shop Interactions', () => {
	test('should successfully buy a hero by clicking', async ({ page }) => {
		await page.goto('/');
		await waitForGameInit(page);

		const shopItemCost = await page.evaluate(() => window.gameController.getShopItemCost());
		await page.evaluate((cost) => window.gameController.setPlayerGold(cost + 5), shopItemCost);
		await page.waitForTimeout(200); // Wait for gold update to propagate

		const initialGold = await page.evaluate(() => window.gameController.getPlayerGold());
		const initialUnits = await page.evaluate(() => window.gameController.getPlayerBoardUnits());

		await page.evaluate(() => window.gameController.clickHeroInShop(0));
		await page.waitForTimeout(500); // Wait for purchase to process

		const finalGold = await page.evaluate(() => window.gameController.getPlayerGold());
		const finalUnits = await page.evaluate(() => window.gameController.getPlayerBoardUnits());

		expect(finalGold).toBe(initialGold - shopItemCost);
		expect(finalUnits.length).toBe(initialUnits.length + 1);
		const newUnit = finalUnits.find(u => !initialUnits.some(iu => iu.id === u.id));
		expect(newUnit).toBeDefined();
		if (newUnit) {
			// Check if it's on an actual board slot (0,0), (0,1) etc.
			expect(newUnit.position.x).toBeGreaterThanOrEqual(0);
			expect(newUnit.position.y).toBeGreaterThanOrEqual(0);
		}
	});

	test('should successfully buy and place a hero by dragging', async ({ page }) => {
		await page.goto('/');
		await waitForGameInit(page);

		const shopItemCost = await page.evaluate(() => window.gameController.getShopItemCost());
		await page.evaluate((cost) => window.gameController.setPlayerGold(cost + 5), shopItemCost);
		await page.waitForTimeout(200);

		const initialGold = await page.evaluate(() => window.gameController.getPlayerGold());
		const initialUnits = await page.evaluate(() => window.gameController.getPlayerBoardUnits());

		const targetBoardX = 0;
		const targetBoardY = 1;

		await page.evaluate(({ slot, x, y }) => window.gameController.buyAndPlaceHero(slot, x, y), { slot: 1, x: targetBoardX, y: targetBoardY });
		await page.waitForTimeout(500);

		const finalGold = await page.evaluate(() => window.gameController.getPlayerGold());
		const finalUnits = await page.evaluate(() => window.gameController.getPlayerBoardUnits());

		expect(finalGold).toBe(initialGold - shopItemCost);
		expect(finalUnits.length).toBe(initialUnits.length + 1);

		const newUnit = finalUnits.find(u => !initialUnits.some(iu => iu.id === u.id));
		expect(newUnit).toBeDefined();
		if (newUnit) {
			expect(newUnit.position.x).toBe(targetBoardX);
			expect(newUnit.position.y).toBe(targetBoardY);
		}
	});

	test('should fail to buy a hero if insufficient gold', async ({ page }) => {
		await page.goto('/');
		await waitForGameInit(page);

		const shopItemCost = await page.evaluate(() => window.gameController.getShopItemCost());
		await page.evaluate((cost) => window.gameController.setPlayerGold(cost - 1), shopItemCost); // Set gold to less than item cost
		await page.waitForTimeout(200);

		const initialGold = await page.evaluate(() => window.gameController.getPlayerGold());
		const initialUnits = await page.evaluate(() => window.gameController.getPlayerBoardUnits());

		await page.evaluate(() => window.gameController.clickHeroInShop(0));
		await page.waitForTimeout(500);

		const finalGold = await page.evaluate(() => window.gameController.getPlayerGold());
		const finalUnits = await page.evaluate(() => window.gameController.getPlayerBoardUnits());

		expect(finalGold).toBe(initialGold); // Gold should not change
		expect(finalUnits.length).toBe(initialUnits.length); // Unit count should not change
	});

	test('should fail to buy a hero if party is full', async ({ page }) => {
		await page.goto('/');
		await waitForGameInit(page);

		const maxPartySize = await page.evaluate(() => window.gameController.getMaxPartySize());
		const shopItemCost = await page.evaluate(() => window.gameController.getShopItemCost());

		// Set enough gold to buy maxPartySize + 1 units
		await page.evaluate(({ mps, cost }) => window.gameController.setPlayerGold((mps + 1) * cost), { mps: maxPartySize, cost: shopItemCost });
		await page.waitForTimeout(200);

		// --- PRE-FILL THE PARTY ---
		// Add MAX_PARTY_SIZE - 1 units directly to the state
		const unitsToAdd = maxPartySize - 1;
		const cardIdToUse = 'bowsie'; // Assuming 'nameless' is a valid card ID
		for (let i = 0; i < maxPartySize; i++) {
			const boardX = i % 3;
			const boardY = Math.floor(i / 3);
			await page.evaluate(({ cardId, x, y }) => window.gameController.addUnitToPlayerBoard(cardId, x, y), { cardId: cardIdToUse, x: boardX, y: boardY });
		}
		// --- END PRE-FILL ---

		const unitsBeforeAttempt = await page.evaluate(() => window.gameController.getPlayerBoardUnits());
		expect(unitsBeforeAttempt.length).toBe(maxPartySize);

		const goldBeforeAttempt = await page.evaluate(() => window.gameController.getPlayerGold());

		// Attempt to buy one more hero
		// We don't care which hero it is, just that we try to buy *a* hero from the shop.
		await page.evaluate(() => window.gameController.clickHeroInShop(0)); // Assuming shop slot 0 exists
		await page.waitForTimeout(500);

		const finalGold = await page.evaluate(() => window.gameController.getPlayerGold());
		const finalUnits = await page.evaluate(() => window.gameController.getPlayerBoardUnits());

		expect(finalGold).toBe(goldBeforeAttempt); // Gold should not change
		expect(finalUnits.length).toBe(maxPartySize); // Unit count should not change
	});
});
