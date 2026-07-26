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
import { createScreenLifecycle } from "../screenLifecycle";

type TitleScreenEvents = {
	newGameButtonClicked: ReturnType<typeof createEvent<void>>;
	resumeGameButtonClicked: ReturnType<typeof createEvent<void>>;
}

const lifecycle = createScreenLifecycle();

export let events: TitleScreenEvents;
export const components = Components;

export let mainButtonsContainer: Container;

export function init() {
	events = lifecycle.init(() => {
		const e: TitleScreenEvents = {
			newGameButtonClicked: createEvent<void>(),
			resumeGameButtonClicked: createEvent<void>(),
		};
		return {
			events: e,
			disposers: [
				e.newGameButtonClicked.listen(() => NavigationEvent.toCrystals.emit(undefined)),
				e.resumeGameButtonClicked.listen(() => {
					loadGame();
					NavigationEvent.toBattleground.emit(undefined);
				}),
			],
		};
	});
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
	lifecycle.destroy();
}

function renderMainButtons() {
	mainButtonsContainer = env.container([
		Components.singlePlayerButton.create().container,
		Components.arenaButton.create().container,
		Components.optionsButton.create().container,
		Components.linksButton.create().container,
		environment.isElectron() ?
			Components.exitButton.create().container :
			null,
		Components.languageButton.create().container,
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
