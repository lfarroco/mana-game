/**
 * TitleScene — the title screen as a raw Phaser scene.
 *
 * First screen migrated off `@mana/framework` (see `Scenes/ScreenScene.ts`).
 * Phaser owns the lifecycle: entering the scene builds the persistent layer
 * (background, logo, version, "how to play") and the active sub-menu; leaving
 * it (or restarting it) destroys every game object, tween and scene listener
 * automatically. `onScreenShutdown()` resets the module-level UI guards that
 * Phaser can't know about, so a second visit starts clean.
 *
 * Sub-menus are scene-local state, not framework "phases": `go(phase)`
 * destroys the current menu's elements and builds the next one. `go` /
 * `currentPhase` stay public because the debug/e2e probes (`__debug`) use them.
 */

import * as constants from "@Constants";
import * as AudioManager from "@Systems/AudioManager";
import * as StatsStore from "@Models/StatsStore";
import * as environment from "@Utils/environment";
import * as CreditsPanel from "./Components/CreditsPanel";
import * as StatsPanel from "./Components/StatsPanel";
import * as TutorialOverlay from "./Components/TutorialOverlay";
import * as Components from "./Components";
import * as LanguagePanel from "./Components/LanguagePanel";
import pkg from "../../../package.json";
import { createEvent } from "@game/Models";
import { env } from "@Env";
import { GameEvent } from "../../Events";
import { go } from "../../Scenes/AppRouter";
import { ScreenScene } from "../../Scenes/ScreenScene";
import { loadGame } from "@Systems/Storage/loadGame";
import { setMultiplayerMode } from "@lib/multiplayerMode";

/** Phaser scene key / route name. */
export const TITLE_SCENE_KEY = "title";

export type TitlePhase = "main" | "singleplayer_submenu" | "options_submenu" | "language";

export type TitleScreenEvents = {
	newGameButtonClicked: ReturnType<typeof createEvent<void>>;
	resumeGameButtonClicked: ReturnType<typeof createEvent<void>>;
};

/** Context handed to the title's menu builders (replaces `ScreenCtx`). */
export type TitleContext = {
	go: (phase: TitlePhase) => void;
	events: TitleScreenEvents;
};

/** Anything a menu builder creates that must be torn down on a phase switch. */
type Destroyable = { destroy: () => void };

type PhaseBuilder = (ctx: TitleContext) => Destroyable[];

const PHASES: Record<TitlePhase, PhaseBuilder> = {
	main: mainPhase,
	singleplayer_submenu: Components.singlePlayerButton.createSinglePlayerSubmenu,
	options_submenu: Components.optionsButton.createSubmenu,
	language: LanguagePanel.create,
};

export class TitleScene extends ScreenScene {
	private titleCtx: TitleContext | null = null;
	private phase: TitlePhase | null = null;
	private phaseElements: Destroyable[] = [];
	private disposers: (() => void)[] = [];

	constructor() {
		super({ key: TITLE_SCENE_KEY });
	}

	protected async buildScreen(): Promise<void> {
		const events = createTitleEvents();
		this.titleCtx = { go: (phase) => void this.go(phase), events };
		this.disposers = wireTitleEvents(events);

		Components.cloudsBg.create();
		Components.logo.render();
		AudioManager.playMusic("music_ageofdisjunction");
		displayVersion();
		Components.howToPlay.create();

		await this.go("main");

		// Fire-and-forget (as before): unlock modals gate the menu but must not
		// delay `screenShown` / the fade-in.
		void checkUnlocks();
	}

	/** Switch the visible sub-menu, destroying the previous one's elements. */
	async go(phase: TitlePhase): Promise<void> {
		const builder = PHASES[phase];
		if (!builder) {
			console.warn(
				`[TitleScene] go("${phase}") ignored — no such phase ` +
					`(declared: ${Object.keys(PHASES).join(", ")}).`
			);
			return;
		}

		const ctx = this.titleCtx;
		if (!ctx) return;

		this.destroyPhase();
		this.phase = phase;
		this.phaseElements = builder(ctx).filter(Boolean);
	}

	currentPhase(): TitlePhase | null {
		return this.phase;
	}

	protected onScreenShutdown(): void {
		this.destroyPhase();

		this.disposers.forEach((dispose) => dispose());
		this.disposers = [];
		this.titleCtx = null;

		// Module-level guards survive the scene shutdown (Phaser destroys the
		// game objects, not these flags). Without the reset, a panel/overlay
		// that was open when the scene ended would refuse to open on the next
		// visit, and the background would keep a destroyed active instance.
		Components.cloudsBg.destroy();
		Components.howToPlay.reset();
		StatsPanel.reset();
		CreditsPanel.reset();
		TutorialOverlay.reset();
	}

	private destroyPhase(): void {
		const elements = this.phaseElements;
		this.phaseElements = [];
		this.phase = null;

		for (const element of elements) {
			try {
				element.destroy();
			} catch (err) {
				console.warn("[TitleScene] failed to destroy a menu element", err);
			}
		}
	}
}

function mainPhase(ctx: TitleContext): Destroyable[] {
	return [
		Components.singlePlayerButton.create(ctx),
		Components.arenaButton.create(),
		Components.optionsButton.create(ctx),
		Components.linksButton.create(),
		environment.isElectron() ? Components.exitButton.create() : env.container(),
		Components.languageButton.create(ctx),
	];
}

function createTitleEvents(): TitleScreenEvents {
	return {
		newGameButtonClicked: createEvent<void>(),
		resumeGameButtonClicked: createEvent<void>(),
	};
}

function wireTitleEvents(events: TitleScreenEvents): (() => void)[] {
	return [
		events.newGameButtonClicked.listen(() => {
			// Explicit single-player entry — reset any pending multiplayer mode.
			setMultiplayerMode(false);
			void go("crystals");
		}),
		events.resumeGameButtonClicked.listen(loadGame),
		events.resumeGameButtonClicked.listen(() => {
			void go("battleground");
		}),
		GameEvent.localeChanged.listen(Components.howToPlay.refresh),
	];
}

function displayVersion(): Phaser.GameObjects.Text {
	return env.scene.add
		.text(0, 0, `v${pkg.version}`, { fontSize: "16px", color: "white" })
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
