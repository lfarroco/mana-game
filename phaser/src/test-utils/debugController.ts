// Test utilities for E2E tests with proper TypeScript support
// Force refresh

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


		async isShopVisible(): Promise<boolean> {
			return await page.evaluate(() => window.debugController.isShopVisible());
		},

		async getCurrentSceneName(): Promise<string> {
			return await page.evaluate(() => window.debugController.getCurrentSceneName());
		},

		async getCurrentPhase(): Promise<string> {
			return await page.evaluate(() => window.debugController.getCurrentPhase());
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

		async clickNewRun() {
			return await page.evaluate(() => window.debugController.clickNewRun());
		},

		async selectCrystal(index: number) {
			return await page.evaluate((i) => window.debugController.selectCrystal(i), index);
		},

		async confirmCrystalSelection() {
			return await page.evaluate(() => window.debugController.confirmCrystalSelection());
		},

		async clickReady() {
			return await page.evaluate(() => window.debugController.clickReady());
		},

		async chooseEncounter(index: number) {
			return await page.evaluate((i) => window.debugController.chooseEncounter(i), index);
		},

		async setSpeed(speed: number) {
			return await page.evaluate((s) => window.debugController.setSpeed(s), speed);
		},
	};
}

/**
 * Wait for game initialization and debugController to be available
 */
export async function waitForGameInit(page: Page): Promise<void> {
	console.log("Waiting for game init...");
	// Wait for the canvas to be present
	try {
		console.log("Waiting for canvas...");
		const canvas = await page.waitForSelector("canvas", { timeout: 10000 });
		if (!canvas) throw new Error("Canvas not found");
		console.log("Canvas found.");

		// Wait for debugController/state to be available on window
		console.log("Waiting for global vars...");
		await page.waitForFunction(() => {
			const hasDebug = !!window.debugController;
			const hasState = !!window.state;
			if (!hasDebug || !hasState) {
				// return false; // Don't log spam
			}
			return hasDebug && hasState;
		}, null, { timeout: 10000 });
		console.log("Global vars found.");
	} catch (e) {
		console.log("waitForGameInit failed:", e);
		throw e;
	}
}
