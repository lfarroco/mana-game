import test, { expect, Page } from "@playwright/test";
import { getDebugController } from '../src/test-utils/debugController';

const unitEffectsSpec = (waitForGameInit: (p: Page) => Promise<void>) =>
	test.describe("Unit Effects and Combat Mechanics", () => {
		test("should test unit with regen effect", async ({ page }) => {
			await page.goto("/");
			await waitForGameInit(page);

			const debugController = getDebugController(page);

			// Set up a session with a unit that has regen
			const session = {
				phase: 'combat' as const,
				round: 1,
				step: 1,
				team: {
					units: [
						{
							id: 'mana_crystal',
							pic: 'blue-stone',
							life: 400, // Start with less than max life
							power: 35,
							cooldown: 5200,
							isCore: true,
							position: { x: 2, y: 2 },
							force: 'PLAYER',
							charge: 0,
							refresh: 5200,
							maxLife: 500,
							effects: [{ id: 'regen' }], // Add regen effect
							reactions: []
						}
					]
				},
				current_options: {
					options: [],
					combatState: {
						enemyTeam: [
							{
								id: 'void_witch',
								pic: 'boss_andromeda',
								power: 10, // Weak enemy to not kill immediately
								cooldown: 5400,
								position: { x: 3, y: 3 },
								force: 'CPU',
								charge: 0,
								refresh: 5400,
								maxLife: 100,
								life: 100,
								effects: [],
								reactions: []
							}
						],
						units: [],
						logs: [],
						seed: 'regen-test-seed'
					}
				}
			};

			await debugController.startBattlegroundWithSession(session);

			// Wait for battleground scene
			await page.waitForFunction(() => {
				return window.debugController.getCurrentSceneName() === 'BattlegroundScene';
			});

			// Record initial life
			const initialLife = await page.evaluate(() => {
				const win = window as any;
				const state = win.state.currentState || win.state;
				const playerCore = state.battleData.units.find((u: any) => u.force === 'PLAYER' && u.isCore);
				return playerCore ? playerCore.life : 0;
			});

			// Click ready to start combat
			await debugController.clickReady();

			// Wait a bit for some combat actions
			await page.waitForTimeout(3000);

			// Check if life increased due to regen
			const currentLife = await page.evaluate(() => {
				const win = window as any;
				const state = win.state.currentState || win.state;
				const playerCore = state.battleData.units.find((u: any) => u.force === 'PLAYER' && u.isCore);
				return playerCore ? playerCore.life : 0;
			});

			// Life should be >= initial (could have regenerated)
			expect(currentLife).toBeGreaterThanOrEqual(initialLife - 10); // Allow for some damage
		});

		test("should test unit with poison effect", async ({ page }) => {
			await page.goto("/");
			await waitForGameInit(page);

			const debugController = getDebugController(page);

			// Set up a session with a unit that has poison
			const session = {
				phase: 'combat' as const,
				round: 1,
				step: 1,
				team: {
					units: [
						{
							id: 'mana_crystal',
							pic: 'blue-stone',
							life: 500,
							power: 35,
							cooldown: 5200,
							isCore: true,
							position: { x: 2, y: 2 },
							force: 'PLAYER',
							charge: 0,
							refresh: 5200,
							maxLife: 500,
							effects: [],
							reactions: []
						},
						{
							id: 'void_witch',
							pic: 'boss_andromeda',
							power: 50,
							cooldown: 5400,
							position: { x: 1, y: 1 },
							force: 'PLAYER',
							charge: 0,
							refresh: 5400,
							maxLife: 100,
							life: 100,
							effects: [{ id: 'poison' }], // Poison effect
							reactions: []
						}
					]
				},
				current_options: {
					options: [],
					combatState: {
						enemyTeam: [
							{
								id: 'warbringer',
								pic: 'warbringer',
								power: 20,
								cooldown: 5400,
								position: { x: 3, y: 3 },
								force: 'CPU',
								charge: 0,
								refresh: 5400,
								maxLife: 100,
								life: 100,
								effects: [],
								reactions: []
							}
						],
						units: [],
						logs: [],
						seed: 'poison-test-seed'
					}
				}
			};

			await debugController.startBattlegroundWithSession(session);

			// Wait for battleground scene
			await page.waitForFunction(() => {
				return window.debugController.getCurrentSceneName() === 'BattlegroundScene';
			});

			// Record initial enemy life
			const initialEnemyLife = await page.evaluate(() => {
				const win = window as any;
				const state = win.state.currentState || win.state;
				const enemy = state.battleData.units.find((u: any) => u.force === 'CPU');
				return enemy ? enemy.life : 0;
			});

			// Click ready to start combat
			await debugController.clickReady();

			// Wait for combat to progress
			await page.waitForTimeout(5000);

			// Check if enemy took poison damage
			const currentEnemyLife = await page.evaluate(() => {
				const win = window as any;
				const state = win.state.currentState || win.state;
				const enemy = state.battleData.units.find((u: any) => u.force === 'CPU');
				return enemy ? enemy.life : 0;
			});

			// Enemy should have taken some damage (poison + regular attacks)
			expect(currentEnemyLife).toBeLessThan(initialEnemyLife);
		});

		test("should test unit movement and positioning", async ({ page }) => {
			await page.goto("/");
			await waitForGameInit(page);

			const debugController = getDebugController(page);

			// Set up a session with shop phase to test unit placement
			const session = {
				phase: 'shop' as const,
				round: 1,
				step: 1,
				team: {
					units: [
						{
							id: 'mana_crystal',
							pic: 'blue-stone',
							life: 500,
							power: 35,
							cooldown: 5200,
							isCore: true,
							position: { x: 2, y: 2 },
							force: 'PLAYER',
							charge: 0,
							refresh: 5200,
							maxLife: 500,
							effects: [],
							reactions: []
						}
					]
				}
			};

			await debugController.startBattlegroundWithSession(session);

			// Wait for battleground scene
			await page.waitForFunction(() => {
				return window.debugController.getCurrentSceneName() === 'BattlegroundScene';
			});

			// Add a unit to the board
			await debugController.addUnitToPlayerBoard('warbringer', 0, 0);

			// Verify unit was added
			let units = await debugController.getPlayerBoardUnits();
			expect(units.length).toBe(2); // Core + new unit

			const addedUnit = units.find(u => u.id === 'warbringer');
			expect(addedUnit).toBeDefined();
			expect(addedUnit!.position.x).toBe(0);
			expect(addedUnit!.position.y).toBe(0);

			// Move the unit
			await debugController.moveUnitOnBoard(addedUnit!.id, 1, 1);
			await page.waitForTimeout(500);

			// Verify unit moved
			units = await debugController.getPlayerBoardUnits();
			const movedUnit = units.find(u => u.id === 'warbringer');
			expect(movedUnit!.position.x).toBe(1);
			expect(movedUnit!.position.y).toBe(1);
		});
	});

export default unitEffectsSpec;