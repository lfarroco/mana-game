import * as Phaser from "phaser";
import * as constants from "@Constants/constants";
import * as AudioManager from "@Systems/AudioManager";
import { setCurrentScene } from "@Models/State";
import { newRunButton } from "./components/newRunButton";
import { startGame } from "../../Game/effects/startGame";
import { cloudsBg } from "./components/cloudsBg";
import { optionsButton, setMainButtonsContainer } from "./components/optionsButton";
import { goFullscreenButton } from "./components/goFullscreenButton";
import { resumeGameButton } from "./components/resumeGameButton";
import { logo } from "./components/logo";
import { howToPlay } from "./components/howToPlay";
import * as io from "@PhaserIO";
import { languageButton } from "./components/languageButton";
import { linksButton } from "./components/linksButton";


export default class TitleScene extends Phaser.Scene {
	constructor() {
		super(constants.SCENE_KEYS.TITLE);
	}

	create() {
		setCurrentScene(this);

		AudioManager.playMusic("music_ageofdisjunction");

		cloudsBg();

		logo();

		const buttons = [
			resumeGameButton(500),
			newRunButton(600),
			optionsButton(700),
			goFullscreenButton(800),
			linksButton(900),
			languageButton()
		];

		// Create a container for the main buttons so they can be hidden when showing submenu
		const mainButtonsContainer = io.Container(
			buttons.filter((b): b is NonNullable<typeof b> => b != null).map(b => b.container)
		);
		setMainButtonsContainer(mainButtonsContainer);

		howToPlay();

		this.input.keyboard?.on("keydown-ENTER", startGame);

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
