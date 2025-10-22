import * as Phaser from "phaser";
import * as constants from "@Constants/constants";
import * as AudioManager from "@Systems/AudioManager";
import { getState } from "@Models/State";
import { logo } from "./components/logo";
import { startButton } from "./components/startButton";
import { startGame } from "./effects/startGame";
import { cloudsBg } from "./components/cloudsBg";
import { exitButton } from "./components/exitButton";
import { optionsButton } from "./components/optionsButton";
import { goFullscreenButton } from "./components/goFullscreenButton";

export let titleScene: TitleScene;

export default class TitleScene extends Phaser.Scene {

	constructor() {
		super(constants.SCENE_KEYS.TITLE);
		titleScene = this;
		//@ts-ignore
		window.titleScene = this;
	}

	create() {
		getState().currentScene = this;

		AudioManager.playMusic('music_ageofdisjunction');

		cloudsBg();

		logo();

		startButton();

		optionsButton();

		exitButton();

		goFullscreenButton();

		this.input.keyboard?.on('keydown-ENTER', startGame);

	}

}


