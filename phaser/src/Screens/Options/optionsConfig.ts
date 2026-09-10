/**
 * Options scene configuration — layout constants, phase/event types, and the
 * context handed to the tab/menu builders.
 *
 * Kept separate from `OptionsScene.ts` so components (which need `LAYOUT` at
 * runtime and the context type) do not import the scene module — that keeps
 * the dependency graph acyclic.
 */

import { createEvent } from "@game/Models";

export type OptionsPhase = "audio" | "graphics" | "game";

export type OptionsScreenEvents = {
	backToTitle: ReturnType<typeof createEvent<void>>;
};

/** Context handed to the options sub-components. */
export type OptionsContext = {
	go: (phase: OptionsPhase) => void;
	events: OptionsScreenEvents;
};

export const LAYOUT = {
	TITLE_Y: 40,
	TITLE_FONT_SIZE: "48px",
	BACK_BUTTON_Y: 950,

	TAB_BUTTON_Y: 120,
	TAB_BUTTON_SPACING: 200,
	TAB_BUTTON_WIDTH: 180,

	OPTIONS_START_Y: 200,
	OPTIONS_LINE_HEIGHT: 150,

	LABEL_OFFSET_Y: 0,
	VALUE_OFFSET_Y: 70,
	MULTICHOICE_VALUE_OFFSET_Y: 70,
	SPEED_VALUE_OFFSET_Y: 70,
} as const;

export const BUTTONS = {
	BOOLEAN_TOGGLE_WIDTH: 120,

	VOLUME_BUTTON_OFFSET_X: 120,
	VOLUME_BUTTON_WIDTH: 60,

	MULTICHOICE_BUTTON_OFFSET_X: 150,
	MULTICHOICE_BUTTON_WIDTH: 80,

	SPEED_BUTTON_OFFSET_X: 120,
	SPEED_BUTTON_WIDTH: 60,
} as const;

export const STYLES = {
	VALUE_TEXT_COLOR: "#FFD700",
} as const;

export const OPTIONS_PHASES: readonly OptionsPhase[] = ["audio", "graphics", "game"];

export function isOptionsPhase(value: unknown): value is OptionsPhase {
	return typeof value === "string" && (OPTIONS_PHASES as readonly string[]).includes(value);
}
