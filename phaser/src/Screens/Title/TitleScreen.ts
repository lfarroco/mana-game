import * as constants from "@Constants";
import * as AudioManager from "@Systems/AudioManager";
import * as StatsStore from "@Models/StatsStore";
import * as environment from "@Utils/environment";
import * as Components from "./Components"
import * as LanguagePanel from "./Components/LanguagePanel";
import pkg from "../../../package.json";
import { createEvent } from "@game/Models";
import { env } from "@Env";
import { GameEvent } from "../../Events";
import { getScreenManager } from "../ScreenManager";
import { loadGame } from "@Systems/Storage/loadGame";
import { createScreen, screenModule, ScreenCtx } from "@mana/framework";

export type TitlePhase = "main" | "singleplayer_submenu" | "options_submenu" | "language";

export type TitleScreenEvents = {
	newGameButtonClicked: ReturnType<typeof createEvent<void>>;
	resumeGameButtonClicked: ReturnType<typeof createEvent<void>>;
}

export type Context = ScreenCtx<TitlePhase, TitleScreenEvents>

const screen = createScreen<TitlePhase, TitleScreenEvents>({
	name: "title",

	events: () => {

		const newGameButtonClicked = createEvent<void>();
		const resumeGameButtonClicked = createEvent<void>();

		return {
			events: {
				newGameButtonClicked,
				resumeGameButtonClicked
			},
			listeners: [
				newGameButtonClicked.listen(() => {
					void getScreenManager().go("crystals");
				}),
				resumeGameButtonClicked.listen(
					loadGame
				),
				resumeGameButtonClicked.listen(() => {
					void getScreenManager().go("battleground");
				}),
				GameEvent.localeChanged.listen(
					Components.howToPlay.refresh
				),
			],
		};
	},

	create: async (ctx) => {
		Components.cloudsBg.create();
		Components.logo.render();
		AudioManager.playMusic("music_ageofdisjunction");
		const versionText = displayVersion();
		const howToPlay = Components.howToPlay.create();

		// TODO: have event "onCreate" for screens, and fire those 
		await ctx.go("main");
		checkUnlocks();
		return [versionText, howToPlay];
	},

	phases: {
		main: mainPhase,

		singleplayer_submenu: Components.singlePlayerButton.createSinglePlayerSubmenu,

		options_submenu: Components.optionsButton.createSubmenu,

		language: LanguagePanel.create
	},
});

function mainPhase(ctx: Context) {
	return [
		Components.singlePlayerButton.create(ctx),
		Components.arenaButton.create(),
		Components.optionsButton.create(ctx),
		Components.linksButton.create(),
		environment.isElectron() ?
			Components.exitButton.create() :
			env.container(),
		Components.languageButton.create(ctx),
	]
}

export const { init, create, destroy, go, name } = screenModule(screen);

function displayVersion(): Phaser.GameObjects.Text {
	return env.scene.add.text(
		0, 0,
		`v${pkg.version}`,
		{ fontSize: "16px", color: "white", })
		.setPosition(constants.SCREEN_WIDTH - 30, 10)
		.setAlpha(0.5)
		.setOrigin(1, 0);
}

async function checkUnlocks() {
	const pendingUnlocks = StatsStore.getPendingUnlocks();

	for (const unitId of pendingUnlocks) {
		await Components.UnlockModal.render(unitId);
		StatsStore.confirmUnlock(unitId);
		await env.time.delay(300);
	}
}

