/**
 * Tutorial progress store — the client adapter around
 * `@game/content/tutorialStore`.
 *
 * `localStorage` throws on machines whose storage is blocked (private mode,
 * some WebViews, over quota). Every access is guarded: the tutorial gate must
 * degrade to "offer it again", never to a broken title screen.
 */

import {
	createTutorialStore,
	type TutorialProgress,
	type TutorialStore,
} from "@game/content/tutorialStore";
import { TUTORIAL_SLIDES } from "@game/content/tutorialSlides";

const guardedStorage = {
	getItem: (key: string): string | null => {
		try {
			return localStorage.getItem(key);
		} catch (error) {
			console.warn("tutorialStore", `failed to read "${key}"`, error);
			return null;
		}
	},
	setItem: (key: string, value: string): void => {
		try {
			localStorage.setItem(key, value);
		} catch (error) {
			console.warn("tutorialStore", `failed to persist "${key}"`, error);
		}
	},
};

const store: TutorialStore = createTutorialStore(guardedStorage);

export const getTutorialProgress = (): TutorialProgress => store.get();

/** Record where the player stopped, so the offer can resume next launch. */
export const markTutorialSeen = (furthestSlide: number): TutorialProgress =>
	store.markSeen(furthestSlide, TUTORIAL_SLIDES.length);

export const resetTutorialProgress = (): TutorialProgress => store.reset();
