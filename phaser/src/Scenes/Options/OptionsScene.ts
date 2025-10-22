import * as Phaser from "phaser";
import * as constants from "@Constants/constants";
import { Button, createUIButton, } from "../../UI/UIButton";
import { CloudsBackground } from "../../components/cloudBackground/CloudsBackground";
import { getOption, setOption } from "@Models/OptionsStore";
import { vec2 } from "@Models/Geometry";
import { SetText } from "@PhaserIO";
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

const BUTTONS = {
	BOOLEAN_TOGGLE_WIDTH: 120,

	VOLUME_BUTTON_OFFSET_X: 120,
	VOLUME_BUTTON_WIDTH: 60,

	MULTICHOICE_BUTTON_OFFSET_X: 150,
	MULTICHOICE_BUTTON_WIDTH: 80,

	SPEED_BUTTON_OFFSET_X: 120,
	SPEED_BUTTON_WIDTH: 60,
} as const;

const ADJUSTMENTS = {
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

	particlesValueText!: Phaser.GameObjects.Text;
	soundValueText!: Phaser.GameObjects.Text;
	musicValueText!: Phaser.GameObjects.Text;
	soundVolumeValueText!: Phaser.GameObjects.Text;
	musicVolumeValueText!: Phaser.GameObjects.Text;
	debugValueText!: Phaser.GameObjects.Text;
	speedValueText!: Phaser.GameObjects.Text;

	currentTab: TabType = 'audio';
	tabButtons: { [key in TabType]: Button } = {} as any;
	optionElements: Phaser.GameObjects.GameObject[] = [];

	currentParticlesSetting: 'low' | 'medium' | 'high' = 'medium';
	currentSoundSetting: boolean = true;
	currentMusicSetting: boolean = true;
	currentSoundVolume: number = 0.4;
	currentMusicVolume: number = 0.2;
	currentDebugSetting: boolean = false;
	currentSpeedSetting: number = 1;

	constructor() {
		super(constants.SCENE_KEYS.OPTIONS);
	}

	create() {
		getState().currentScene = this;
		this.cloudsBackground = new CloudsBackground({
			preset: 'aurora',
		});

		this.currentParticlesSetting = getOption('particles');
		this.currentSoundSetting = getOption('sound');
		this.currentMusicSetting = getOption('music');
		this.currentSoundVolume = getOption('soundVolume');
		this.currentMusicVolume = getOption('musicVolume');
		this.currentDebugSetting = getOption('debug');
		this.currentSpeedSetting = getOption('speed');

		optionsLabel();

		createTabButtons();

		showTab(this.currentTab);

		backButton();

		this.input.keyboard?.on('keydown-ESC', returnToTitle);
	}

	createBooleanOption(
		label: string,
		yPos: number,
		getValue: () => boolean,
		setValue: (value: boolean) => void,
		setTextRef: (text: Phaser.GameObjects.Text) => void
	) {

		const labelText = this.add.text(
			constants.MIDDLE_SCREEN_X,
			yPos,
			label,
			constants.titleTextConfig
		).setOrigin(0.5);
		this.optionElements.push(labelText);

		const valueText = this.add.text(
			constants.MIDDLE_SCREEN_X,
			yPos + LAYOUT.VALUE_OFFSET_Y,
			getValue() ? 'ON' : 'OFF',
			{
				...constants.titleTextConfig,
				fontSize: '12px',
				color: STYLES.VALUE_TEXT_COLOR
			}
		).setOrigin(0.5).setAlpha(0);
		setTextRef(valueText);
		this.optionElements.push(valueText);

		const toggleButton = createUIButton(
			getValue() ? 'ON' : 'OFF',
			vec2(
				constants.MIDDLE_SCREEN_X,
				yPos + LAYOUT.VALUE_OFFSET_Y,
			),
			() => {
				const newValue = !getValue();
				setValue(newValue);
				SetText(toggleButton.text, newValue ? 'ON' : 'OFF')
			},
			BUTTONS.BOOLEAN_TOGGLE_WIDTH
		);
		this.optionElements.push(toggleButton.container);
	}

	createVolumeOption(
		label: string,
		yPos: number,
		getValue: () => number,
		setValue: (value: number) => void,
		setTextRef: (text: Phaser.GameObjects.Text) => void
	) {
		const labelText = this.add.text(
			constants.MIDDLE_SCREEN_X,
			yPos,
			label,
			constants.titleTextConfig
		).setOrigin(0.5);
		this.optionElements.push(labelText);

		const decreaseButton = createUIButton(
			'-',
			vec2(
				constants.MIDDLE_SCREEN_X - BUTTONS.VOLUME_BUTTON_OFFSET_X,
				yPos + LAYOUT.VALUE_OFFSET_Y,
			),
			() => {
				const newValue = Math.max(ADJUSTMENTS.VOLUME_MIN, getValue() - ADJUSTMENTS.VOLUME_STEP);
				setValue(newValue);
			},
			BUTTONS.VOLUME_BUTTON_WIDTH
		);
		this.optionElements.push(decreaseButton.container);

		const valueText = this.add.text(
			constants.MIDDLE_SCREEN_X,
			yPos + LAYOUT.VALUE_OFFSET_Y,
			(Math.round(getValue() * 100)) + '%',
			{
				...constants.titleTextConfig,
				color: STYLES.VALUE_TEXT_COLOR
			}
		).setOrigin(0.5);
		setTextRef(valueText);
		this.optionElements.push(valueText);

		const increaseButton = createUIButton(
			'+',
			vec2(
				constants.MIDDLE_SCREEN_X + BUTTONS.VOLUME_BUTTON_OFFSET_X,
				yPos + LAYOUT.VALUE_OFFSET_Y,
			),
			() => {
				const newValue = Math.min(ADJUSTMENTS.VOLUME_MAX, getValue() + ADJUSTMENTS.VOLUME_STEP);
				setValue(newValue);
			},
			BUTTONS.VOLUME_BUTTON_WIDTH
		);
		this.optionElements.push(increaseButton.container);
	}

	createMultiChoiceOption(
		label: string,
		yPos: number,
		choices: string[],
		getValue: () => string,
		setValue: (value: string) => void,
		setTextRef: (text: Phaser.GameObjects.Text) => void
	) {
		const labelText = this.add.text(
			constants.MIDDLE_SCREEN_X,
			yPos,
			label,
			constants.titleTextConfig
		).setOrigin(0.5);
		this.optionElements.push(labelText);

		const decreaseButton = createUIButton(
			'<',
			vec2(
				constants.MIDDLE_SCREEN_X - BUTTONS.MULTICHOICE_BUTTON_OFFSET_X,
				yPos + LAYOUT.MULTICHOICE_VALUE_OFFSET_Y,
			),
			() => {
				const currentIndex = choices.indexOf(getValue());
				const newIndex = currentIndex > 0 ? currentIndex - 1 : choices.length - 1;
				setValue(choices[newIndex]);
			},
			BUTTONS.MULTICHOICE_BUTTON_WIDTH
		);
		this.optionElements.push(decreaseButton.container);

		const valueText = this.add.text(
			constants.MIDDLE_SCREEN_X,
			yPos + LAYOUT.MULTICHOICE_VALUE_OFFSET_Y,
			getValue().toUpperCase(),
			{
				...constants.titleTextConfig,
				fontSize: '32px',
				color: STYLES.VALUE_TEXT_COLOR
			}
		).setOrigin(0.5);
		setTextRef(valueText);
		this.optionElements.push(valueText);

		const increaseButton = createUIButton(
			'>',
			vec2(
				constants.MIDDLE_SCREEN_X + BUTTONS.MULTICHOICE_BUTTON_OFFSET_X,
				yPos + LAYOUT.MULTICHOICE_VALUE_OFFSET_Y,
			),
			() => {
				const currentIndex = choices.indexOf(getValue());
				const newIndex = currentIndex < choices.length - 1 ? currentIndex + 1 : 0;
				setValue(choices[newIndex]);
			},
			BUTTONS.MULTICHOICE_BUTTON_WIDTH
		);
		this.optionElements.push(increaseButton.container);
	}

	createSpeedOption(
		label: string,
		yPos: number,
		getValue: () => number,
		setValue: (value: number) => void,
		setTextRef: (text: Phaser.GameObjects.Text) => void
	) {

		const labelText = this.add.text(
			constants.MIDDLE_SCREEN_X,
			yPos,
			label,
			constants.titleTextConfig
		).setOrigin(0.5);
		this.optionElements.push(labelText);

		const decreaseButton = createUIButton(
			'-',
			vec2(
				constants.MIDDLE_SCREEN_X - BUTTONS.SPEED_BUTTON_OFFSET_X,
				yPos + LAYOUT.SPEED_VALUE_OFFSET_Y,
			),
			() => {
				const newValue = Math.max(ADJUSTMENTS.SPEED_MIN, getValue() - ADJUSTMENTS.SPEED_STEP);
				setValue(newValue);
			},
			BUTTONS.SPEED_BUTTON_WIDTH
		);
		this.optionElements.push(decreaseButton.container);

		const valueText = this.add.text(
			constants.MIDDLE_SCREEN_X,
			yPos + LAYOUT.SPEED_VALUE_OFFSET_Y,
			getValue().toFixed(1) + 'x',
			{
				...constants.titleTextConfig,
				color: STYLES.VALUE_TEXT_COLOR
			}
		).setOrigin(0.5);
		setTextRef(valueText);
		this.optionElements.push(valueText);

		const increaseButton = createUIButton(
			'+',
			vec2(constants.MIDDLE_SCREEN_X + BUTTONS.SPEED_BUTTON_OFFSET_X, yPos + LAYOUT.SPEED_VALUE_OFFSET_Y),
			() => {
				const newValue = Math.min(ADJUSTMENTS.SPEED_MAX, getValue() + ADJUSTMENTS.SPEED_STEP);
				setValue(newValue);
			},
			BUTTONS.SPEED_BUTTON_WIDTH
		);
		this.optionElements.push(increaseButton.container);
	}

	updateAllCloudsBackgrounds() {

		if (this.cloudsBackground) {
			this.cloudsBackground.updateParticleQuality();
		}

		this.scene.manager.getScenes(true).forEach(scene => {
			if ((scene as any).cloudsBackground && typeof (scene as any).cloudsBackground.updateParticleQuality === 'function') {
				(scene as any).cloudsBackground.updateParticleQuality();
			}

			if ((scene as any).battlegroundSetupSystem?.cloudsBackground) {
				(scene as any).battlegroundSetupSystem.cloudsBackground.updateParticleQuality();
			}
		});
	}

	createAudioOptions(startY: number, lineHeight: number) {
		this.createBooleanOption('Sound', startY,
			() => this.currentSoundSetting,
			(value: boolean) => {
				this.currentSoundSetting = value;
				setOption('sound', value);
				this.soundValueText.setText(value ? 'ON' : 'OFF');
			},
			(text: Phaser.GameObjects.Text) => this.soundValueText = text
		);

		this.createVolumeOption('Sound Volume', startY + lineHeight,
			() => this.currentSoundVolume,
			(value: number) => {
				this.currentSoundVolume = value;
				setOption('soundVolume', value);
				this.soundVolumeValueText.setText((Math.round(value * 100)) + '%');
			},
			(text: Phaser.GameObjects.Text) => this.soundVolumeValueText = text
		);

		this.createBooleanOption('Music', startY + lineHeight * 2,
			() => this.currentMusicSetting,
			(value: boolean) => {
				this.currentMusicSetting = value;
				setOption('music', value);
				this.musicValueText.setText(value ? 'ON' : 'OFF');
			},
			(text: Phaser.GameObjects.Text) => this.musicValueText = text
		);

		this.createVolumeOption('Music Volume', startY + lineHeight * 3,
			() => this.currentMusicVolume,
			(value: number) => {
				this.currentMusicVolume = value;
				setOption('musicVolume', value);
				this.musicVolumeValueText.setText((Math.round(value * 100)) + '%');
			},
			(text: Phaser.GameObjects.Text) => this.musicVolumeValueText = text
		);
	}

	createGraphicsOptions(startY: number) {
		this.createMultiChoiceOption('Particles', startY,
			['low', 'medium', 'high'],
			() => this.currentParticlesSetting,
			(value: string) => {
				this.currentParticlesSetting = value as 'low' | 'medium' | 'high';
				setOption('particles', this.currentParticlesSetting);
				this.particlesValueText.setText(value.toUpperCase());
				this.updateAllCloudsBackgrounds();
			},
			(text: Phaser.GameObjects.Text) => this.particlesValueText = text
		);
	}

	createGameOptions(startY: number, lineHeight: number) {
		this.createBooleanOption('Debug', startY,
			() => this.currentDebugSetting,
			(value: boolean) => {
				this.currentDebugSetting = value;
				setOption('debug', value);
				this.debugValueText.setText(value ? 'ON' : 'OFF');
			},
			(text: Phaser.GameObjects.Text) => this.debugValueText = text
		);

		this.createSpeedOption('Speed', startY + lineHeight,
			() => this.currentSpeedSetting,
			(value: number) => {
				this.currentSpeedSetting = value;
				setOption('speed', value);
				this.speedValueText.setText(value.toFixed(1) + 'x');
			},
			(text: Phaser.GameObjects.Text) => this.speedValueText = text
		);
	}
}

