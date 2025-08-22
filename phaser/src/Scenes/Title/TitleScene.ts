import * as Phaser from "phaser";
import * as constants from "../../constants/constants";
import { createUIButton } from "../../UI/UIButton";
import { CloudsBackground } from "../../components/cloudBackground/CloudsBackground";
import { images } from "../../assets";
import * as AudioManager from "../../Systems/AudioManager";

export let titleScene: TitleScene;

export default class TitleScene extends Phaser.Scene {
	cloudsBackground!: CloudsBackground;

	constructor() {
		super(constants.SCENE_KEYS.TITLE);
		titleScene = this;
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

		this.load.audio('sfx_artifact_equipmask', 'assets/audio/sfx_artifact_equipmask.m4a');

		this.load.audio('sfx_notification', 'assets/audio/notification.m4a');

	}

	create() {
		this.cloudsBackground = new CloudsBackground(this, {
			preset: 'nebula',
		});

		AudioManager.playMusic('music_ageofdisjunction');

		this.add.image(
			constants.MIDDLE_SCREEN_X,
			constants.MIDDLE_SCREEN_Y - 200,
			images.logo.key
		).setOrigin(0.5);

		console.log('Creating magic orbs...');
		console.log('Screen size:', this.scale.width, this.scale.height);

		try {

		} catch (error) {
			console.error('Error creating magic orbs:', error);
		}

		createUIButton(
			this,
			'START GAME',
			constants.MIDDLE_SCREEN_X,
			constants.MIDDLE_SCREEN_Y + 100,
			() => {
				this.startGame();
			}
		);
		createUIButton(
			this,
			'OPTIONS',
			constants.MIDDLE_SCREEN_X,
			constants.MIDDLE_SCREEN_Y + 180,
			() => {
				this.openOptions();
			}
		);
		createUIButton(
			this,
			'DEBUG',
			constants.MIDDLE_SCREEN_X,
			constants.MIDDLE_SCREEN_Y + 260,
			() => {
				this.openDebug();
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

		this.input.keyboard?.on('keydown-ENTER', () => {
			this.startGame();
		});
	}

	openOptions() {
		this.cameras.main.fade(500, 0, 0, 0);
		this.cameras.main.once('camerafadeoutcomplete', () => {
			this.scene.start(constants.SCENE_KEYS.OPTIONS);
		});
	}

	openDebug() {
		this.cameras.main.fade(300, 0, 0, 0);
		this.cameras.main.once('camerafadeoutcomplete', () => {
			this.scene.start(constants.SCENE_KEYS.DEBUG);
		});
	}

	startGame() {
		this.cameras.main.fade(500, 0, 0, 0);
		this.cameras.main.once('camerafadeoutcomplete', () => {
			this.scene.start(constants.SCENE_KEYS.BATTLEGROUND);
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
		this.cloudsBackground?.destroy();
	}
}
