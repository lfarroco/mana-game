import { expect, test } from "@playwright/test";
import { getDebugController, waitForGameInit } from "../src/test-utils/debugController";

const CORE_UNIT = {
	id: "player-core-visual",
	cardId: "mana_crystal",
	pic: "blue-stone",
	life: 500,
	maxLife: 500,
	power: 35,
	bonusPower: 0,
	cooldown: 5200,
	isCore: true,
	position: { x: 2, y: 2 },
	force: "PLAYER",
	charge: 0,
	refresh: 5200,
	rank: 1,
	shield: 0,
	evade: 0,
	hasted: 0,
	slowed: 0,
	effects: [],
	reactions: [],
};

test.describe("Visual regression", () => {
	test("title scene remains visually stable", async ({ page }) => {
		await page.goto("/");
		await waitForGameInit(page);
		await page.waitForTimeout(800);

		await expect(page).toHaveScreenshot("title-scene.png", {
			animations: "disabled",
			maxDiffPixelRatio: 0.02,
		});
	});

	test("shop phase layout remains visually stable", async ({ page }) => {
		await page.goto("/");
		await waitForGameInit(page);

		const debugController = getDebugController(page);
		await debugController.startBattlegroundWithSession({
			phase: "shop",
			round: 1,
			step: 1,
			team: { units: [CORE_UNIT] },
		});

		await expect
			.poll(async () => await debugController.getCurrentSceneName())
			.toBe("BattlegroundScene");
		await page.waitForTimeout(1000);

		await expect(page).toHaveScreenshot("battleground-shop-phase.png", {
			animations: "disabled",
			maxDiffPixelRatio: 0.02,
		});
	});

	test("combat phase layout remains visually stable", async ({ page }) => {
		await page.goto("/");
		await waitForGameInit(page);

		const debugController = getDebugController(page);
		await debugController.startBattlegroundWithSession({
			phase: "combat",
			round: 1,
			step: 1,
			team: { units: [CORE_UNIT] },
			current_options: {
				options: [],
				combatState: {
					enemyTeam: [
						{
							id: "enemy-visual-1",
							cardId: "void_witch",
							pic: "boss_andromeda",
							power: 50,
							bonusPower: 0,
							cooldown: 5400,
							position: { x: 3, y: 3 },
							force: "CPU",
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
							reactions: [],
						},
					],
					units: [],
					logs: [],
					seed: "visual-regression-seed",
				},
			},
		});

		await expect
			.poll(async () => await debugController.getCurrentSceneName())
			.toBe("BattlegroundScene");
		await page.waitForTimeout(1200);

		await expect(page).toHaveScreenshot("battleground-combat-phase.png", {
			animations: "disabled",
			maxDiffPixelRatio: 0.02,
		});
	});
});
