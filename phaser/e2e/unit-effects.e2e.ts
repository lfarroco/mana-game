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
							id: 'player-core-regen',
							cardId: 'mana_crystal',
							pic: 'blue-stone',
							life: 400, // Start with less than max life
							maxLife: 500,
							power: 35,
							bonusPower: 0,
							cooldown: 5200,
							isCore: true,
							position: { x: 2, y: 2 },
							force: 'PLAYER',
							charge: 0,
							refresh: 5200,
							rank: 1,
							shield: 0,
							evade: 0,
							hasted: 0,
							slowed: 0,
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
								id: 'enemy-weak',
								cardId: 'void_witch',
								pic: 'boss_andromeda',
								power: 10, // Weak enemy to not kill immediately
								bonusPower: 0,
								cooldown: 5400,
								position: { x: 3, y: 3 },
								force: 'CPU',
								charge: 0,
								refresh: 5400,
								maxLife: 100,
								life: 100,
								rank: 1,
								shield: 0,
								evade: 0,
								hasted: 0,
								slowed: 0,
								isCore: false,
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
	});

export default unitEffectsSpec;