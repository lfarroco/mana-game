import { NavigationDirection } from "@Systems/Controls/intents";

export type FocusableEntry = {
	id: string;
	x: number;
	y: number;
};

const compareTopLeft = (left: FocusableEntry, right: FocusableEntry) => {
	if (left.y !== right.y) {
		return left.y - right.y;
	}
	return left.x - right.x;
};

const compareBottomRight = (left: FocusableEntry, right: FocusableEntry) => {
	if (left.y !== right.y) {
		return right.y - left.y;
	}
	return right.x - left.x;
};

const getFallbackEntry = (
	entries: FocusableEntry[],
	direction: NavigationDirection
): FocusableEntry | null => {
	if (entries.length === 0) {
		return null;
	}

	const sorted = [...entries].sort(
		direction === "up" || direction === "left" ? compareBottomRight : compareTopLeft
	);
	return sorted[0] ?? null;
};

export const findNextFocusable = (
	entries: FocusableEntry[],
	currentId: string | null,
	direction: NavigationDirection
): FocusableEntry | null => {
	if (entries.length === 0) {
		return null;
	}

	if (!currentId) {
		return getFallbackEntry(entries, "down");
	}

	const current = entries.find((entry) => entry.id === currentId);
	if (!current) {
		return getFallbackEntry(entries, "down");
	}

	const candidates = entries
		.filter((entry) => entry.id !== current.id)
		.map((entry) => {
			const deltaX = entry.x - current.x;
			const deltaY = entry.y - current.y;

			switch (direction) {
				case "up":
					return deltaY < 0
						? { entry, primaryDelta: Math.abs(deltaY), secondaryDelta: Math.abs(deltaX) }
						: null;
				case "down":
					return deltaY > 0
						? { entry, primaryDelta: deltaY, secondaryDelta: Math.abs(deltaX) }
						: null;
				case "left":
					return deltaX < 0
						? { entry, primaryDelta: Math.abs(deltaX), secondaryDelta: Math.abs(deltaY) }
						: null;
				case "right":
					return deltaX > 0
						? { entry, primaryDelta: deltaX, secondaryDelta: Math.abs(deltaY) }
						: null;
			}
		})
		.filter((candidate): candidate is NonNullable<typeof candidate> => candidate !== null)
		.sort((left, right) => {
			if (left.primaryDelta !== right.primaryDelta) {
				return left.primaryDelta - right.primaryDelta;
			}
			if (left.secondaryDelta !== right.secondaryDelta) {
				return left.secondaryDelta - right.secondaryDelta;
			}
			return compareTopLeft(left.entry, right.entry);
		});

	return candidates[0]?.entry ?? getFallbackEntry(entries, direction);
};