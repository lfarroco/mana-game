import * as Phaser from "phaser";
import * as constants from "@Constants/constants";
import * as AudioManager from "@Systems/AudioManager";
import { setCurrentScene } from "@Models/State";
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
		setCurrentScene(this);

		AudioManager.playMusic('music_ageofdisjunction');

		cloudsBg();

		logo();

		startButton();

		optionsButton();

		exitButton();

		goFullscreenButton();

		this.input.keyboard?.on('keydown-ENTER', startGame);

		this.add.image(300, 300, "blue-stone").setScale(0.5)
		this.add.image(400, 300, "red-stone").setScale(0.5)

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


