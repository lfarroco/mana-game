import * as constants from "@Constants";
import * as UIButton from "@Components/Button/UIButton";
import { LAYOUT, type OptionsContext, type OptionsPhase } from "@Screens/Options/optionsConfig";
import * as i18n from "@i18n/i18n";

// ---------------------------------------------------------------------------
// Module-level button registry — populated by create(), read by setActiveTab().
// Re-populated on every scene create; reset() on shutdown drops the references
// to the destroyed buttons.
// ---------------------------------------------------------------------------

const buttonIndex: Record<string, UIButton.Button> = {};

const SELECTED_TAB_COLOR = "#FFD700";
const SELECTED_TAB_STROKE_WIDTH = 4;
const UNSELECTED_TAB_COLOR = "#FFFFFF";
const UNSELECTED_TAB_STROKE_WIDTH = 3;
const TAB_STROKE_COLOR = "#000000";

/**
 * Create the three tab buttons (audio / graphics / game) and register them
 * for visual-state updates.  Called once from the persistent create() layer
 * — the buttons survive tab (phase) switches and are destroyed with the screen.
 */
export function create(ctx: OptionsContext) {
	const tabButtonY = LAYOUT.TAB_BUTTON_Y;
	const buttonSpacing = LAYOUT.TAB_BUTTON_SPACING;
	const startX = constants.MIDDLE_SCREEN_X - buttonSpacing;

	buttonIndex["audio"] = UIButton.create({
		text: i18n.t("options.tabs.audio"),
		position: [startX, tabButtonY],
		callback: () => {
			void ctx.go("audio");
		},
		width: LAYOUT.TAB_BUTTON_WIDTH,
	});

	buttonIndex["graphics"] = UIButton.create({
		text: i18n.t("options.tabs.graphics"),
		position: [startX + buttonSpacing, tabButtonY],
		callback: () => {
			void ctx.go("graphics");
		},
		width: LAYOUT.TAB_BUTTON_WIDTH,
	});

	buttonIndex["game"] = UIButton.create({
		text: i18n.t("options.tabs.game"),
		position: [startX + buttonSpacing * 2, tabButtonY],
		callback: () => {
			void ctx.go("game");
		},
		width: LAYOUT.TAB_BUTTON_WIDTH,
	});

	setActiveTab("audio");
}

/**
 * Drop the registry entries on scene shutdown. Phaser already destroyed the
 * buttons; this just releases the module-level references to them.
 */
export function reset(): void {
	for (const key of Object.keys(buttonIndex)) {
		delete buttonIndex[key];
	}
}

/**
 * Update the visual state of all tab buttons to reflect the active tab.
 * Called from tab builders after their content is rendered.
 */
export function setActiveTab(tab: OptionsPhase) {
	Object.keys(buttonIndex).forEach((tabKey) => {
		const button = buttonIndex[tabKey as OptionsPhase];
		if (tabKey === tab) {
			button.text.setColor(SELECTED_TAB_COLOR);
			button.text.setStroke(TAB_STROKE_COLOR, SELECTED_TAB_STROKE_WIDTH);
		} else {
			button.text.setColor(UNSELECTED_TAB_COLOR);
			button.text.setStroke(TAB_STROKE_COLOR, UNSELECTED_TAB_STROKE_WIDTH);
		}
	});
}
