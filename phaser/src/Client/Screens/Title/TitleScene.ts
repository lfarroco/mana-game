import * as constants from "@Constants/constants";
import * as AudioManager from "@Systems/AudioManager";
import * as StatsStore from "@Models/StatsStore";
import * as Tooltip from "@Components/Tooltip";
import * as ControlsSystem from "@Systems/Controls";
import * as Components from "./Components"
// eslint-disable-next-line no-restricted-imports
import pkg from "../../../../package.json";

export let mainButtonsContainer: Container;

export function renderTitleScreen() {

	Components.cloudsBg.render();

	Components.logo.render();

	const buttons = [
		Components.singlePlayerButton.render(500),
		Components.arenaButton.render(600),
		Components.optionsButton.render(700),
		Components.linksButton.render(800),
		Components.languageButton.render(),
	].map(btn => btn.container)

	mainButtonsContainer = io.Container(buttons);

	Components.howToPlay.render();

	ControlsSystem.init({ context: "buttons" });

	checkUnlocks();

	displayVersion();

	Tooltip.init();

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
		await Components.UnlockModal.render(unitId);
		StatsStore.confirmUnlock(unitId);
		await new Promise((resolve) => setTimeout(resolve, 300));
	}
}