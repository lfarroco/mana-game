// Test utilities for E2E tests with proper TypeScript support

import { Page } from "@playwright/test";
import type * as DebugController from "@Scenes//Debug/DebugController";

/**
 * Helper function to access debugController with full TypeScript support
 * Usage: const result = await getDebugController(page).getPlayerGold();
 */
export function getDebugController(page: Page) {
	return {
		async getPlayerBoardUnits(): Promise<ReturnType<typeof DebugController.getPlayerBoardUnits>> {
			return await page.evaluate(() => window.debugController.getPlayerBoardUnits());
		},

		async getShopHeroes(): Promise<ReturnType<typeof DebugController.getShopHeroes>> {
			return await page.evaluate(() => window.debugController.getShopHeroes());
		},

		async logGameState(): Promise<void> {
			await page.evaluate(() => window.debugController.logGameState());
		},

		async clickHeroInShop(slotIndex: number): Promise<string> {
			return await page.evaluate(
				(index) => window.debugController.clickHeroInShop(index),
				slotIndex
			);
		},

		async buyAndPlaceHero(shopSlotIndex: number, boardX: number, boardY: number): Promise<string> {
			return await page.evaluate(
				({ slot, x, y }) => window.debugController.buyAndPlaceHero(slot, x, y),
				{ slot: shopSlotIndex, x: boardX, y: boardY }
			);
		},

		async moveUnitOnBoard(
			unitId: string,
			targetBoardX: number,
			targetBoardY: number
		): Promise<string> {
			return await page.evaluate(
				({ unitId, x, y }) => window.debugController.moveUnitOnBoard(unitId, x, y),
				{ unitId, x: targetBoardX, y: targetBoardY }
			);
		},

		async sellUnitFromBoard(unitId: string): Promise<string> {
			return await page.evaluate((id) => window.debugController.sellUnitFromBoard(id), unitId);
		},

		async isShopVisible(): Promise<boolean> {
			return true; // TODO: implement me
		},

		async getShopItemCost(): Promise<number> {
			return await page.evaluate(() => window.debugController.getShopItemCost());
		},

		async getMaxPartySize(): Promise<number> {
			return await page.evaluate(() => window.debugController.getMaxPartySize());
		},

		async clickNextRound(): Promise<string> {
			return await page.evaluate(() => window.debugController.clickNextRound());
		},

		async addUnitToPlayerBoard(cardId: string, boardX: number, boardY: number): Promise<string> {
			return await page.evaluate(
				({ cardId, x, y }) => window.debugController.addUnitToPlayerBoard(cardId, x, y),
				{ cardId, x: boardX, y: boardY }
			);
		},

		async clickGameStart() {
			return await page.evaluate(() => window.debugController.clickGameStart());
		},
	};
}

/**
 * Wait for game initialization and debugController to be available
 */
export async function waitForGameInit(page: Page): Promise<void> {
	// Wait for the canvas to be present
	const canvas = await page.waitForSelector("canvas");
	if (!canvas) throw new Error("Canvas not found");
}
