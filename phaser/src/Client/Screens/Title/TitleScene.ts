import * as constants from "@Constants/constants";
import * as AudioManager from "@Systems/AudioManager";
import * as arenaButton from "Client/Screens/Title/Components/arenaButton";
import * as cloudsBg from "Client/Screens/Title/Components/cloudsBg";
import * as optionsButton from "Client/Screens/Title/Components/optionsButton";
import * as logo from "Client/Screens/Title/Components/logo";
import * as howToPlay from "Client/Screens/Title/Components/howToPlay";
import * as languageButton from "Client/Screens/Title/Components/languageButton";
import * as linksButton from "Client/Screens/Title/Components/linksButton";
import * as singlePlayerButton from "Client/Screens/Title/Components/singlePlayerButton";
import * as StatsStore from "@Models/StatsStore";
import * as UnlockModal from "Client/Screens/Title/Components/UnlockModal";
import * as Tooltip from "@Components/Tooltip";
import * as ControlsSystem from "@Systems/Controls";
// eslint-disable-next-line no-restricted-imports
import pkg from "../../../../package.json";

export let mainButtonsContainer: Container;

export function renderTitleScreen() {

	cloudsBg.render();

	Tooltip.init();

	logo.render();

	const buttons = [
		singlePlayerButton.render(500),
		arenaButton.render(600),
		optionsButton.render(700),
		linksButton.render(800),
		languageButton.render(),
	];

	// Create a container for the main buttons so they can be hidden when
	// showing submenu
	// TODO: replace with "tab" system 
	mainButtonsContainer = io.Container(
		buttons.filter((b): b is NonNullable<typeof b> => b != null).map((b) => b.container)
	);

	howToPlay.render();

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
		await UnlockModal.showUnlockModal(unitId);
		StatsStore.confirmUnlock(unitId);
		await new Promise((resolve) => setTimeout(resolve, 300));
	}
}