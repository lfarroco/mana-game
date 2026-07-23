import * as CloudsBackground from "@Components/CloudsBackground/CloudsBackground";
import * as showTab from "@Screens/Options/Components/effects/showTab";
import * as backButton from "@Screens/Options/Components/backButton";
import * as optionsLabel from "@Screens/Options/Components/optionsLabel";
import * as tabButtons from "@Screens/Options/Components/tabButtons";
import * as Model from "@Screens/Options/Components/Model";
import { createEvent } from "@game/Models";
import { NavigationEvent } from "../../Events";

// ---------------------------------------------------------------------------
// Events
// ---------------------------------------------------------------------------

export type OptionsScreenEvents = {
	backToTitle: ReturnType<typeof createEvent<void>>;
};

export let events: OptionsScreenEvents;
let disposers: (() => void)[] = [];
let initialized = false;

export function init() {
	if (initialized) return;
	initialized = true;

	events = {
		backToTitle: createEvent<void>(),
	};

	disposers = [
		events.backToTitle.listen(() => NavigationEvent.toTitle.emit(undefined)),
	];
}

export function destroy() {
	disposers.forEach((d) => d());
	disposers = [];

	if (events) {
		events.backToTitle.clear();
	}

	initialized = false;
}

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

export function create() {
	init();

	new CloudsBackground.CloudsBackground({ preset: "aurora" });

	optionsLabel.create();

	tabButtons.create();

	showTab.showTab(showTab.currentTab.key as Model.Tabs);

	backButton.create();
}
