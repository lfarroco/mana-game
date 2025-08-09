import * as Phaser from "phaser";
import * as constants from "../../constants/constants";
import { State } from "../../Models/State";
import { UIButton } from "../../UI/UIButton";
import { CloudsBackground } from "../../components/cloudBackground/CloudsBackground";
import { images } from "../../assets";
import { AudioSystem } from "../../Systems/AudioSystem/AudioSystem";
import { MagicOrb, MagicOrbFactory } from "../../components/MagicOrb/MagicOrb";

export default class TitleScene extends Phaser.Scene {
	private gameTitle!: Phaser.GameObjects.Image;
	private state?: State;
	private cloudsBackground!: CloudsBackground; // Stored for potential future manipulation
	private magicOrbs: MagicOrb[] = []; // Array to store magic orbs

	constructor() {
		super(constants.SCENE_KEYS.TITLE);
	}

	init(data: { state?: State }) {
		this.state = data.state;
	}

	preload() {
		this.load.image(images.logo);

		[
			'boss_andromeda',
			'boss_spelleater',
			'f1_tank',
			'f3_mech',
			'f3_windgiver',
			'neutral_amu',
			'neutral_arrowwhistler',
			'neutral_golemnature',
			'neutral_golemstone',
			'boss_shadowlord',
		].forEach(key => {
			this.load.atlas(key, `assets/heroes/${key}.png`, `assets/heroes/${key}.json`);
			this.load.animation(`${key}-anims`, `assets/heroes/${key}-anims.json`);
		});

		//sfx_artifact_equipmask

		this.load.audio('sfx_artifact_equipmask', 'assets/audio/sfx_artifact_equipmask.m4a');

		//notification.m4a
		this.load.audio('sfx_notification', 'assets/audio/notification.m4a');

	}

	create() {
		// Create the clouds background with auto-changing presets
		this.cloudsBackground = new CloudsBackground(this, {
			preset: 'nebula',
		});

		// Start playing the title music
		try {
			const audioSystem = AudioSystem.getInstance();
			audioSystem.playMusic('music_ageofdisjunction');
		} catch (error) {
			console.warn('Could not play title music:', error);
		}

		// Create the main title
		this.gameTitle = this.add.image(
			constants.MIDDLE_SCREEN_X,
			constants.MIDDLE_SCREEN_Y - 200,
			images.logo.key
		).setOrigin(0.5);

		// Create magic orbs for visual flair
		console.log('Creating magic orbs...');
		console.log('Screen size:', this.scale.width, this.scale.height);

		try {
			const orb1 = MagicOrbFactory.createPurpleOrb(this, 150, 200, 100);
			const orb2 = MagicOrbFactory.createBlueOrb(this, this.scale.width - 150, 300, 80);
			const orb3 = new MagicOrb(this, this.scale.width / 2 + 300, this.scale.height - 150, {
				size: 60,
				color: { x: 0.9, y: 0.7, z: 0.2 }, // Golden
				intensity: 1.2,
				speed: 0.8
			});

			this.magicOrbs = [orb1, orb2, orb3];

			// Set depths to appear behind UI but in front of background
			this.magicOrbs.forEach((orb, index) => {
				orb.setDepth(-50 + index);
				console.log(`Orb ${index} created and depth set to:`, -50 + index);
			});

			console.log('All magic orbs created successfully');
		} catch (error) {
			console.error('Error creating magic orbs:', error);
		}

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
		new UIButton(
			this,
			'OPTIONS',
			constants.MIDDLE_SCREEN_X,
			constants.MIDDLE_SCREEN_Y + 180,
			() => {
				this.openOptions();
			}
		);
		// new UIButton(
		// 	this,
		// 	'COLLECTION',
		// 	constants.MIDDLE_SCREEN_X,
		// 	constants.MIDDLE_SCREEN_Y + 260,
		// 	() => {
		// 		this.startGame();
		// 	}
		// );
		// new UIButton(
		// 	this,
		// 	'CREDITS',
		// 	constants.MIDDLE_SCREEN_X,
		// 	constants.MIDDLE_SCREEN_Y + 340,
		// 	() => {
		// 		this.startGame();
		// 	}
		// );
		// new UIButton(
		// 	this,
		// 	'GO FULLSCREEN',
		// 	constants.MIDDLE_SCREEN_X,
		// 	constants.MIDDLE_SCREEN_Y + 420,
		// 	() => {
		// 		this.toggleFullscreen();
		// 	}
		// );

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

	update(time: number) {
		// Update magic orbs animation
		this.magicOrbs.forEach(orb => {
			orb.update(time);
		});
	}

	private openOptions() {
		// Transition to the options scene
		this.cameras.main.fade(500, 0, 0, 0);
		this.cameras.main.once('camerafadeoutcomplete', () => {
			this.scene.start(constants.SCENE_KEYS.OPTIONS);
		});
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

	toggleFullscreen() {
		if (this.scale.isFullscreen) {
			this.scale.stopFullscreen();
		} else {
			this.scale.startFullscreen();
		}
	}

	destroy() {
		// Clean up the clouds background when scene is destroyed
		if (this.cloudsBackground) {
			this.cloudsBackground.destroy();
		}

		// Clean up magic orbs
		this.magicOrbs.forEach(orb => {
			orb.destroy();
		});
		this.magicOrbs = [];
	}
}
