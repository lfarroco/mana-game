import { NavigationDirection } from "@Systems/Controls/intents";

export const getNextEncounterFocusIndex = (
	currentIndex: number | null,
	itemCount: number,
	direction: NavigationDirection
): number | null => {
	if (itemCount <= 0) {
		return null;
	}

	if (currentIndex === null) {
		return 0;
	}

	const delta = direction === "up" || direction === "left" ? -1 : 1;
	const next = currentIndex + delta;

	if (next < 0) {
		return itemCount - 1;
	}

	if (next >= itemCount) {
		return 0;
	}

	return next;
};