/**
 * Crystal-selection state.
 *
 * Module-level (not scene state) because `navigationButtons` and
 * `Effects/startNewGame` read it while building/acting, and keeping it in a
 * leaf module avoids a cycle between the scene and its components/effects.
 * Reset on scene shutdown so a revisit never sees a previous run's list.
 */

import type { CardDefinition } from "@game/Models";

let crystals: CardDefinition[] = [];
let currentIndex = 0;

export function getSelection(): { crystals: CardDefinition[]; currentIndex: number } {
	return { crystals, currentIndex };
}

export function setSelection(next: CardDefinition[], index = 0): void {
	crystals = next;
	currentIndex = index;
}

export function setCurrentIndex(index: number): void {
	currentIndex = index;
}

export function clearSelection(): void {
	crystals = [];
	currentIndex = 0;
}
