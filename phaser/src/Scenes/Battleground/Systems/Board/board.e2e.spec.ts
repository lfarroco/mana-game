import test, { expect, Page } from "@playwright/test";


const boardSpec = (
	waitForGameInit: (p: Page) => Promise<void>,
) => test.describe('Board Interactions', () => {
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

export default boardSpec;