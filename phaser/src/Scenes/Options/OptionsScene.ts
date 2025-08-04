import * as Phaser from "phaser";
import * as constants from "../../constants/constants";
import { UIButton } from "../../UI/UIButton";
import { CloudsBackground } from "../../components/cloudBackground/CloudsBackground";
import { getOption, setOption } from "../../Models/OptionsStore";

type TabType = 'audio' | 'graphics' | 'game';

// Layout Constants
const LAYOUT = {
	// Main UI positioning
	TITLE_Y: 40,
	TITLE_FONT_SIZE: '48px',
	BACK_BUTTON_Y: 950,

	// Tab system
	TAB_BUTTON_Y: 120,
	TAB_BUTTON_SPACING: 160,
	TAB_BUTTON_WIDTH: 140,

	// Options layout
	OPTIONS_START_Y: 220,
	OPTIONS_LINE_HEIGHT: 150,

	// Option element offsets
	LABEL_OFFSET_Y: 0,
	VALUE_OFFSET_Y: 70,
	MULTICHOICE_VALUE_OFFSET_Y: 50,
	SPEED_VALUE_OFFSET_Y: 50,
} as const;

// Button Constants
const BUTTONS = {
	// Boolean option buttons
	BOOLEAN_TOGGLE_WIDTH: 120,

	// Volume control buttons
	VOLUME_BUTTON_OFFSET_X: 120,
	VOLUME_BUTTON_WIDTH: 60,

	// Multi-choice buttons
	MULTICHOICE_BUTTON_OFFSET_X: 150,
	MULTICHOICE_BUTTON_WIDTH: 80,

	// Speed control buttons
	SPEED_BUTTON_OFFSET_X: 120,
	SPEED_BUTTON_WIDTH: 60,
} as const;

// Value adjustment constants
const ADJUSTMENTS = {
	VOLUME_STEP: 0.1,
	VOLUME_MIN: 0,
	VOLUME_MAX: 1,

	SPEED_STEP: 0.1,
	SPEED_MIN: 0.1,
	SPEED_MAX: 3.0,
} as const;

// Visual styling constants
const STYLES = {
	SELECTED_TAB_COLOR: '#FFD700',
	SELECTED_TAB_STROKE_WIDTH: 4,
	UNSELECTED_TAB_COLOR: '#FFFFFF',
	UNSELECTED_TAB_STROKE_WIDTH: 3,
	TAB_STROKE_COLOR: '#000000',
	VALUE_TEXT_COLOR: '#FFD700',
} as const;

// Animation constants
const ANIMATION = {
	FADE_DURATION: 500,
	FADE_COLOR: { r: 0, g: 0, b: 0 },
} as const;

export default class OptionsScene extends Phaser.Scene {
	private cloudsBackground!: CloudsBackground;

	// Text displays for each option
	private particlesValueText!: Phaser.GameObjects.Text;
	private soundValueText!: Phaser.GameObjects.Text;
	private musicValueText!: Phaser.GameObjects.Text;
	private soundVolumeValueText!: Phaser.GameObjects.Text;
	private musicVolumeValueText!: Phaser.GameObjects.Text;
	private debugValueText!: Phaser.GameObjects.Text;
	private speedValueText!: Phaser.GameObjects.Text;

	// Tab system
	private currentTab: TabType = 'audio';
	private tabButtons: { [key in TabType]: UIButton } = {} as any;
	private optionElements: Phaser.GameObjects.GameObject[] = [];

	// Current settings
	private currentParticlesSetting: 'low' | 'medium' | 'high' = 'medium';
	private currentSoundSetting: boolean = true;
	private currentMusicSetting: boolean = true;
	private currentSoundVolume: number = 0.4;
	private currentMusicVolume: number = 0.2;
	private currentDebugSetting: boolean = false;
	private currentSpeedSetting: number = 1;

	constructor() {
		super(constants.SCENE_KEYS.OPTIONS);
	}

