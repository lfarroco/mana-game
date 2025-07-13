import * as Phaser from "phaser";
import { SCENE_KEYS, SCREEN_WIDTH, SCREEN_HEIGHT, MIDDLE_SCREEN_X, MIDDLE_SCREEN_Y, titleTextConfig, defaultTextConfig } from "../../constants/constants";
import { State } from "../../Models/State";
import { UIButton } from "../../UI/UIButton";
import { cloudsBackgroundShader } from "../../Shaders/CloudsBackground";

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
		// Create animated shader background with clouds and swirls
		const backgroundShader = new Phaser.Display.BaseShader('cloudsBackground', cloudsBackgroundShader, undefined, {
			color1: { type: '3f', value: { x: 0.05, y: 0.1, z: 0.25 } },
			color2: { type: '3f', value: { x: 0.1, y: 0.2, z: 0.4 } },
			color3: { type: '3f', value: { x: 0.2, y: 0.35, z: 0.6 } },
			color4: { type: '3f', value: { x: 0.15, y: 0.1, z: 0.3 } },
			color5: { type: '3f', value: { x: 0.4, y: 0.3, z: 0.1 } }
		});

		this.add.shader(backgroundShader, MIDDLE_SCREEN_X, MIDDLE_SCREEN_Y, SCREEN_WIDTH, SCREEN_HEIGHT)
			.setOrigin(0.5, 0.5);

		// Create the main title
		this.gameTitle = this.add.text(
			MIDDLE_SCREEN_X,
			MIDDLE_SCREEN_Y - 200,
			'MANA GAME',
			{
				...titleTextConfig,
				fontSize: '72px',
				color: '#FFE55C',
				stroke: '#2D1810',
				strokeThickness: 12
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
				color: '#E8E8E8',
				stroke: '#1A1A2E',
				strokeThickness: 6
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
		// Create magical floating particles that complement the shader background
		for (let i = 0; i < 30; i++) {
			// Vary particle colors to match the mystical theme
			const colors = [0x6699FF, 0x9966FF, 0xFFAA44, 0x44AAFF, 0xFF6699];
			const color = colors[Math.floor(Math.random() * colors.length)];

			const particle = this.add.circle(
				Phaser.Math.Between(0, SCREEN_WIDTH),
				Phaser.Math.Between(0, SCREEN_HEIGHT),
				Phaser.Math.Between(1, 4),
				color,
				Phaser.Math.Between(0.1, 0.4)
			);

			// Add a subtle glow effect
			particle.setBlendMode(Phaser.BlendModes.ADD);

			this.tweens.add({
				targets: particle,
				y: particle.y - Phaser.Math.Between(150, 400),
				x: particle.x + Phaser.Math.Between(-50, 50),
				alpha: 0,
				scaleX: Phaser.Math.Between(0.5, 2.0),
				scaleY: Phaser.Math.Between(0.5, 2.0),
				duration: Phaser.Math.Between(4000, 8000),
				delay: Phaser.Math.Between(0, 5000),
				repeat: -1,
				ease: 'Sine.easeOut',
				onRepeat: () => {
					particle.y = SCREEN_HEIGHT + 10;
					particle.x = Phaser.Math.Between(0, SCREEN_WIDTH);
					particle.alpha = Phaser.Math.Between(0.1, 0.4);
					particle.scaleX = 1;
					particle.scaleY = 1;
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
