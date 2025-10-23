import * as Phaser from "phaser";
import * as constants from "@Constants/constants";
import { Button, } from "../../UI/UIButton";
import { CloudsBackground } from "../../components/cloudBackground/CloudsBackground";
import { getState } from "@Models/State";
import { returnToTitle } from "./effects/returnToTitle";
import { showTab } from "./effects/showTab";
import { backButton } from "./components/backButton";
import { optionsLabel } from "./components/optionsLabel";
import { createTabButtons } from "./effects/createTabButtons";

export type TabType = 'audio' | 'graphics' | 'game';

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

export const ADJUSTMENTS = {
	VOLUME_STEP: 0.1,
	VOLUME_MIN: 0,
	VOLUME_MAX: 1,

	SPEED_STEP: 0.1,
	SPEED_MIN: 0.1,
	SPEED_MAX: 3.0,
} as const;

export const STYLES = {
	SELECTED_TAB_COLOR: '#FFD700',
	SELECTED_TAB_STROKE_WIDTH: 4,
	UNSELECTED_TAB_COLOR: '#FFFFFF',
	UNSELECTED_TAB_STROKE_WIDTH: 3,
	TAB_STROKE_COLOR: '#000000',
	VALUE_TEXT_COLOR: '#FFD700',
} as const;

export const ANIMATION = {
	FADE_DURATION: 500,
	FADE_COLOR: { r: 0, g: 0, b: 0 },
} as const;

export default class OptionsScene extends Phaser.Scene {
	cloudsBackground!: CloudsBackground;

	currentTab: TabType = 'audio';
	tabButtons: { [key in TabType]: Button } = {} as any;
	tabContent: Phaser.GameObjects.GameObject[] = [];

	constructor() {
		super(constants.SCENE_KEYS.OPTIONS);
	}

	create() {
		getState().currentScene = this;

		this.cloudsBackground = new CloudsBackground({ preset: 'aurora' });

		optionsLabel();

		createTabButtons();

		showTab(this.currentTab);

		backButton();

		this.input.keyboard?.on('keydown-ESC', returnToTitle);
	}
}