	create() {
		// Create the clouds background 
		this.cloudsBackground = new CloudsBackground(this, {
			preset: 'aurora',
		});

		// Get current settings from OptionsStore
		this.currentParticlesSetting = getOption('particles');
		this.currentSoundSetting = getOption('sound');
		this.currentMusicSetting = getOption('music');
		this.currentSoundVolume = getOption('soundVolume');
		this.currentMusicVolume = getOption('musicVolume');
		this.currentDebugSetting = getOption('debug');
		this.currentSpeedSetting = getOption('speed');

		// Create title
		this.add.text(
			constants.MIDDLE_SCREEN_X,
			LAYOUT.TITLE_Y,
			'OPTIONS',
			{
				...constants.titleTextConfig,
				fontSize: LAYOUT.TITLE_FONT_SIZE
			}
		).setOrigin(0.5);

		// Create tab buttons
		this.createTabButtons();

		// Create initial tab content
		this.showTab(this.currentTab);

		// Create back button
		new UIButton(
			this,
			'BACK',
			constants.MIDDLE_SCREEN_X,
			LAYOUT.BACK_BUTTON_Y,
			() => {
				this.returnToTitle();
			}
		);

		// Allow ESC key to go back
		this.input.keyboard?.on('keydown-ESC', () => {
			this.returnToTitle();
		});
	}
	private createBooleanOption(
		label: string,
		yPos: number,
		getValue: () => boolean,
		setValue: (value: boolean) => void,
		setTextRef: (text: Phaser.GameObjects.Text) => void
	) {
		// Create label
		const labelText = this.add.text(
			constants.MIDDLE_SCREEN_X,
			yPos,
			label,
			constants.titleTextConfig
		).setOrigin(0.5);
		this.optionElements.push(labelText);

		// Create value display (hidden, kept for compatibility)
		const valueText = this.add.text(
			constants.MIDDLE_SCREEN_X,
			yPos + LAYOUT.VALUE_OFFSET_Y,
			getValue() ? 'ON' : 'OFF',
			{
				...constants.titleTextConfig,
				color: STYLES.VALUE_TEXT_COLOR
			}
		).setOrigin(0.5).setAlpha(0); // Hide the separate value display
		setTextRef(valueText);
		this.optionElements.push(valueText);

		// Create toggle button with current value as text
		const toggleButton = new UIButton(
			this,
			getValue() ? 'ON' : 'OFF',
			constants.MIDDLE_SCREEN_X,
			yPos + LAYOUT.VALUE_OFFSET_Y,
			() => {
				const newValue = !getValue();
				setValue(newValue);
				// Update button text when value changes
				toggleButton.buttonText.setText(newValue ? 'ON' : 'OFF');
			},
			BUTTONS.BOOLEAN_TOGGLE_WIDTH
		);
		this.optionElements.push(toggleButton);
	}

	private createVolumeOption(
		label: string,
		yPos: number,
		getValue: () => number,
		setValue: (value: number) => void,
		setTextRef: (text: Phaser.GameObjects.Text) => void
	) {
		// Create label
		const labelText = this.add.text(
			constants.MIDDLE_SCREEN_X,
			yPos,
			label,
			constants.titleTextConfig
		).setOrigin(0.5);
		this.optionElements.push(labelText);

		// Create decrease button
		const decreaseButton = new UIButton(
			this,
			'-',
			constants.MIDDLE_SCREEN_X - BUTTONS.VOLUME_BUTTON_OFFSET_X,
			yPos + LAYOUT.VALUE_OFFSET_Y,
			() => {
				const newValue = Math.max(ADJUSTMENTS.VOLUME_MIN, getValue() - ADJUSTMENTS.VOLUME_STEP);
				setValue(newValue);
			},
			BUTTONS.VOLUME_BUTTON_WIDTH
		);
		this.optionElements.push(decreaseButton);

		// Create value display
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

		// Create increase button
		const increaseButton = new UIButton(
			this,
			'+',
			constants.MIDDLE_SCREEN_X + BUTTONS.VOLUME_BUTTON_OFFSET_X,
			yPos + LAYOUT.VALUE_OFFSET_Y,
			() => {
				const newValue = Math.min(ADJUSTMENTS.VOLUME_MAX, getValue() + ADJUSTMENTS.VOLUME_STEP);
				setValue(newValue);
			},
			BUTTONS.VOLUME_BUTTON_WIDTH
		);
		this.optionElements.push(increaseButton);
	}

