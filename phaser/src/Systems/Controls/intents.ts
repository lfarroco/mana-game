import { State } from "@Models/State";
import {
	ShortcutAction,
	resolveShortcutAction,
	shouldIgnoreShortcutEvent,
} from "@Systems/Controls/shortcuts";

export type NavigationDirection = "up" | "down" | "left" | "right";

export type ControlIntent =
	| { type: "navigateButtons"; direction: NavigationDirection }
	| { type: "navigateBoard"; direction: NavigationDirection }
	| { type: "confirm" }
	| { type: "cancel" }
	| { type: "shortcut"; action: ShortcutAction };

export type ControlContext = "buttons" | "battleground";

const DIRECTION_KEY_MAP: Record<string, NavigationDirection> = {
	ArrowUp: "up",
	ArrowDown: "down",
	ArrowLeft: "left",
	ArrowRight: "right",
	w: "up",
	W: "up",
	s: "down",
	S: "down",
	a: "left",
	A: "left",
	d: "right",
	D: "right",
};

export const resolveKeyboardIntents = (
	context: ControlContext,
	state: State,
	key: string
): ControlIntent[] => {
	const direction = DIRECTION_KEY_MAP[key];
	if (direction) {
		return [{ type: context === "battleground" ? "navigateBoard" : "navigateButtons", direction }];
	}

	if (key === "Tab") {
		return [{ type: "navigateButtons", direction: "down" }];
	}

	if (key === "Enter") {
		return [{ type: "confirm" }];
	}

	if (key === "Escape") {
		return [{ type: "cancel" }];
	}

	if (context === "buttons" && key === " ") {
		return [{ type: "confirm" }];
	}

	if (context !== "battleground") {
		return [];
	}

	const shortcutAction = resolveShortcutAction(state, key);
	return shortcutAction ? [{ type: "shortcut", action: shortcutAction }] : [];
};

export type GamepadSnapshot = {
	buttons: boolean[];
	leftStickX: number;
	leftStickY: number;
};

export const GAMEPAD_AXIS_THRESHOLD = 0.5;

export const resolveGamepadIntents = (
	context: ControlContext,
	state: State,
	current: GamepadSnapshot,
	previous?: GamepadSnapshot
): ControlIntent[] => {
	const intents: ControlIntent[] = [];

	const wasPressed = (index: number) => previous?.buttons[index] ?? false;
	const isPressed = (index: number) => current.buttons[index] ?? false;
	const justPressed = (index: number) => isPressed(index) && !wasPressed(index);
	const navigateIntentType = context === "battleground" ? "navigateBoard" : "navigateButtons";

	if (justPressed(12)) intents.push({ type: navigateIntentType, direction: "up" });
	if (justPressed(13)) intents.push({ type: navigateIntentType, direction: "down" });
	if (justPressed(14)) intents.push({ type: navigateIntentType, direction: "left" });
	if (justPressed(15)) intents.push({ type: navigateIntentType, direction: "right" });

	if (justPressed(0)) intents.push({ type: "confirm" });
	if (justPressed(1) || justPressed(9)) intents.push({ type: "cancel" });

	const previousX = previous?.leftStickX ?? 0;
	const previousY = previous?.leftStickY ?? 0;

	if (current.leftStickY <= -GAMEPAD_AXIS_THRESHOLD && previousY > -GAMEPAD_AXIS_THRESHOLD) {
		intents.push({ type: navigateIntentType, direction: "up" });
	}
	if (current.leftStickY >= GAMEPAD_AXIS_THRESHOLD && previousY < GAMEPAD_AXIS_THRESHOLD) {
		intents.push({ type: navigateIntentType, direction: "down" });
	}
	if (current.leftStickX <= -GAMEPAD_AXIS_THRESHOLD && previousX > -GAMEPAD_AXIS_THRESHOLD) {
		intents.push({ type: navigateIntentType, direction: "left" });
	}
	if (current.leftStickX >= GAMEPAD_AXIS_THRESHOLD && previousX < GAMEPAD_AXIS_THRESHOLD) {
		intents.push({ type: navigateIntentType, direction: "right" });
	}

	if (context === "battleground" && justPressed(3)) {
		const shortcutAction = resolveShortcutAction(state, " ");
		if (shortcutAction) {
			intents.push({ type: "shortcut", action: shortcutAction });
		}
	}

	return intents;
};

export { shouldIgnoreShortcutEvent };