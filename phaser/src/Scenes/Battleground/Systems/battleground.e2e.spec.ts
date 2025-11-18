import test, { expect, Page } from "@playwright/test";
import { getDebugController } from "../../../test-utils/debugController";

const battlegroundSpec = (waitForGameInit: (p: Page) => Promise<void>) =>
	test.describe("Game Phase Transitions", () => {
		test("should be able to transition between shop and combat phases", async ({ page }) => {
			await page.goto("/");
			await waitForGameInit(page);

			const debugController = getDebugController(page);

			// End shop phase using DebugController
			await debugController.clickNextRound();

			// Wait for transition and check state
			await page.waitForTimeout(1000);

			// Log state after transition
			await debugController.logGameState();
		});
	});

export default battlegroundSpec;