	private createMultiChoiceOption(
		label: string,
		yPos: number,
		choices: string[],
		getValue: () => string,
		setValue: (value: string) => void,
		setTextRef: (text: Phaser.GameObjects.Text) => void
	) {
		// Create label
		const labelText = this.add.text(
			constants.MIDDLE_SCREEN_X,
			yPos,
			label,
			constants.titleTextConfig
		).setOrigin(0.5);
		this.optionElements.push(labelText);

		// Create decrease button
		const decreaseButton = new UIButton(
			this,
			'<',
			constants.MIDDLE_SCREEN_X - BUTTONS.MULTICHOICE_BUTTON_OFFSET_X,
			yPos + LAYOUT.MULTICHOICE_VALUE_OFFSET_Y,
			() => {
				const currentIndex = choices.indexOf(getValue());
				const newIndex = currentIndex > 0 ? currentIndex - 1 : choices.length - 1;
				setValue(choices[newIndex]);
			},
			BUTTONS.MULTICHOICE_BUTTON_WIDTH
		);
		this.optionElements.push(decreaseButton);

		// Create value display
		const valueText = this.add.text(
			constants.MIDDLE_SCREEN_X,
			yPos + LAYOUT.MULTICHOICE_VALUE_OFFSET_Y,
			getValue().toUpperCase(),
			{
				...constants.titleTextConfig,
				color: STYLES.VALUE_TEXT_COLOR
			}
		).setOrigin(0.5);
		setTextRef(valueText);
		this.optionElements.push(valueText);

		// Create increase button
		const increaseButton = new UIButton(
			this,
			'>',
			constants.MIDDLE_SCREEN_X + BUTTONS.MULTICHOICE_BUTTON_OFFSET_X,
			yPos + LAYOUT.MULTICHOICE_VALUE_OFFSET_Y,
			() => {
				const currentIndex = choices.indexOf(getValue());
				const newIndex = currentIndex < choices.length - 1 ? currentIndex + 1 : 0;
				setValue(choices[newIndex]);
			},
			BUTTONS.MULTICHOICE_BUTTON_WIDTH
		);
		this.optionElements.push(increaseButton);
	}

	private createSpeedOption(
		label: string,
		yPos: number,
		getValue: () => number,
		setValue: (value: number) => void,
		setTextRef: (text: Phaser.GameObjects.Text) => void
	) {
		// Create label
		const labelText = this.add.text(
			constants.MIDDLE_SCREEN_X,
			yPos,
			label,
			constants.titleTextConfig
		).setOrigin(0.5);
		this.optionElements.push(labelText);

		// Create decrease button
		const decreaseButton = new UIButton(
			this,
			'-',
			constants.MIDDLE_SCREEN_X - BUTTONS.SPEED_BUTTON_OFFSET_X,
			yPos + LAYOUT.SPEED_VALUE_OFFSET_Y,
			() => {
				const newValue = Math.max(ADJUSTMENTS.SPEED_MIN, getValue() - ADJUSTMENTS.SPEED_STEP);
				setValue(newValue);
			},
			BUTTONS.SPEED_BUTTON_WIDTH
		);
		this.optionElements.push(decreaseButton);

		// Create value display
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

		// Create increase button
		const increaseButton = new UIButton(
			this,
			'+',
			constants.MIDDLE_SCREEN_X + BUTTONS.SPEED_BUTTON_OFFSET_X,
			yPos + LAYOUT.SPEED_VALUE_OFFSET_Y,
			() => {
				const newValue = Math.min(ADJUSTMENTS.SPEED_MAX, getValue() + ADJUSTMENTS.SPEED_STEP);
				setValue(newValue);
			},
			BUTTONS.SPEED_BUTTON_WIDTH
		);
		this.optionElements.push(increaseButton);
	}

	/**
	 * Update particle quality on all active CloudsBackground instances across all scenes
	 */
	private updateAllCloudsBackgrounds() {
		// Update the local clouds background
		if (this.cloudsBackground) {
			this.cloudsBackground.updateParticleQuality();
		}

		// Find and update CloudsBackground instances in other active scenes
		this.scene.manager.getScenes(true).forEach(scene => {
			// Check if scene has a cloudsBackground property
			if ((scene as any).cloudsBackground && typeof (scene as any).cloudsBackground.updateParticleQuality === 'function') {
				(scene as any).cloudsBackground.updateParticleQuality();
			}

			// Check for CloudsBackground in battleground setup system
			if ((scene as any).battlegroundSetupSystem?.cloudsBackground) {
				(scene as any).battlegroundSetupSystem.cloudsBackground.updateParticleQuality();
			}
		});
	}

	private returnToTitle() {
		// Transition back to title scene
		this.cameras.main.fade(ANIMATION.FADE_DURATION, ANIMATION.FADE_COLOR.r, ANIMATION.FADE_COLOR.g, ANIMATION.FADE_COLOR.b);
		this.cameras.main.once('camerafadeoutcomplete', () => {
			this.scene.start(constants.SCENE_KEYS.TITLE);
		});
	}

	destroy() {
		// Clean up the clouds background when scene is destroyed
		if (this.cloudsBackground) {
			this.cloudsBackground.destroy();
		}
	}

