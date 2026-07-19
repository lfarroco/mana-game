import * as constants from "@Constants";
import * as AudioManager from "@Systems/AudioManager";
import * as StatsStore from "@Models/StatsStore";
import * as Tooltip from "@Components/Tooltip/Tooltip";
import * as environment from "@Utils/environment";
import * as Components from "./Components"
// eslint-disable-next-line no-restricted-imports
import pkg from "../../../../package.json";
import * as Effects from "./Effects"
import * as Models from "@game/Models"

type TitleScreenEvents = {
	newGameButtonClicked: Models.Event<void>
	resumeGameButtonClicked: Models.Event<void>
}

export let events: TitleScreenEvents;
export const components = Components;

export let mainButtonsContainer: Container;

let initialized = false;
function init() {
	if (initialized) return;
	initialized = true;

	events = {
		newGameButtonClicked: io.createEvent<void>("newGameButtonClicked"),
		resumeGameButtonClicked: io.createEvent<void>("resumeGameButtonClicked"),
	}

	events.newGameButtonClicked.listen(Effects.startGame);
	events.resumeGameButtonClicked.listen(Effects.resumeGame);

}

export function create() {

	init();

	Components.cloudsBg.create();

	Components.logo.render();

	renderMainButtons();

	Components.howToPlay.create();

	checkUnlocks();

	displayVersion();

	Tooltip.init();

	AudioManager.playMusic("music_ageofdisjunction");

}

function renderMainButtons() {
	mainButtonsContainer = io.Container([
		() => Components.singlePlayerButton.create(500).container,
		() => Components.arenaButton.create(600).container,
		() => Components.optionsButton.create(700).container,
		() => Components.linksButton.create(800).container,
		environment.isElectron() ?
			() => Components.exitButton.create(900).container :
			null,
		() => Components.languageButton.create().container,
	]);
}

/*
 * Displays the game version in the top-right corner of the screen
 */
function displayVersion() {
	const versionText = io.Text(`v${pkg.version}`, { fontSize: "16px", color: "white", });
	io.SetPosition(versionText, [constants.SCREEN_WIDTH - 30, 10]);
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
