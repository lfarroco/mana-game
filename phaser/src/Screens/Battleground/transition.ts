import * as animation from "@Utils/animation";
import type { Destroyable, PhaseTransition } from "@mana/framework";
import * as ResultsUI from "./Components/Results/ResultsUI";

/**
 * Shared phase transitions for the battleground screen.
 *
 * Each transition receives the elements RETURNED by the phase handler:
 *   - encounter / pre_combat: EncounterCard objects (have `container` + `bg`)
 *   - victory / game_over: ResultUI containers (have `container` + `overlay`)
 *   - others: raw Phaser game objects (containers, images, shaders, ...)
 */

/** Type guard — element looks like an EncounterCard (has a `bg` graphics). */
const isEncounterCard = (el: Destroyable): el is Destroyable & { container: Phaser.GameObjects.Container } =>
	!!el && "container" in el && "bg" in el;

/** Type guard — element looks like a ResultsContainer (has `overlay` + `container`). */
const isResultsContainer = (el: Destroyable): el is ResultsUI.ResultsContainer =>
	!!el && "container" in el && "overlay" in el;

/** Fade a set of elements in from alpha 0. Safe for any Phaser GameObject. */
export const fadeIn = async (elements: Destroyable[]): Promise<void> => {
	const gameObjects = elements.filter(
		(el): el is Destroyable & Phaser.GameObjects.Components.Alpha =>
			!!el && "setAlpha" in el,
	);
	await Promise.all(
		gameObjects.map(async (obj) => {
			obj.setAlpha(0);
			await animation.tween({
				targets: [obj as unknown as Phaser.GameObjects.GameObject],
				alpha: 1,
				duration: 200,
				ease: "Power2",
			});
		}),
	);
};

/** Slide encounter cards in from the right with a stagger (extracted from Encounter.ts). */
export const encounterCardsEnter: PhaseTransition["enter"] = async (elements) => {
	const cards = elements.filter(isEncounterCard).map((el) => el.container);
	const slideDistance = 900;

	await Promise.all(
		cards.map(async (container, index) => {
			const targetX = container.x;
			const startX = targetX + slideDistance;
			container.setX(startX);
			await animation.tween({
				targets: [container],
				x: targetX,
				delay: 100 * index,
				duration: 300,
				ease: "Power2",
			});
		}),
	);
};

/** Slide the results panel (victory / game over) in from above. */
export const resultsEnter: PhaseTransition["enter"] = async (elements) => {
	const results = elements.find(isResultsContainer);
	if (results) await ResultsUI.slideIn(results);
};

/** Slide the results panel out (the framework destroys it afterwards). */
export const resultsExit: PhaseTransition["exit"] = async (elements) => {
	const results = elements.find(isResultsContainer);
	if (results) await ResultsUI.slideOutOnly(results);
};

/** Generic fade-in for simple phase UIs (shop, orb shop, upgrade core). */
export const defaultEnter: PhaseTransition["enter"] = fadeIn;