	private createTabButtons() {
		const tabButtonY = LAYOUT.TAB_BUTTON_Y;
		const buttonSpacing = LAYOUT.TAB_BUTTON_SPACING;
		const startX = constants.MIDDLE_SCREEN_X - buttonSpacing;

		// Audio Tab
		this.tabButtons.audio = new UIButton(
			this,
			'AUDIO',
			startX,
			tabButtonY,
			() => this.showTab('audio'),
			LAYOUT.TAB_BUTTON_WIDTH
		);

		// Graphics Tab
		this.tabButtons.graphics = new UIButton(
			this,
			'GRAPHICS',
			startX + buttonSpacing,
			tabButtonY,
			() => this.showTab('graphics'),
			LAYOUT.TAB_BUTTON_WIDTH
		);

		// Game Tab
		this.tabButtons.game = new UIButton(
			this,
			'GAME',
			startX + buttonSpacing * 2,
			tabButtonY,
			() => this.showTab('game'),
			LAYOUT.TAB_BUTTON_WIDTH
		);

		this.updateTabButtonStates();
	}

	private updateTabButtonStates() {
		// Update button colors based on selected tab
		Object.keys(this.tabButtons).forEach(tabKey => {
			const tab = tabKey as TabType;
			const button = this.tabButtons[tab];

			if (tab === this.currentTab) {
				// Selected tab - gold color
				button.buttonText.setColor(STYLES.SELECTED_TAB_COLOR);
				button.buttonText.setStroke(STYLES.TAB_STROKE_COLOR, STYLES.SELECTED_TAB_STROKE_WIDTH);
			} else {
				// Unselected tab - white color
				button.buttonText.setColor(STYLES.UNSELECTED_TAB_COLOR);
				button.buttonText.setStroke(STYLES.TAB_STROKE_COLOR, STYLES.UNSELECTED_TAB_STROKE_WIDTH);
			}
		});
	}

	private showTab(tabType: TabType) {
		this.currentTab = tabType;
		this.clearOptionElements();
		this.updateTabButtonStates();

		const startY = LAYOUT.OPTIONS_START_Y;
		const lineHeight = LAYOUT.OPTIONS_LINE_HEIGHT;

		switch (tabType) {
			case 'audio':
				this.createAudioOptions(startY, lineHeight);
				break;
			case 'graphics':
				this.createGraphicsOptions(startY);
				break;
			case 'game':
				this.createGameOptions(startY, lineHeight);
				break;
		}
	}

	private clearOptionElements() {
		this.optionElements.forEach(element => {
			element.destroy();
		});
		this.optionElements = [];
	}

	private createAudioOptions(startY: number, lineHeight: number) {
		// Sound On/Off
		this.createBooleanOption('Sound', startY,
			() => this.currentSoundSetting,
			(value: boolean) => {
				this.currentSoundSetting = value;
				setOption('sound', value);
				this.soundValueText.setText(value ? 'ON' : 'OFF');
			},
			(text: Phaser.GameObjects.Text) => this.soundValueText = text
		);

		// Sound Volume
		this.createVolumeOption('Sound Volume', startY + lineHeight,
			() => this.currentSoundVolume,
			(value: number) => {
				this.currentSoundVolume = value;
				setOption('soundVolume', value);
				this.soundVolumeValueText.setText((Math.round(value * 100)) + '%');
			},
			(text: Phaser.GameObjects.Text) => this.soundVolumeValueText = text
		);

		// Music On/Off
		this.createBooleanOption('Music', startY + lineHeight * 2,
			() => this.currentMusicSetting,
			(value: boolean) => {
				this.currentMusicSetting = value;
				setOption('music', value);
				this.musicValueText.setText(value ? 'ON' : 'OFF');
			},
			(text: Phaser.GameObjects.Text) => this.musicValueText = text
		);

		// Music Volume
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

	private createGraphicsOptions(startY: number) {
		// Particles
		this.createMultiChoiceOption('Particles', startY,
			['low', 'medium', 'high'],
			() => this.currentParticlesSetting,
			(value: string) => {
				this.currentParticlesSetting = value as 'low' | 'medium' | 'high';
				setOption('particles', this.currentParticlesSetting);
				this.particlesValueText.setText(value.toUpperCase());
				// Update all active CloudsBackground instances
				this.updateAllCloudsBackgrounds();
			},
			(text: Phaser.GameObjects.Text) => this.particlesValueText = text
		);
	}

	private createGameOptions(startY: number, lineHeight: number) {
		// Debug Mode
		this.createBooleanOption('Debug', startY,
			() => this.currentDebugSetting,
			(value: boolean) => {
				this.currentDebugSetting = value;
				setOption('debug', value);
				this.debugValueText.setText(value ? 'ON' : 'OFF');
			},
			(text: Phaser.GameObjects.Text) => this.debugValueText = text
		);

		// Game Speed
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
