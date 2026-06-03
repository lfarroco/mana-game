import * as Phaser from "phaser";
import { CloudsBackground } from "Client/Components/cloudBackground/CloudsBackground";
import { returnToTitle } from "@Screens/Options/Effects/returnToTitle";
import { showTab } from "@Screens/Options/Components/effects/showTab";
import { backButton } from "@Screens/Options/Components/backButton";
import { optionsLabel } from "@Screens/Options/Components/optionsLabel";
import { tabButtons } from "@Screens/Options/Components/tabButtons";
import { currentTab } from "@Screens/Options/Components/effects/showTab";
import { Tabs } from "@Screens/Options/Components/Model";
import * as ControlsSystem from "@Systems/Controls";

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

export default class OptionsScreen extends Phaser.Scene {
	cloudsBackground!: CloudsBackground;

	create() {

		this.cloudsBackground = new CloudsBackground({ preset: "aurora" });

		optionsLabel();

		tabButtons();

		showTab(currentTab.key as Tabs);

		backButton();

		ControlsSystem.init({ context: "buttons", onCancel: returnToTitle });
	}
}
