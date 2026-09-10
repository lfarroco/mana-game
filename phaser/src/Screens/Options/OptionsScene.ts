/**
 * OptionsScene — the options screen as a raw Phaser scene.
 *
 * Second screen migrated off `@mana/framework` (see `Scenes/ScreenScene.ts`).
 * The audio/graphics/game tabs are scene-local state: `go(phase)` destroys the
 * current tab's elements and builds the next, while the aurora background,
 * title label, tab buttons and back button persist for the screen's lifetime
 * (Phaser destroys them on scene shutdown).
 *
 * Deep-linking (`go("options", { tab: "graphics" })`) works through the Phaser
 * scene data the router passes to `scene.start` — see `initialTab()`.
 */

import * as CloudsBackground from "@Components/CloudsBackground/CloudsBackground";
import * as optionsLabel from "./Components/optionsLabel";
import * as tabButtons from "./Components/tabButtons";
import * as backButton from "./Components/backButton";
import { audioTab } from "./Components/tabs/audio";
import { gameTab } from "./Components/tabs/game";
import { graphicsTab } from "./Components/tabs/graphics";
import { createEvent } from "@game/Models";
import { go as navigate } from "@Scenes/AppRouter";
import { ScreenScene } from "@Scenes/ScreenScene";
import {
	LAYOUT,
	isOptionsPhase,
	type OptionsContext,
	type OptionsPhase,
	type OptionsScreenEvents,
} from "./optionsConfig";

/** Phaser scene key — must match the route name (see Scenes/routes.ts). */
export const OPTIONS_SCENE_KEY = "options";

/** Anything a tab builder creates that must be torn down on a tab switch. */
type Destroyable = { destroy: () => void };

const TAB_BUILDERS: Record<OptionsPhase, () => Destroyable[]> = {
	audio: () => {
		tabButtons.setActiveTab("audio");
		return audioTab(LAYOUT.OPTIONS_START_Y, LAYOUT.OPTIONS_LINE_HEIGHT);
	},
	graphics: () => {
		tabButtons.setActiveTab("graphics");
		return graphicsTab(LAYOUT.OPTIONS_START_Y);
	},
	game: () => {
		tabButtons.setActiveTab("game");
		return gameTab(LAYOUT.OPTIONS_START_Y, LAYOUT.OPTIONS_LINE_HEIGHT);
	},
};

export class OptionsScene extends ScreenScene {
	private optionsCtx: OptionsContext | null = null;
	private phase: OptionsPhase | null = null;
	private phaseElements: Destroyable[] = [];
	private disposers: (() => void)[] = [];
	private background: CloudsBackground.CloudsBackground | null = null;

	constructor() {
		super({ key: OPTIONS_SCENE_KEY });
	}

	protected async buildScreen(): Promise<void> {
		const backToTitle: OptionsScreenEvents["backToTitle"] = createEvent<void>();
		this.optionsCtx = {
			go: (phase) => void this.go(phase),
			events: { backToTitle },
		};
		this.disposers = [
			backToTitle.listen(() => {
				void navigate("title");
			}),
		];

		// Owned by the scene: Phaser can't destroy a plain wrapper, so the
		// background is torn down explicitly in onScreenShutdown().
		this.background = new CloudsBackground.CloudsBackground({ preset: "aurora" });

		optionsLabel.create();
		tabButtons.create(this.optionsCtx);
		backButton.create(this.optionsCtx);

		await this.go(this.initialTab());
	}

	/** Switch the visible tab, destroying the previous tab's elements. */
	async go(phase: OptionsPhase): Promise<void> {
		const build = TAB_BUILDERS[phase];
		if (!build) {
			console.warn(
				`[OptionsScene] go("${phase}") ignored — no such tab (declared: ${Object.keys(TAB_BUILDERS).join(", ")}).`
			);
			return;
		}

		this.destroyPhase();
		this.phase = phase;
		this.phaseElements = build().filter(Boolean);
	}

	currentPhase(): OptionsPhase | null {
		return this.phase;
	}

	protected onScreenShutdown(): void {
		this.destroyPhase();

		this.disposers.forEach((dispose) => dispose());
		this.disposers = [];
		this.optionsCtx = null;

		this.background?.destroy();
		this.background = null;
		tabButtons.reset();
	}

	/** Deep-link target from the route params, defaulting to the audio tab. */
	private initialTab(): OptionsPhase {
		const data = this.sys.settings.data as { tab?: unknown } | undefined;
		return isOptionsPhase(data?.tab) ? data.tab : "audio";
	}

	private destroyPhase(): void {
		const elements = this.phaseElements;
		this.phaseElements = [];
		this.phase = null;

		for (const element of elements) {
			try {
				element.destroy();
			} catch (err) {
				console.warn("[OptionsScene] failed to destroy a tab element", err);
			}
		}
	}
}
