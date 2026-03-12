import * as Phaser from "phaser";
import * as constants from "@Constants/constants";
import * as AudioManager from "@Systems/AudioManager";
import { setCurrentScene } from "@Models/State";
import { newSinglePlayerRunButton } from "@Scenes/Title/components/newSinglePlayerRunButton";
import { arenaButton } from "@Scenes/Title/components/arenaButton";
import { startGame } from "@Game/effects/startGame";
import { cloudsBg } from "@Scenes/Title/components/cloudsBg";
import { optionsButton, setMainButtonsContainer } from "@Scenes/Title/components/optionsButton";
import { collectionButton } from "@Scenes/Title/components/collectionButton";
import { resumeGameButton } from "@Scenes/Title/components/resumeGameButton";
import { logo } from "@Scenes/Title/components/logo";
import { howToPlay } from "@Scenes/Title/components/howToPlay";
import * as io from "@PhaserIO";
import { languageButton } from "@Scenes/Title/components/languageButton";
import { linksButton } from "@Scenes/Title/components/linksButton";
import * as StatsStore from "@Models/StatsStore";
import { showUnlockModal } from "@Scenes/Title/components/UnlockModal";
import * as Tooltip from "@Components/Tooltip";
// eslint-disable-next-line no-restricted-imports
import pkg from "../../../../package.json";

export default class TitleScene extends Phaser.Scene {
	constructor() {
		super(constants.SCENE_KEYS.TITLE);
	}

	create() {
		setCurrentScene(this);

		AudioManager.playMusic("music_ageofdisjunction");

		cloudsBg();

		Tooltip.init();

		logo();

		const arenaButton_ = process.env.NODE_ENV === "development" ? [arenaButton(700)] : [];

		const buttons = [resumeGameButton(500), newSinglePlayerRunButton(600)]
			.concat(arenaButton_)
			.concat([optionsButton(800), collectionButton(900), linksButton(1000), languageButton()]);

		// Create a container for the main buttons so they can be hidden when showing submenu
		const mainButtonsContainer = io.Container(
			buttons.filter((b): b is NonNullable<typeof b> => b != null).map((b) => b.container)
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

		this.checkUnlocks();

		this.add
			.text(constants.SCREEN_WIDTH - 30, 10, `v${pkg.version}`, {
				fontFamily: "Arimo",
				fontSize: "16px",
				color: "white",
			})
			.setOrigin(1, 0)
			.setAlpha(0.5);
	}

	async checkUnlocks() {
		const pendingUnlocks = StatsStore.getPendingUnlocks();

		for (const unitId of pendingUnlocks) {
			await showUnlockModal(unitId);
			StatsStore.confirmUnlock(unitId);
			await new Promise((resolve) => setTimeout(resolve, 300));
		}
	}
}
