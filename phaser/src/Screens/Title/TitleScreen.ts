import * as constants from "@Constants";
import * as AudioManager from "@Systems/AudioManager";
import * as StatsStore from "@Models/StatsStore";
import * as Tooltip from "@Components/Tooltip/Tooltip";
import * as environment from "@Utils/environment";
import * as Components from "./Components"
// eslint-disable-next-line no-restricted-imports
import pkg from "../../../package.json";
import * as Effects from "./Effects"
import * as Models from "@game/Models"
import { ClientState } from "@Models/ClientState";

type TitleScreenEvents = {
	newGameButtonClicked: Models.Event<void>
	resumeGameButtonClicked: Models.Event<void>
}

export let events: TitleScreenEvents;
export const components = Components;

export let mainButtonsContainer: Container;

let initialized = false;
function init(clientState: ClientState) {
	if (initialized) return;
	initialized = true;

	events = {
		newGameButtonClicked: io.createEvent<void>("newGameButtonClicked"),
		resumeGameButtonClicked: io.createEvent<void>("resumeGameButtonClicked"),
	}

	events.newGameButtonClicked.listen(Effects.startGame(clientState));
	events.resumeGameButtonClicked.listen(
		Effects.resumeGame(clientState)
	);

}

export function create(clientState: ClientState) {

	init(clientState);

	Components.cloudsBg.create();

	Components.logo.render();

	renderMainButtons(clientState);

	Components.howToPlay.create(clientState);

	checkUnlocks(clientState);

	displayVersion();

	Tooltip.init();

	AudioManager.playMusic("music_ageofdisjunction");

}

function renderMainButtons(clientState: ClientState) {
	mainButtonsContainer = io.Container([
		() => Components.singlePlayerButton.create(clientState, 500).container,
		() => Components.arenaButton.create(600).container,
		() => Components.optionsButton.create(clientState, 700).container,
		() => Components.linksButton.create(800).container,
		environment.isElectron() ?
			() => Components.exitButton.create(900).container :
			null,
		() => Components.languageButton.create(clientState).container,
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

async function checkUnlocks(clientState: ClientState) {
	const pendingUnlocks = StatsStore.getPendingUnlocks();

	for (const unitId of pendingUnlocks) {
		await Components.UnlockModal.render(clientState, unitId);
		StatsStore.confirmUnlock(unitId);
		await new Promise((resolve) => setTimeout(resolve, 300));
	}
}
