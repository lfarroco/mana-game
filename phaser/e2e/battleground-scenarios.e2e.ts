import test, { expect, Page } from "@playwright/test";
import { getDebugController } from '../src/test-utils/debugController';

const battlegroundScenariosSpec = (waitForGameInit: (p: Page) => Promise<void>) => {
	return test.describe("Battleground Scenarios", () => {
		test("should handle combat phase with specific team setup", async ({ page }) => {
			await page.goto("/");
			await waitForGameInit(page);

			const debugController = getDebugController(page);

			// Set up a session with combat phase and specific units
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
								power: 50,
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
						seed: 'test-seed-123'
					}
				}
			};

			await debugController.startBattlegroundWithSession(session);

			// Wait for battleground scene to load
			await page.waitForFunction(() => {
				return window.debugController.getCurrentSceneName() === 'BattlegroundScene';
			});

			// Verify we're in combat phase
			const phase = await debugController.getCurrentPhase();
			expect(phase).toBe('combat');

			// Verify player units are placed
			const playerUnits = await debugController.getPlayerBoardUnits();
			expect(playerUnits.length).toBe(1);
			expect(playerUnits.some(u => u.id === 'mana_crystal')).toBe(true);
		});

		test("should handle shop phase with specific gold amount", async ({ page }) => {
			await page.goto("/");
			await waitForGameInit(page);

			const debugController = getDebugController(page);

			// Set up a session with shop phase
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

			// Wait for battleground scene to load
			await page.waitForFunction(() => {
				return window.debugController.getCurrentSceneName() === 'BattlegroundScene';
			});

			// Verify we're in shop phase
			const phase = await debugController.getCurrentPhase();
			expect(phase).toBe('shop');

			// Check if shop is visible
			const isShopVisible = await debugController.isShopVisible();
			expect(isShopVisible).toBe(true);
		});

		test("should handle encounter phase with options", async ({ page }) => {
			await page.goto("/");
			await waitForGameInit(page);

			const debugController = getDebugController(page);

			// Set up a session with encounter phase
			const session = {
				phase: 'encounter' as const,
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
				},
				current_options: {
					options: [
						{ id: 'option1', text: 'Test Option 1', type: 'shop' },
						{ id: 'option2', text: 'Test Option 2', type: 'combat' },
						{ id: 'option3', text: 'Test Option 3', type: 'upgrade' }
					]
				}
			};

			await debugController.startBattlegroundWithSession(session);

			// Wait for battleground scene to load
			await page.waitForFunction(() => {
				return window.debugController.getCurrentSceneName() === 'BattlegroundScene';
			});

			// Verify we're in encounter phase
			const phase = await debugController.getCurrentPhase();
			expect(phase).toBe('encounter');
		});
	});
};

export default battlegroundScenariosSpec;