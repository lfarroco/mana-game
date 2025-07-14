import * as Phaser from "phaser";
import * as constants from "../../constants/constants";
import { UIButton } from "../../UI/UIButton";
import { CloudsBackground } from "../../components/cloudBackground/CloudsBackground";
import { getOption, setOption } from "../../Models/OptionsStore";

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
			constants.MIDDLE_SCREEN_Y - 300,
			'OPTIONS',
			{
				...constants.titleTextConfig,
				fontSize: '48px'
			}
		).setOrigin(0.5);

		let yOffset = -150; // Starting Y position for options

		// Sound On/Off
		this.createBooleanOption('Sound:', yOffset,
			() => this.currentSoundSetting,
			(value: boolean) => {
				this.currentSoundSetting = value;
				setOption('sound', value);
				this.soundValueText.setText(value ? 'ON' : 'OFF');
			},
			(text: Phaser.GameObjects.Text) => this.soundValueText = text
		);
		yOffset += 80;

		// Sound Volume
		this.createVolumeOption('Sound Volume:', yOffset,
			() => this.currentSoundVolume,
			(value: number) => {
				this.currentSoundVolume = value;
				setOption('soundVolume', value);
				this.soundVolumeValueText.setText((Math.round(value * 100)) + '%');
			},
			(text: Phaser.GameObjects.Text) => this.soundVolumeValueText = text
		);
		yOffset += 80;

		// Music On/Off
		this.createBooleanOption('Music:', yOffset,
			() => this.currentMusicSetting,
			(value: boolean) => {
				this.currentMusicSetting = value;
				setOption('music', value);
				this.musicValueText.setText(value ? 'ON' : 'OFF');
			},
			(text: Phaser.GameObjects.Text) => this.musicValueText = text
		);
		yOffset += 80;

		// Music Volume
		this.createVolumeOption('Music Volume:', yOffset,
			() => this.currentMusicVolume,
			(value: number) => {
				this.currentMusicVolume = value;
				setOption('musicVolume', value);
				this.musicVolumeValueText.setText((Math.round(value * 100)) + '%');
			},
			(text: Phaser.GameObjects.Text) => this.musicVolumeValueText = text
		);
		yOffset += 80;

		// Particles
		this.createMultiChoiceOption('Particles:', yOffset,
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
		yOffset += 80;

		// Debug Mode
		this.createBooleanOption('Debug:', yOffset,
			() => this.currentDebugSetting,
			(value: boolean) => {
				this.currentDebugSetting = value;
				setOption('debug', value);
				this.debugValueText.setText(value ? 'ON' : 'OFF');
			},
			(text: Phaser.GameObjects.Text) => this.debugValueText = text
		);
		yOffset += 80;

		// Game Speed
		this.createSpeedOption('Speed:', yOffset,
			() => this.currentSpeedSetting,
			(value: number) => {
				this.currentSpeedSetting = value;
				setOption('speed', value);
				this.speedValueText.setText(value.toFixed(1) + 'x');
			},
			(text: Phaser.GameObjects.Text) => this.speedValueText = text
		);

		// Create back button
		new UIButton(
			this,
			'BACK',
			constants.MIDDLE_SCREEN_X,
			constants.MIDDLE_SCREEN_Y + 350,
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
		this.add.text(
			constants.MIDDLE_SCREEN_X,
			yPos - 25,
			label,
			constants.titleTextConfig
		).setOrigin(0.5);

		// Create value display
		const valueText = this.add.text(
			constants.MIDDLE_SCREEN_X,
			yPos + 10,
			getValue() ? 'ON' : 'OFF',
			{
				...constants.titleTextConfig,
				color: '#FFD700'
			}
		).setOrigin(0.5);
		setTextRef(valueText);

		// Create toggle button
		new UIButton(
			this,
			'TOGGLE',
			constants.MIDDLE_SCREEN_X,
			yPos + 35,
			() => {
				const newValue = !getValue();
				setValue(newValue);
			},
			120
		);
	}

	private createVolumeOption(
		label: string,
		yPos: number,
		getValue: () => number,
		setValue: (value: number) => void,
		setTextRef: (text: Phaser.GameObjects.Text) => void
	) {
		// Create label
		this.add.text(
			constants.MIDDLE_SCREEN_X,
			yPos - 25,
			label,
			constants.titleTextConfig
		).setOrigin(0.5);

		// Create decrease button
		new UIButton(
			this,
			'-',
			constants.MIDDLE_SCREEN_X - 120,
			yPos + 10,
			() => {
				const newValue = Math.max(0, getValue() - 0.1);
				setValue(newValue);
			},
			60
		);

		// Create value display
		const valueText = this.add.text(
			constants.MIDDLE_SCREEN_X,
			yPos + 10,
			(Math.round(getValue() * 100)) + '%',
			{
				...constants.titleTextConfig,
				color: '#FFD700'
			}
		).setOrigin(0.5);
		setTextRef(valueText);

		// Create increase button
		new UIButton(
			this,
			'+',
			constants.MIDDLE_SCREEN_X + 120,
			yPos + 10,
			() => {
				const newValue = Math.min(1, getValue() + 0.1);
				setValue(newValue);
			},
			60
		);
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
		this.add.text(
			constants.MIDDLE_SCREEN_X,
			yPos - 25,
			label,
			constants.titleTextConfig
		).setOrigin(0.5);

		// Create decrease button
		new UIButton(
			this,
			'<',
			constants.MIDDLE_SCREEN_X - 150,
			yPos + 10,
			() => {
				const currentIndex = choices.indexOf(getValue());
				const newIndex = currentIndex > 0 ? currentIndex - 1 : choices.length - 1;
				setValue(choices[newIndex]);
			},
			80
		);

		// Create value display
		const valueText = this.add.text(
			constants.MIDDLE_SCREEN_X,
			yPos + 10,
			getValue().toUpperCase(),
			{
				...constants.titleTextConfig,
				color: '#FFD700'
			}
		).setOrigin(0.5);
		setTextRef(valueText);

		// Create increase button
		new UIButton(
			this,
			'>',
			constants.MIDDLE_SCREEN_X + 150,
			yPos + 10,
			() => {
				const currentIndex = choices.indexOf(getValue());
				const newIndex = currentIndex < choices.length - 1 ? currentIndex + 1 : 0;
				setValue(choices[newIndex]);
			},
			80
		);
	}

	private createSpeedOption(
		label: string,
		yPos: number,
		getValue: () => number,
		setValue: (value: number) => void,
		setTextRef: (text: Phaser.GameObjects.Text) => void
	) {
		// Create label
		this.add.text(
			constants.MIDDLE_SCREEN_X,
			yPos - 25,
			label,
			constants.titleTextConfig
		).setOrigin(0.5);

		// Create decrease button
		new UIButton(
			this,
			'-',
			constants.MIDDLE_SCREEN_X - 120,
			yPos + 10,
			() => {
				const newValue = Math.max(0.1, getValue() - 0.1);
				setValue(newValue);
			},
			60
		);

		// Create value display
		const valueText = this.add.text(
			constants.MIDDLE_SCREEN_X,
			yPos + 10,
			getValue().toFixed(1) + 'x',
			{
				...constants.titleTextConfig,
				color: '#FFD700'
			}
		).setOrigin(0.5);
		setTextRef(valueText);

		// Create increase button
		new UIButton(
			this,
			'+',
			constants.MIDDLE_SCREEN_X + 120,
			yPos + 10,
			() => {
				const newValue = Math.min(3.0, getValue() + 0.1);
				setValue(newValue);
			},
			60
		);
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
		this.cameras.main.fade(500, 0, 0, 0);
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
}
