import { test, expect, Page } from '@playwright/test';
import boardSpec from './board.e2e';
import battlegroundSpec from './battleground.e2e';
import { waitForGameInit, getDebugController } from '../src/test-utils/debugController';

// Guideline for when adding tests to this file:
// To trigger actions in game, create methods in gameController that
// fire game events. This way we can control the game without performing
// actual clicks and drags

test.describe('Game Initialization', () => {
	test('should load and initialize the game correctly', async ({ page }) => {
		await page.goto('/');
		await waitForGameInit(page);

		const debugController = getDebugController(page);

		// Verify we can get player units using DebugController
		const units = await debugController.getPlayerBoardUnits();
		expect(Array.isArray(units)).toBe(true);

		// Log game state for debugging
		await debugController.logGameState();
	});
});

battlegroundSpec(waitForGameInit);

boardSpec(waitForGameInit);


