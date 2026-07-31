import * as constants from "@Constants";
import * as AudioManager from "@Systems/AudioManager";
import * as StatsStore from "@Models/StatsStore";
import * as environment from "@Utils/environment";
import * as Components from "./Components"
import * as LanguagePanel from "./Components/LanguagePanel";
import pkg from "../../../package.json";
import { createEvent } from "@game/Models";
import { env } from "@Env";
import { GameEvent, NavigationEvent } from "../../Events";
import { loadGame } from "../../Storage/loadGame";
import { createScreen, screenModule, ScreenCtx } from "../screenTracking";

export type TitleScreenEvents = {
	newGameButtonClicked: ReturnType<typeof createEvent<void>>;
	resumeGameButtonClicked: ReturnType<typeof createEvent<void>>;
}

export type Context = ScreenCtx<TitlePhase, TitleScreenEvents>

export type TitlePhase = "main" | "submenu" | "options_submenu" | "language";

const screen = createScreen<TitlePhase, TitleScreenEvents>({
	name: "title",

	events: () => {
		const events: TitleScreenEvents = {
			newGameButtonClicked: createEvent<void>(),
			resumeGameButtonClicked: createEvent<void>(),
		};
		return {
			events,
			listeners: [
				events.newGameButtonClicked.listen(NavigationEvent.toCrystals.emit),
				events.resumeGameButtonClicked.listen(() => {
					loadGame();
					NavigationEvent.toBattleground.emit();
				}),
				GameEvent.localeChanged.listen(Components.howToPlay.refresh),
			],
		};
	},

	create: async (ctx) => {
		Components.cloudsBg.create();
		Components.logo.render();
		displayVersion(ctx);
		ctx.track(Components.howToPlay.create());
		AudioManager.playMusic("music_ageofdisjunction");
		await ctx.go("main");
		checkUnlocks();
	},

	phases: {
		main: (ctx) => {
			const mainButtons =
				env.container([
					Components.singlePlayerButton.create(ctx).container,
					Components.arenaButton.create().container,
					Components.optionsButton.create(ctx).container,
					Components.linksButton.create().container,
					environment.isElectron() ?
						Components.exitButton.create().container :
						null,
					Components.languageButton.create(ctx).container,
				]);
			ctx.track(mainButtons);
		},

		submenu: (ctx) => {
			Components.singlePlayerButton.createSinglePlayerSubmenu(ctx);
		},

		options_submenu: (ctx) => {
			Components.optionsButton.createSubmenu(ctx);
		},

		language: (ctx) => {
			LanguagePanel.create(ctx);
		},
	},
});

export const { init, create, destroy, go, name } = screenModule(screen);

function displayVersion(ctx: ScreenCtx<TitlePhase>) {
	const versionText = env.scene.add.text(
		0, 0,
		`v${pkg.version}`,
		{ fontSize: "16px", color: "white", });
	versionText.setPosition(constants.SCREEN_WIDTH - 30, 10);
	versionText.setAlpha(0.5);
	versionText.setOrigin(1, 0);
	ctx.track(versionText);
}

async function checkUnlocks() {
	const pendingUnlocks = StatsStore.getPendingUnlocks();

	for (const unitId of pendingUnlocks) {
		await Components.UnlockModal.render(unitId);
		StatsStore.confirmUnlock(unitId);
		await env.time.delay(300);
	}
}

