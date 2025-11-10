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
import { Shader } from "@PhaserIO";
import { arcaneTornadoFragmentShader } from "@Shaders/ArcaneTornado";
import { vec2 } from "@Models/Geometry";

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

		Shader(
			arcaneTornadoFragmentShader,
			vec2(200, 200),
			{ width: 400, height: 400 },
			[

				{ key: "color1", type: '3f', value: [0.0, 0.0, 0.0] },   // black core
				{ key: "color2", type: '3f', value: [0.7, 0.2, 1.0] },   // arcane purple
				{ key: "intensity", type: '1f', value: 1.4 },
				{ key: "speed", type: '1f', value: 1.0 },                // now visibly faster
				{ key: "dissolveProgress", type: '1f', value: 1.0 },
			]
		);

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


