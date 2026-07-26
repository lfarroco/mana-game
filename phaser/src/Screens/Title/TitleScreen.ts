import * as constants from "@Constants";
import * as AudioManager from "@Systems/AudioManager";
import * as StatsStore from "@Models/StatsStore";
import * as Tooltip from "@Components/Tooltip/Tooltip";
import * as environment from "@Utils/environment";
import * as Components from "./Components"
import pkg from "../../../package.json";
import { createEvent } from "@game/Models";
import { env } from "@Env";
import { NavigationEvent } from "../../Events";
import { loadGame } from "../../Storage/loadGame";

type TitleScreenEvents = {
	newGameButtonClicked: ReturnType<typeof createEvent<void>>;
	resumeGameButtonClicked: ReturnType<typeof createEvent<void>>;
}

export let events: TitleScreenEvents;
export const components = Components;

export let mainButtonsContainer: Container;

let disposers: (() => void)[] = [];
let initialized = false;

export function init() {
	if (initialized) return;
	initialized = true;

	events = {
		newGameButtonClicked: createEvent<void>(),
		resumeGameButtonClicked: createEvent<void>(),
	}

	disposers = [
		events.newGameButtonClicked.listen(() => NavigationEvent.toCrystals.emit(undefined)),
		events.resumeGameButtonClicked.listen(() => {
			loadGame();
			NavigationEvent.toBattleground.emit(undefined);
		}),
	];
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

export function destroy() {
	disposers.forEach((d) => d());
	disposers = [];

	if (events) {
		events.newGameButtonClicked.clear();
		events.resumeGameButtonClicked.clear();
	}

	initialized = false;
}

function renderMainButtons() {
	mainButtonsContainer = env.container([
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
	const versionText = env.scene.add.text(0, 0, `v${pkg.version}`, { fontSize: "16px", color: "white", });
	versionText.setPosition(constants.SCREEN_WIDTH - 30, 10);
	versionText.setAlpha(0.5);
	versionText.setOrigin(1, 0);

}

async function checkUnlocks() {
	const pendingUnlocks = StatsStore.getPendingUnlocks();

	for (const unitId of pendingUnlocks) {
		await Components.UnlockModal.render(unitId);
		StatsStore.confirmUnlock(unitId);
		await env.time.delay(300);
	}
}
