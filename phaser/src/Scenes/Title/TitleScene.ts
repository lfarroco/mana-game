import * as Phaser from "phaser";
import * as constants from "@Constants/constants";
import * as AudioManager from "@Systems/AudioManager";
import { setCurrentScene } from "@Models/State";
import { startButton } from "./components/new_run_button";
import { startGame } from "../../Game/effects/startGame";
import { cloudsBg } from "./components/cloudsBg";
import { optionsButton } from "./components/optionsButton";
import { goFullscreenButton } from "./components/goFullscreenButton";
import { resumeGameButton } from "./components/resumeGameButton";
import { logo } from "./components/logo";

export let titleScene: TitleScene;

export default class TitleScene extends Phaser.Scene {

	constructor() {
		super(constants.SCENE_KEYS.TITLE);
		titleScene = this;
		//@ts-ignore
		window.titleScene = this;
	}

	create() {
		setCurrentScene(this);

		AudioManager.playMusic('music_ageofdisjunction');

		cloudsBg();

		logo();

		resumeGameButton();

		startButton();

		optionsButton();

		goFullscreenButton();

		this.input.keyboard?.on('keydown-ENTER', startGame);

		// const PGIurl = 'https://cdn.jsdelivr.net/gh/SilverTree7622/Phaser3_GUI_Inspector@latest/dist/PGInspector.js';
		// const PGIele = document.createElement('script');
		// PGIele.src = PGIurl;
		// document.head.appendChild(PGIele);
		// setTimeout(() => {
		// 	//@ts-ignore
		// 	PhaserGUIAction(this);
		// }, 500)
	}

}


