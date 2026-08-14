/// <reference path="./globals.d.ts" />

/**
 * E2E smoke test — single-player run walkthrough.
 *
 * Drives a fresh run through the real game flows via the dev-only
 * `window.__debug` controller (see src/debug/debugCommands.ts):
 *
 *   title → single-player submenu → crystal selection → battleground
 *   → encounters / shop → pre-combat → combat playback → replay → continue
 *
 * The test is deliberately state-driven and outcome-agnostic:
 *   - it never asserts on specific cards, units, or win/loss;
 *   - if an offered encounter would require dragging an orb onto a unit
 *     (upgrade_unit / power_distributor / power_absorber), it skips it instead;
 *   - pass criteria: the game boots, every phase advances without stalling,
 *     combat can be replayed and continued, and no uncaught page error occurs.
 */

import { test, expect, type Page } from "@playwright/test";

// Selecting one of these encounters opens the orb_shop phase, where applying
// the orb requires dragging it onto a board unit. The smoke test skips them.
const DRAG_ENCOUNTER_IDS = new Set([
	"upgrade_unit",
	"power_distributor",
	"power_absorber",
]);

// Client-only sub-phases shown after combat playback finishes (not present in
// the session phase, which stays "combat" until the player continues).
const RESULTS_PHASES = ["combat_victory", "combat_defeat"];

type GameState = {
	screen: string | null;
	screenPhase: string | null;
	phase: string | null;
	options: string[];
};

const readGameState = (page: Page): Promise<GameState> =>
	page.evaluate(() => {
		const d = window.__debug;
		return {
			screen: d?.getScreen?.() ?? null,
			screenPhase: d?.getScreenPhase?.() ?? null,
			phase: d?.getPhase?.() ?? null,
			options: d?.getOptions?.() ?? [],
		};
	});

const waitFor = async (
	page: Page,
	predicate: () => Promise<boolean>,
	what: string,
	timeoutMs: number
): Promise<void> => {
	const deadline = Date.now() + timeoutMs;
	while (Date.now() < deadline) {
		if (await predicate()) return;
		await page.waitForTimeout(250);
	}
	throw new Error(`Timed out after ${timeoutMs}ms waiting for: ${what}`);
};

test("single-player run walkthrough survives without crashing", async ({ page }) => {
	const pageErrors: Error[] = [];
	page.on("pageerror", (error) => pageErrors.push(error));

	// Boot without loading assets — faster, and the renderer explicitly
	// supports it (config.ts DISABLE_ASSETS + Chara's asset guards).
	await page.goto("/?disable_assets=true");

	// The dev-only controller is installed after the scene boots.
	await page.waitForFunction(() => window.__debug !== undefined, undefined, {
		timeout: 60_000,
	});
	await waitFor(
		page,
		async () => (await readGameState(page)).screen === "title",
		"title screen",
		30_000
	);

	// Start a new single-player run through the real navigation flow.
	await page.evaluate(() => window.__debug.clickSinglePlayer());
	await waitFor(
		page,
		async () => (await readGameState(page)).screenPhase === "singleplayer_submenu",
		"single-player submenu",
		15_000
	);
	await page.evaluate(() => window.__debug.clickNewRun());
	await waitFor(
		page,
		async () => (await readGameState(page)).screen === "crystal_selection",
		"crystal selection screen",
		15_000
	);
	await page.evaluate(() => window.__debug.clickPlay());
	await waitFor(
		page,
		async () => (await readGameState(page)).screen === "battleground",
		"battleground screen",
		15_000
	);

	// Walk the run until one combat has been played, replayed, and continued.
	let reachedCombat = false;
	let completedRun = false;

	for (let step = 0; step < 40 && !completedRun; step++) {
		const state = await readGameState(page);

		switch (state.phase) {
			case "encounter": {
				const firstOption = state.options[0];
				if (!firstOption || DRAG_ENCOUNTER_IDS.has(firstOption)) {
					await page.evaluate(() => window.__debug.skip());
				} else {
					await page.evaluate(() => window.__debug.selectOption(0));
				}
				break;
			}

			case "shop": {
				await page.evaluate(() => window.__debug.selectOption(0));
				break;
			}

			case "pre_combat": {
				await page.evaluate(() => window.__debug.selectOption(0));
				break;
			}

			case "combat": {
				reachedCombat = true;

				// Wait for the first playback to finish (results are client-only).
				await waitFor(
					page,
					async () =>
						RESULTS_PHASES.includes((await readGameState(page)).screenPhase ?? ""),
					"first combat playback to finish",
					60_000
				);

				// Replay the match once, then wait for it to finish again.
				await page.evaluate(() => window.__debug.replayCombat());
				await waitFor(
					page,
					async () => (await readGameState(page)).screenPhase === "combat",
					"combat replay to start",
					15_000
				);
				await waitFor(
					page,
					async () =>
						RESULTS_PHASES.includes((await readGameState(page)).screenPhase ?? ""),
					"replayed combat to finish",
					60_000
				);

				// Proceed past combat into the next phase.
				await page.evaluate(() => window.__debug.continueCombat());
				await waitFor(
					page,
					async () => (await readGameState(page)).phase !== "combat",
					"combat to end and the next phase to begin",
					30_000
				);

				completedRun = true;
				break;
			}

			case "orb_shop":
			case "upgrade_core":
			case "add_reaction_core": {
				// Safety net — the normal path skips drag encounters, but keep the
				// walkthrough alive if the round structure ever changes.
				await page.evaluate(() => window.__debug.skip());
				break;
			}

			case "victory":
			case "game_over": {
				console.log(`Run ended cleanly at phase "${state.phase}".`);
				completedRun = true;
				break;
			}

			default: {
				throw new Error(
					`Unexpected session phase "${state.phase}" (screen=${state.screen}, screenPhase=${state.screenPhase})`
				);
			}
		}
	}

	expect(reachedCombat, "the run should have reached combat").toBe(true);
	expect(
		completedRun,
		"the run should have completed combat, replay, and continue"
	).toBe(true);
	expect(
		pageErrors,
		`uncaught page errors: ${pageErrors.map((e) => e.message).join("; ")}`
	).toEqual([]);
});
