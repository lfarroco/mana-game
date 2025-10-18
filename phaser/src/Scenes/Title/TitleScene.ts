import * as Phaser from "phaser";
import * as constants from "../../Constants/constants";
import { createUIButton } from "../../UI/UIButton";
import { CloudsBackground } from "../../components/cloudBackground/CloudsBackground";
import * as AudioManager from "@Systems/AudioManager";
import { vec2 } from "@Models/Geometry";
import { getState } from "@Models/State";
import * as io from "@PhaserIO"
import { createEntity } from "@Models/Entities/Entity";

export let titleScene: TitleScene;

export default class TitleScene extends Phaser.Scene {
	cloudsBackground!: CloudsBackground;

	constructor() {
		super(constants.SCENE_KEYS.TITLE);
		titleScene = this;
	}

	create() {
		getState().currentScene = this;

		[
			"clouds_bg",
			"logo"
		].forEach(
			createEntity
		)


		AudioManager.playMusic('music_ageofdisjunction');

		createUIButton(
			'START GAME',
			vec2(constants.MIDDLE_SCREEN.x, constants.MIDDLE_SCREEN.y + 100,),
			() => { this.startGame(); }
		);
		createUIButton(
			'OPTIONS',
			vec2(constants.MIDDLE_SCREEN_X, constants.MIDDLE_SCREEN_Y + 180,),
			() => { this.openOptions(); }
		);
		createUIButton(
			'EXIT',
			vec2(constants.MIDDLE_SCREEN_X, constants.MIDDLE_SCREEN_Y + 380),
			() => { window.close(); }
		);
		// createUIButton(
		// 	this,
		// 	'DEBUG',
		// 	constants.MIDDLE_SCREEN_X,
		// 	constants.MIDDLE_SCREEN_Y + 260,
		// 	() => {
		// 		this.openDebug();
		// 	}
		// );
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
		createUIButton(
			'GO FULLSCREEN',
			vec2(constants.MIDDLE_SCREEN_X, constants.MIDDLE_SCREEN_Y + 300),
			() => {
				this.toggleFullscreen();
			}
		);

		this.input.keyboard?.on('keydown-ENTER', () => {
			this.startGame();
		});
	}

	async openOptions() {
		await io.Fade(300, 0x000000);
		io.StartScene(constants.SCENE_KEYS.OPTIONS);
	}

	async openDebug() {
		await io.Fade(300, 0x000000);
		io.StartScene(constants.SCENE_KEYS.DEBUG);
	}

	async startGame() {
		await io.Fade(300, 0x000000)
		io.StartScene(constants.SCENE_KEYS.BATTLEGROUND);
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

