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

/** Element IDs for tracked objects — usable with ctx.findById / findTrackedById. */
export const TITLE_IDS = {
	mainButtons: "title.main-buttons",
	submenu: "title.submenu",
	optionsSubmenu: "title.options-submenu",
	howToPlay: "title.how-to-play",
	languagePanel: "title.language-panel",
	languageOverlay: "title.language-overlay",
} as const;

/** Internal phases.  Shared chrome (howToPlay) lives in the persistent layer. */
export type TitlePhase = "main" | "submenu" | "options_submenu" | "language";

const screen = createScreen<TitlePhase, TitleScreenEvents>({
	name: "title",

	events: () => {
		const e: TitleScreenEvents = {
			newGameButtonClicked: createEvent<void>(),
			resumeGameButtonClicked: createEvent<void>(),
		};
		return {
			events: e,
			listeners: [
				e.newGameButtonClicked.listen(NavigationEvent.toCrystals.emit),
				e.resumeGameButtonClicked.listen(() => {
					loadGame();
					NavigationEvent.toBattleground.emit();
				}),
				GameEvent.localeChanged.listen(() => {
					Components.howToPlay.refresh();
				}),
			],
		};
	},

	create: async (ctx) => {
		Components.cloudsBg.create();
		Components.logo.render();
		displayVersion(ctx);
		ctx.add(Components.howToPlay.create(), { id: TITLE_IDS.howToPlay });
		AudioManager.playMusic("music_ageofdisjunction");
		await ctx.go("main");
		checkUnlocks();
	},

	phases: {
		main: (ctx) => {
			const mainButtons = env.container([
				Components.singlePlayerButton.create(ctx).container,
				Components.arenaButton.create().container,
				Components.optionsButton.create(ctx).container,
				Components.linksButton.create().container,
				environment.isElectron() ?
					Components.exitButton.create().container :
					null,
				Components.languageButton.create(ctx).container,
			]);
			ctx.add(mainButtons, { id: TITLE_IDS.mainButtons });
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

// ---------------------------------------------------------------------------
// ScreenModule exports — the shape Client.ts expects
// ---------------------------------------------------------------------------

const _screen = screenModule(screen);
export const { init, create, destroy, go } = _screen;
export const name = _screen.name;

// Extra screen-specific exports
export const components = Components;

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/*
 * Displays the game version in the top-right corner of the screen
 */
function displayVersion(ctx: ScreenCtx<TitlePhase>) {
	const versionText = env.scene.add.text(
		0, 0,
		`v${pkg.version}`,
		{ fontSize: "16px", color: "white", });
	versionText.setPosition(constants.SCREEN_WIDTH - 30, 10);
	versionText.setAlpha(0.5);
	versionText.setOrigin(1, 0);
	ctx.add(versionText);
}

async function checkUnlocks() {
	const pendingUnlocks = StatsStore.getPendingUnlocks();

	for (const unitId of pendingUnlocks) {
		await Components.UnlockModal.render(unitId);
		StatsStore.confirmUnlock(unitId);
		await env.time.delay(300);
	}
}

