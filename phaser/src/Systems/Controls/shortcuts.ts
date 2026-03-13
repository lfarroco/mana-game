import { PhaseOption, PhaseType } from "@Core/Types";
import { State } from "@Models/State";

export type ShortcutAction =
	| { type: "skipPhase" }
	| { type: "purchaseUnit"; optionId: string }
	| { type: "selectEncounter"; optionId: string }
	| { type: "handleAction"; optionId: string };

const DIGIT_KEY_PATTERN = /^[1-9]$/;

const getCurrentOptions = (state: State): PhaseOption[] => {
	const currentOptions = state.session.current_options;

	if (!currentOptions) {
		return [];
	}

	return Array.isArray(currentOptions) ? currentOptions : currentOptions.options;
};

const getDigitIndex = (key: string): number | null => {
	if (!DIGIT_KEY_PATTERN.test(key)) {
		return null;
	}

	return Number.parseInt(key, 10) - 1;
};

const isSkippablePhase = (phase: PhaseType): boolean => {
	return (
		phase === "encounter" ||
		phase === "shop" ||
		phase === "orb_shop" ||
		phase === "upgrade_core" ||
		phase === "add_reaction_core"
	);
};

export const shouldIgnoreShortcutEvent = (event: KeyboardEvent): boolean => {
	if (event.altKey || event.ctrlKey || event.metaKey) {
		return true;
	}

	const target = event.target;
	if (!(target instanceof HTMLElement)) {
		return false;
	}

	const tagName = target.tagName.toLowerCase();
	return (
		target.isContentEditable ||
		tagName === "input" ||
		tagName === "textarea" ||
		tagName === "select"
	);
};

export const resolveShortcutAction = (state: State, key: string): ShortcutAction | null => {
	if (key === " ") {
		return isSkippablePhase(state.session.phase) ? { type: "skipPhase" } : null;
	}

	const digitIndex = getDigitIndex(key);
	if (digitIndex === null) {
		return null;
	}

	const option = getCurrentOptions(state)[digitIndex];
	if (!option) {
		return null;
	}

	switch (state.session.phase) {
		case "shop":
			return { type: "purchaseUnit", optionId: option.id };
		case "encounter":
			return { type: "selectEncounter", optionId: option.id };
		case "upgrade_core":
		case "add_reaction_core":
			return { type: "handleAction", optionId: option.id };
		default:
			return null;
	}
};
