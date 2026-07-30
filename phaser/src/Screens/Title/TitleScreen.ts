import * as constants from "@Constants";
import * as AudioManager from "@Systems/AudioManager";
import * as StatsStore from "@Models/StatsStore";
import * as environment from "@Utils/environment";
import * as Components from "./Components"
import * as LanguagePanel from "./Components/LanguagePanel";
import pkg from "../../../package.json";
import { createEvent } from "@game/Models";
import { env } from "@Env";
import { NavigationEvent } from "../../Events";
import { loadGame } from "../../Storage/loadGame";
import { createScreen, ScreenCtx } from "../screenTracking";

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

/**
 * Internal phases.  Each phase re-renders the shared chrome (howToPlay) so
 * that any locale change applied in the language panel is reflected as soon
 * as the next phase starts.
 */
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
			],
		};
	},

	create: async (ctx) => {
		Components.cloudsBg.create();
		Components.logo.render();
		displayVersion(ctx);
		AudioManager.playMusic("music_ageofdisjunction");
		await ctx.go("main");
		checkUnlocks();
	},

	phases: {
		main: (ctx) => {
			renderChrome(ctx);
			const mainButtons = env.container([
				Components.singlePlayerButton.create().container,
				Components.arenaButton.create().container,
				Components.optionsButton.create().container,
				Components.linksButton.create().container,
				environment.isElectron() ?
					Components.exitButton.create().container :
					null,
				Components.languageButton.create().container,
			]);
			ctx.add(mainButtons, { id: TITLE_IDS.mainButtons });
		},

		submenu: (ctx) => {
			renderChrome(ctx);
			Components.singlePlayerButton.createSubmenu(ctx);
		},

		options_submenu: (ctx) => {
			renderChrome(ctx);
			Components.optionsButton.createSubmenu(ctx);
		},

		language: (ctx) => {
			renderChrome(ctx);
			LanguagePanel.create(ctx);
		},
	},
});

// ---------------------------------------------------------------------------
// ScreenModule exports — the shape Client.ts expects
// ---------------------------------------------------------------------------

export const name = screen.name;

export let events: TitleScreenEvents;

export const components = Components;

export function init() {
	screen.init();
	events = screen.events;
}

export async function create() {
	init();
	await screen.create();
}

export function destroy() {
	screen.destroy();
}

/** Switch the screen's internal phase (main buttons ↔ submenus ↔ language panel). */
export const go = (phase: TitlePhase) => screen.go(phase);

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/*
 * Renders the shared per-phase chrome — elements that stay visually present
 * across phases (unlike the persistent layer, they are re-created on every
 * phase transition so translated text always reflects the current locale).
 */
function renderChrome(ctx: ScreenCtx<TitlePhase>) {
	ctx.add(Components.howToPlay.create(), { id: TITLE_IDS.howToPlay });
}

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

