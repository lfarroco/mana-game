import * as Phaser from "phaser";
import * as constants from "../../constants/constants";
import { State } from "../../Models/State";
import { UIButton } from "../../UI/UIButton";
import { CloudsBackground } from "../../components/cloudBackground/CloudsBackground";

export default class TitleScene extends Phaser.Scene {
	private gameTitle!: Phaser.GameObjects.Text;
	private state?: State;
	private cloudsBackground!: CloudsBackground; // Stored for potential future manipulation

	constructor() {
		super(constants.SCENE_KEYS.TITLE);
	}

	init(data: { state?: State }) {
		this.state = data.state;
	}

	preload() {
		// Add any assets you want to load for the title screen here
		// For now, we'll use simple text and shapes
	}

	create() {
		// Create the clouds background with auto-changing presets
		this.cloudsBackground = new CloudsBackground(this, {
			preset: 'nebula',
		});

		// Create the main title
		this.gameTitle = this.add.text(
			constants.MIDDLE_SCREEN_X,
			constants.MIDDLE_SCREEN_Y - 200,
			'MANA GAME',
			{
				...constants.titleTextConfig,
				fontSize: '72px',
				color: '#FFE55C',
				stroke: '#2D1810',
				strokeThickness: 12
			}
		).setOrigin(0.5);

		// Add a subtitle
		this.add.text(
			constants.MIDDLE_SCREEN_X,
			constants.MIDDLE_SCREEN_Y - 100,
			'A Strategic Battle Experience',
			{
				...constants.defaultTextConfig,
				fontSize: '32px',
				color: '#E8E8E8',
				stroke: '#1A1A2E',
				strokeThickness: 6
			}
		).setOrigin(0.5);

		// Create start button using UIButton component
		new UIButton(
			this,
			'START GAME',
			constants.MIDDLE_SCREEN_X,
			constants.MIDDLE_SCREEN_Y + 100,
			() => {
				this.startGame();
			}
		);

		// Add some visual flair - pulsing effect on title
		this.tweens.add({
			targets: this.gameTitle,
			scaleX: 1.05,
			scaleY: 1.05,
			duration: 2000,
			yoyo: true,
			repeat: -1,
			ease: 'Sine.easeInOut'
		});

		// Allow Enter key to start the game
		this.input.keyboard?.on('keydown-ENTER', () => {
			this.startGame();
		});

		// Note: Preset changing is now handled automatically by the CloudsBackground component
	}

	private startGame() {
		// Transition to the battleground scene
		this.cameras.main.fade(500, 0, 0, 0);
		this.cameras.main.once('camerafadeoutcomplete', () => {
			if (this.state) {
				this.scene.start(constants.SCENE_KEYS.BATTLEGROUND, this.state);
			} else {
				// If no state is provided, we might need to create a default one
				// or handle this case according to your game's logic
				this.scene.start(constants.SCENE_KEYS.BATTLEGROUND);
			}
		});
	}

	destroy() {
		// Clean up the clouds background when scene is destroyed
		if (this.cloudsBackground) {
			this.cloudsBackground.destroy();
		}
	}
}
