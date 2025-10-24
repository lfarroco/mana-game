import * as Phaser from "phaser";
import * as constants from "@Constants/constants";
import { CloudsBackground } from "../../components/cloudBackground/CloudsBackground";
import { getState } from "@Models/State";
import { returnToTitle } from "./effects/returnToTitle";
import { showTab } from "./components/effects/showTab";
import { backButton } from "./components/backButton";
import { optionsLabel } from "./components/optionsLabel";
import { tabButtons } from "./components/tabButtons";
import { currentTab } from "./components/effects/showTab";
import { Tabs } from "./components/Model";

export const LAYOUT = {
	TITLE_Y: 40,
	TITLE_FONT_SIZE: '48px',
	BACK_BUTTON_Y: 950,

	TAB_BUTTON_Y: 120,
	TAB_BUTTON_SPACING: 200,
	TAB_BUTTON_WIDTH: 180,

	OPTIONS_START_Y: 220,
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
	VALUE_TEXT_COLOR: '#FFD700',
} as const;

export default class OptionsScene extends Phaser.Scene {
	cloudsBackground!: CloudsBackground;


	constructor() {
		super(constants.SCENE_KEYS.OPTIONS);
	}

	create() {
		getState().currentScene = this;

		this.cloudsBackground = new CloudsBackground({ preset: 'aurora' });

		optionsLabel();

		tabButtons();

		showTab(currentTab.key as Tabs);

		backButton();

		this.input.keyboard?.on('keydown-ESC', returnToTitle);
	}
}

