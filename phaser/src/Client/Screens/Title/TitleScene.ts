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

	renderMainButtons();

	Components.howToPlay.render();

	ControlsSystem.init({ context: "buttons" });

	checkUnlocks();

	displayVersion();

	Tooltip.init();

	AudioManager.playMusic("music_ageofdisjunction");

}

function renderMainButtons() {
	mainButtonsContainer = io.Container([
		() => Components.singlePlayerButton.render(500).container,
		() => Components.arenaButton.render(600).container,
		() => Components.optionsButton.render(700).container,
		() => Components.linksButton.render(800).container,
		() => Components.languageButton.render().container,
	]);
}

/*
 * Displays the game version in the top-right corner of the screen
 */
function displayVersion() {
	const versionText = io.Text(`v${pkg.version}`, { fontSize: "16px", color: "white", });
	io.SetPosition(versionText, { x: constants.SCREEN_WIDTH - 30, y: 10 });
	io.SetAlpha(versionText, 0.5);
	versionText.setOrigin(1, 0);

}

async function checkUnlocks() {
	const pendingUnlocks = StatsStore.getPendingUnlocks();

	for (const unitId of pendingUnlocks) {
		await Components.UnlockModal.render(unitId);
		StatsStore.confirmUnlock(unitId);
		await new Promise((resolve) => setTimeout(resolve, 300));
	}
}