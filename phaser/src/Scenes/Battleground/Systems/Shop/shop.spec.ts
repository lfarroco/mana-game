import { test, expect, Page } from '@playwright/test';
import "../../../../globals";

const isShopVisible = (page: Page) => page.waitForFunction(() => {
	return window.gameController.isShopVisible();
}, { timeout: 5000 });

export default function (waitForGameInit: (p: Page) => Promise<void>) {

	test.describe('Shop Interactions', () => {
		test('should successfully buy a hero by clicking', async ({ page }) => {
			await page.goto('/');
			await waitForGameInit(page);

			await isShopVisible(page);

			const shopItemCost = await page.evaluate(() => window.gameController.getShopItemCost());
			await page.evaluate((cost) => window.gameController.playerGoldDelta(cost + 5), shopItemCost);
			await page.waitForTimeout(200); // Wait for gold update to propagate

			const initialGold = await page.evaluate(() => window.gameController.getPlayerGold());
			const initialUnits = await page.evaluate(() => window.gameController.getPlayerBoardUnits());

			await page.evaluate(() => window.gameController.clickHeroInShop(0));
			await page.waitForTimeout(200); // Wait for purchase to process

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

			await isShopVisible(page);

			const shopItemCost = await page.evaluate(() => window.gameController.getShopItemCost());
			await page.evaluate((cost) => window.gameController.playerGoldDelta(cost + 5), shopItemCost);
			await page.waitForTimeout(200);

			const initialGold = await page.evaluate(() => window.gameController.getPlayerGold());
			const initialUnits = await page.evaluate(() => window.gameController.getPlayerBoardUnits());

			const targetBoardX = 0;
			const targetBoardY = 1;

			await page.evaluate(({ slot, x, y }) => window.gameController.buyAndPlaceHero(slot, x, y), { slot: 1, x: targetBoardX, y: targetBoardY });
			await page.waitForTimeout(200);

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

			await isShopVisible(page);

			const initialGold = await page.evaluate(() => window.gameController.getPlayerGold());
			const initialUnits = await page.evaluate(() => window.gameController.getPlayerBoardUnits());

			const shopItemCost = await page.evaluate(() => window.gameController.getShopItemCost());
			// Set gold to 0
			await page.evaluate((delta) => window.gameController.playerGoldDelta(-delta), initialGold);
			await page.waitForTimeout(200);

			const currentGold = shopItemCost - 1;

			// Set gold to less than item cost
			await page.evaluate((cost) => window.gameController.playerGoldDelta(cost), currentGold);
			await page.waitForTimeout(200);

			await page.evaluate(() => window.gameController.clickHeroInShop(0));
			await page.waitForTimeout(200);

			const finalGold = await page.evaluate(() => window.gameController.getPlayerGold());
			const finalUnits = await page.evaluate(() => window.gameController.getPlayerBoardUnits());

			expect(finalGold).toBe(currentGold); // Gold should not change
			expect(finalUnits.length).toBe(initialUnits.length); // Unit count should not change
		});

		test('should fail to buy a hero if party is full', async ({ page }) => {
			await page.goto('/');
			await waitForGameInit(page);

			await isShopVisible(page);

			const maxPartySize = await page.evaluate(() => window.gameController.getMaxPartySize());
			const shopItemCost = await page.evaluate(() => window.gameController.getShopItemCost());

			// Set enough gold to buy maxPartySize + 1 units
			await page.evaluate(({ mps, cost }) => window.gameController.playerGoldDelta((mps + 1) * cost), { mps: maxPartySize, cost: shopItemCost });
			await page.waitForTimeout(200);

			// --- PRE-FILL THE PARTY ---
			// Add MAX_PARTY_SIZE - 1 units directly to the state
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
			await page.waitForTimeout(200);

			const finalGold = await page.evaluate(() => window.gameController.getPlayerGold());
			const finalUnits = await page.evaluate(() => window.gameController.getPlayerBoardUnits());

			expect(finalGold).toBe(goldBeforeAttempt); // Gold should not change
			expect(finalUnits.length).toBe(maxPartySize); // Unit count should not change
		});

		test('should successfully sell an owned hero', async ({ page }) => {
			await page.goto('/');
			await waitForGameInit(page);
			await isShopVisible(page);

			const shopItemCost = await page.evaluate(() => window.gameController.getShopItemCost());
			await page.evaluate((cost) => window.gameController.playerGoldDelta(cost + 10), shopItemCost); // Ensure enough gold
			await page.waitForTimeout(200);

			const initialBoardUnits = await page.evaluate(() => window.gameController.getPlayerBoardUnits());
			const goldBeforePurchase = await page.evaluate(() => window.gameController.getPlayerGold());

			// Buy a hero
			await page.evaluate(() => window.gameController.clickHeroInShop(0));
			await page.waitForTimeout(300); // Allow purchase and board update

			const unitsAfterPurchase = await page.evaluate(() => window.gameController.getPlayerBoardUnits());
			const goldAfterPurchase = await page.evaluate(() => window.gameController.getPlayerGold());

			expect(unitsAfterPurchase.length).toBe(initialBoardUnits.length + 1);
			expect(goldAfterPurchase).toBe(goldBeforePurchase - shopItemCost);

			const newUnit = unitsAfterPurchase.find(u => !initialBoardUnits.some(iu => iu.id === u.id));
			expect(newUnit).toBeDefined();

			if (!newUnit) throw new Error("New unit not found after purchase");
			const unitToSellId = newUnit.id;

			// Sell the hero
			await page.evaluate((id) => window.gameController.sellUnitFromBoard(id), unitToSellId);
			await page.waitForTimeout(300); // Allow sell and board update

			const finalUnits = await page.evaluate(() => window.gameController.getPlayerBoardUnits());
			const finalGold = await page.evaluate(() => window.gameController.getPlayerGold());

			const expectedSellPrice = Math.floor(shopItemCost / 2);
			expect(finalGold).toBe(goldAfterPurchase + expectedSellPrice);
			expect(finalUnits.length).toBe(initialBoardUnits.length);
			expect(finalUnits.find(u => u.id === unitToSellId)).toBeUndefined();
		});

		// TODO: Add test for failing to sell a non-existent unit
		// TODO: Add test to ensure sell zone appears when dragging an owned unit (more complex, might need visual testing)
	});
}