import * as constants from "@Constants/constants";
import * as AudioManager from "@Systems/AudioManager";
import { arenaButton } from "Client/Scenes/Title/components/arenaButton";
import { cloudsBg } from "Client/Scenes/Title/components/cloudsBg";
import { optionsButton, setMainButtonsContainer } from "Client/Scenes/Title/components/optionsButton";
import { logo } from "Client/Scenes/Title/components/logo";
import { howToPlay } from "Client/Scenes/Title/components/howToPlay";
import * as io from "@PhaserIO";
import { languageButton } from "Client/Scenes/Title/components/languageButton";
import { linksButton } from "Client/Scenes/Title/components/linksButton";
import { singlePlayerButton } from "Client/Scenes/Title/components/singlePlayerButton";
import * as StatsStore from "@Models/StatsStore";
import { showUnlockModal } from "Client/Scenes/Title/components/UnlockModal";
import * as Tooltip from "@Components/Tooltip";
import * as ControlsSystem from "@Systems/Controls";
// eslint-disable-next-line no-restricted-imports
import pkg from "../../../../package.json";

export function renderTitleScreen() {

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

	ControlsSystem.init({ context: "buttons" });

	checkUnlocks();

	displayVersion();

	AudioManager.playMusic("music_ageofdisjunction");

}

/*
 * Displays the game version in the top-right corner of the screen
 */
function displayVersion() {

	io.Text(`v${pkg.version}`, { fontSize: "16px", color: "white", })
		.setPosition(constants.SCREEN_WIDTH - 30, 10)
		.setAlpha(0.5)
		.setOrigin(1, 0);

}

async function checkUnlocks() {
	const pendingUnlocks = StatsStore.getPendingUnlocks();

	for (const unitId of pendingUnlocks) {
		await showUnlockModal(unitId);
		StatsStore.confirmUnlock(unitId);
		await new Promise((resolve) => setTimeout(resolve, 300));
	}
}