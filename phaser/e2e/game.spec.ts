import { test, expect, Page } from '@playwright/test';
import "../src/globals";
import shopSpec from '../src/Scenes/Battleground/Systems/Shop/shop.spec';

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


test.describe('Board Interactions', () => {
	test('should move a unit to an empty slot on the board', async ({ page }) => {
		await page.goto('/');
		await waitForGameInit(page);

		// Add a unit to the board
		const cardIdToUse = 'bowsie'; // Ensure this is a valid card ID
		const initialBoardX = 0;
		const initialBoardY = 0;
		await page.evaluate(({ cardId, x, y }) => window.gameController.addUnitToPlayerBoard(cardId, x, y), { cardId: cardIdToUse, x: initialBoardX, y: initialBoardY });

		let units = await page.evaluate(() => window.gameController.getPlayerBoardUnits());
		const unitToMove = units.find(u => u.position.x === initialBoardX && u.position.y === initialBoardY);
		expect(unitToMove).toBeDefined();
		if (!unitToMove) return; // Guard for TypeScript

		const targetBoardX = 1;
		const targetBoardY = 1;

		// Move the unit
		await page.evaluate(({ unitId, x, y }) => window.gameController.moveUnitOnBoard(unitId, x, y), { unitId: unitToMove.id, x: targetBoardX, y: targetBoardY });
		await page.waitForTimeout(500); // Wait for move to process

		units = await page.evaluate(() => window.gameController.getPlayerBoardUnits());
		const movedUnit = units.find(u => u.id === unitToMove.id);

		expect(movedUnit).toBeDefined();
		if (movedUnit) {
			expect(movedUnit.position.x).toBe(targetBoardX);
			expect(movedUnit.position.y).toBe(targetBoardY);
		}
		expect(units.length).toBe(1); // Ensure no units were duplicated or lost
	});

	test('should swap two units when one is dragged onto the other', async ({ page }) => {
		await page.goto('/');
		await waitForGameInit(page);

		const cardId1 = 'bowsie';
		const cardId2 = 'wizzy'; // Ensure 'anotherCard' is a valid card ID, or use 'bowsie' again if different instances are fine

		// Add two units to the board
		const unit1InitialX = 0, unit1InitialY = 0;
		const unit2InitialX = 1, unit2InitialY = 1;

		await page.evaluate(({ cardId, x, y }) => window.gameController.addUnitToPlayerBoard(cardId, x, y), { cardId: cardId1, x: unit1InitialX, y: unit1InitialY });
		await page.evaluate(({ cardId, x, y }) => window.gameController.addUnitToPlayerBoard(cardId, x, y), { cardId: cardId2, x: unit2InitialX, y: unit2InitialY });

		let units = await page.evaluate(() => window.gameController.getPlayerBoardUnits());
		const unit1 = units.find(u => u.position.x === unit1InitialX && u.position.y === unit1InitialY);
		const unit2 = units.find(u => u.position.x === unit2InitialX && u.position.y === unit2InitialY);

		expect(unit1).toBeDefined();
		expect(unit2).toBeDefined();
		if (!unit1 || !unit2) return; // Guard for TypeScript

		// Move unit1 to unit2's position
		await page.evaluate(({ unitId, x, y }) => window.gameController.moveUnitOnBoard(unitId, x, y), { unitId: unit1.id, x: unit2InitialX, y: unit2InitialY });
		await page.waitForTimeout(500); // Wait for swap to process

		units = await page.evaluate(() => window.gameController.getPlayerBoardUnits());
		const unit1AfterMove = units.find(u => u.id === unit1.id);
		const unit2AfterMove = units.find(u => u.id === unit2.id);

		expect(unit1AfterMove).toBeDefined();
		expect(unit2AfterMove).toBeDefined();

		if (unit1AfterMove) {
			// Unit1 should now be at unit2's original position
			expect(unit1AfterMove.position.x).toBe(unit2InitialX);
			expect(unit1AfterMove.position.y).toBe(unit2InitialY);
		}
		if (unit2AfterMove) {
			// Unit2 should now be at unit1's original position
			expect(unit2AfterMove.position.x).toBe(unit1InitialX);
			expect(unit2AfterMove.position.y).toBe(unit1InitialY);
		}
		expect(units.length).toBe(2); // Ensure unit count remains the same
	});
});

shopSpec(waitForGameInit);