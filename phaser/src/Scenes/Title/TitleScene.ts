import * as Phaser from "phaser";
import { SCENE_KEYS, SCREEN_WIDTH, SCREEN_HEIGHT, MIDDLE_SCREEN_X, MIDDLE_SCREEN_Y, titleTextConfig, defaultTextConfig } from "../../constants/constants";
import { State } from "../../Models/State";
import { UIButton } from "../../UI/UIButton";

export default class TitleScene extends Phaser.Scene {
	private gameTitle!: Phaser.GameObjects.Text;
	private state?: State;

	constructor() {
		super(SCENE_KEYS.TITLE);
	}

	init(data: { state?: State }) {
		this.state = data.state;
	}

	preload() {
		// Add any assets you want to load for the title screen here
		// For now, we'll use simple text and shapes
	}

	create() {
		// Create a dark background
		this.add.rectangle(
			MIDDLE_SCREEN_X,
			MIDDLE_SCREEN_Y,
			SCREEN_WIDTH,
			SCREEN_HEIGHT,
			0x001122
		);

		// Create the main title
		this.gameTitle = this.add.text(
			MIDDLE_SCREEN_X,
			MIDDLE_SCREEN_Y - 200,
			'MANA GAME',
			{
				...titleTextConfig,
				fontSize: '72px',
				color: '#FFD700',
				stroke: '#8B4513',
				strokeThickness: 8
			}
		).setOrigin(0.5);

		// Add a subtitle
		this.add.text(
			MIDDLE_SCREEN_X,
			MIDDLE_SCREEN_Y - 100,
			'A Strategic Battle Experience',
			{
				...defaultTextConfig,
				fontSize: '32px',
				color: '#CCCCCC',
				stroke: '#333333',
				strokeThickness: 4
			}
		).setOrigin(0.5);

		// Create start button using UIButton component
		new UIButton(
			this,
			'START GAME',
			MIDDLE_SCREEN_X,
			MIDDLE_SCREEN_Y + 100,
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

		// Add floating particles effect
		this.createParticles();

		// Allow Enter key to start the game
		this.input.keyboard?.on('keydown-ENTER', () => {
			this.startGame();
		});
	}

	private createParticles() {
		// Create some simple floating particles for atmosphere
		for (let i = 0; i < 50; i++) {
			const particle = this.add.circle(
				Phaser.Math.Between(0, SCREEN_WIDTH),
				Phaser.Math.Between(0, SCREEN_HEIGHT),
				Phaser.Math.Between(2, 6),
				0x444444,
				0.3
			);

			this.tweens.add({
				targets: particle,
				y: particle.y - Phaser.Math.Between(100, 300),
				alpha: 0,
				duration: Phaser.Math.Between(3000, 6000),
				delay: Phaser.Math.Between(0, 3000),
				repeat: -1,
				onRepeat: () => {
					particle.y = SCREEN_HEIGHT + 10;
					particle.x = Phaser.Math.Between(0, SCREEN_WIDTH);
					particle.alpha = 0.3;
				}
			});
		}
	}

	private startGame() {
		// Transition to the battleground scene
		this.cameras.main.fade(500, 0, 0, 0);
		this.cameras.main.once('camerafadeoutcomplete', () => {
			if (this.state) {
				this.scene.start(SCENE_KEYS.BATTLEGROUND, this.state);
			} else {
				// If no state is provided, we might need to create a default one
				// or handle this case according to your game's logic
				this.scene.start(SCENE_KEYS.BATTLEGROUND);
			}
		});
	}
}
