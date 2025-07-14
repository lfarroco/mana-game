import * as Phaser from "phaser";
import * as constants from "../../constants/constants";
import { UIButton } from "../../UI/UIButton";
import { CloudsBackground } from "../../components/cloudBackground/CloudsBackground";
import { getOption, setOption } from "../../Models/OptionsStore";

export default class OptionsScene extends Phaser.Scene {
	private cloudsBackground!: CloudsBackground;
	private particlesValueText!: Phaser.GameObjects.Text;
	private currentParticlesSetting: 'low' | 'medium' | 'high' = 'medium';

	constructor() {
		super(constants.SCENE_KEYS.OPTIONS);
	}

	create() {
		// Create the clouds background 
		this.cloudsBackground = new CloudsBackground(this, {
			preset: 'aurora',
		});

		// Get current particles setting
		this.currentParticlesSetting = getOption('particles');

		// Create title
		this.add.text(
			constants.MIDDLE_SCREEN_X,
			constants.MIDDLE_SCREEN_Y - 250,
			'OPTIONS',
			{
				...constants.titleTextConfig,
				fontSize: '48px'
			}
		).setOrigin(0.5);

		// Create particles setting section
		this.add.text(
			constants.MIDDLE_SCREEN_X,
			constants.MIDDLE_SCREEN_Y - 100,
			'Particles:',
			constants.titleTextConfig
		).setOrigin(0.5);

		// Create decrease particles button
		new UIButton(
			this,
			'<',
			constants.MIDDLE_SCREEN_X - 150,
			constants.MIDDLE_SCREEN_Y - 50,
			() => {
				this.changeParticlesSetting(-1);
			},
			80 // Smaller width for navigation buttons
		);

		// Create particles value display
		this.particlesValueText = this.add.text(
			constants.MIDDLE_SCREEN_X,
			constants.MIDDLE_SCREEN_Y - 50,
			this.currentParticlesSetting.toUpperCase(),
			{
				...constants.titleTextConfig,
				color: '#FFD700' // Gold color for the value
			}
		).setOrigin(0.5);

		// Create increase particles button
		new UIButton(
			this,
			'>',
			constants.MIDDLE_SCREEN_X + 150,
			constants.MIDDLE_SCREEN_Y - 50,
			() => {
				this.changeParticlesSetting(1);
			},
			80 // Smaller width for navigation buttons
		);

		// Create back button
		new UIButton(
			this,
			'BACK',
			constants.MIDDLE_SCREEN_X,
			constants.MIDDLE_SCREEN_Y + 200,
			() => {
				this.returnToTitle();
			}
		);

		// Allow ESC key to go back
		this.input.keyboard?.on('keydown-ESC', () => {
			this.returnToTitle();
		});
	}

	private changeParticlesSetting(direction: number) {
		const settings: ('low' | 'medium' | 'high')[] = ['low', 'medium', 'high'];
		const currentIndex = settings.indexOf(this.currentParticlesSetting);
		let newIndex = currentIndex + direction;

		// Wrap around
		if (newIndex < 0) {
			newIndex = settings.length - 1;
		} else if (newIndex >= settings.length) {
			newIndex = 0;
		}

		this.currentParticlesSetting = settings[newIndex];
		this.particlesValueText.setText(this.currentParticlesSetting.toUpperCase());

		// Save the setting
		setOption('particles', this.currentParticlesSetting);
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
