import * as constants from "@Constants";
import * as UIButton from "@Components/Button/UIButton";
import * as OptionsScreen from "@Screens/Options/OptionsScreen";
import * as i18n from "@i18n/i18n";
import { env } from "@Env";
import { ScreenCtx } from "../../screenTracking";

// ---------------------------------------------------------------------------
// Module-level button registry — populated by create(), read by setActiveTab().
// Re-populated on every screen create (old Phaser objects are destroyed by
// Client.ts's scene cleanup on navigation).
// ---------------------------------------------------------------------------

let buttonIndex: Record<string, UIButton.Button> = {};

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
export function create(ctx: ScreenCtx<OptionsScreen.OptionsPhase>) {
	const tabButtonY = OptionsScreen.LAYOUT.TAB_BUTTON_Y;
	const buttonSpacing = OptionsScreen.LAYOUT.TAB_BUTTON_SPACING;
	const startX = constants.MIDDLE_SCREEN_X - buttonSpacing;

	buttonIndex["audio"] = UIButton.create({
		text: i18n.t("options.tabs.audio"),
		position: [startX, tabButtonY],
		callback: () => { void ctx.go("audio"); },
		width: OptionsScreen.LAYOUT.TAB_BUTTON_WIDTH,
	});

	buttonIndex["graphics"] = UIButton.create({
		text: i18n.t("options.tabs.graphics"),
		position: [startX + buttonSpacing, tabButtonY],
		callback: () => { void ctx.go("graphics"); },
		width: OptionsScreen.LAYOUT.TAB_BUTTON_WIDTH,
	});

	buttonIndex["game"] = UIButton.create({
		text: i18n.t("options.tabs.game"),
		position: [startX + buttonSpacing * 2, tabButtonY],
		callback: () => { void ctx.go("game"); },
		width: OptionsScreen.LAYOUT.TAB_BUTTON_WIDTH,
	});

	// Wrap all button containers in a single tracked parent so they are
	// destroyed automatically when the screen is torn down.
	const tabContainer = env.container(
		Object.values(buttonIndex).map((b) => b.container),
	);
	ctx.track(tabContainer, { id: OptionsScreen.OPTIONS_IDS.tabButtons });

	setActiveTab("audio");
}

/**
 * Update the visual state of all tab buttons to reflect the active tab.
 * Called from phase handlers after their content is rendered.
 */
export function setActiveTab(tab: OptionsScreen.OptionsPhase) {
	Object.keys(buttonIndex).forEach((tabKey) => {
		const button = buttonIndex[tabKey as OptionsScreen.OptionsPhase];
		if (tabKey === tab) {
			button.text.setColor(SELECTED_TAB_COLOR);
			button.text.setStroke(TAB_STROKE_COLOR, SELECTED_TAB_STROKE_WIDTH);
		} else {
			button.text.setColor(UNSELECTED_TAB_COLOR);
			button.text.setStroke(TAB_STROKE_COLOR, UNSELECTED_TAB_STROKE_WIDTH);
		}
	});
}
