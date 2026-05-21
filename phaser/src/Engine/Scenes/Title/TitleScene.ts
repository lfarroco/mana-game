import * as Phaser from "phaser";
import * as constants from "@Constants/constants";
import * as AudioManager from "@Systems/AudioManager";
import { setCurrentScene } from "@Models/State";
import { arenaButton } from "@Scenes/Title/components/arenaButton";
import { cloudsBg } from "@Scenes/Title/components/cloudsBg";
import { optionsButton, setMainButtonsContainer } from "@Scenes/Title/components/optionsButton";
import { logo } from "@Scenes/Title/components/logo";
import { howToPlay } from "@Scenes/Title/components/howToPlay";
import * as io from "@PhaserIO";
import { languageButton } from "@Scenes/Title/components/languageButton";
import { linksButton } from "@Scenes/Title/components/linksButton";
import { singlePlayerButton } from "@Scenes/Title/components/singlePlayerButton";
import * as StatsStore from "@Models/StatsStore";
import { showUnlockModal } from "@Scenes/Title/components/UnlockModal";
import * as Tooltip from "@Components/Tooltip";
import * as ControlsSystem from "@Systems/Controls";
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

		const buttons = [
			singlePlayerButton(500),
			arenaButton(600),
			optionsButton(700),
			linksButton(800),
			languageButton(),
		];

		// Create a container for the main buttons so they can be hidden when
        // showing submenu
        // TODO: replace with "tab" system 
		const mainButtonsContainer = io.Container(
			buttons.filter((b): b is NonNullable<typeof b> => b != null).map((b) => b.container)
		);
		setMainButtonsContainer(mainButtonsContainer);

		howToPlay();

		ControlsSystem.init(this, { context: "buttons" });

		this.checkUnlocks();

        this.displayVersion();

	}

    /*
     * Displays the game version in the top-right corner of the screen
     */
    displayVersion() {
    
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
