/**
 * CrystalSelectionScene — the crystal picker as a raw Phaser scene.
 *
 * Third screen migrated off `@mana/framework` (see `Scenes/ScreenScene.ts`).
 * The scene builds the display once and mutates it via `Effects/updateDisplay`
 * as the player pages through crystals (the raw-scene replacement for the
 * framework's `findTrackedById` element lookup — the refs are held on the
 * scene and passed explicitly).
 *
 * The DOM numpad (`Components/keyboard.ts`) is torn down in
 * `onScreenShutdown()`, which the old framework teardown never did.
 */

import * as Card from "@game/Entities/Card";
import * as cloudsBg from "../Title/Components/cloudsBg";
import * as Effects from "./Effects";
import * as keyboard from "./Components/keyboard";
import * as background from "./Components/background";
import * as crystalDisplay from "./Components/crystalDisplay";
import * as paginationDots from "./Components/paginationDots";
import * as navigationButtons from "./Components/navigationButtons";
import * as actionButtons from "./Components/actionButtons";
import * as seedInput from "./Components/seedInput";
import * as title from "./Components/title";
import * as SessionManager from "../../SessionManager";
import { createEvent } from "@game/Models";
import { env } from "@Env";
import { go } from "@Scenes/AppRouter";
import { ScreenScene } from "@Scenes/ScreenScene";
import { clearSelection, getSelection, setCurrentIndex, setSelection } from "./selection";
import type { CrystalDisplayRefs } from "./Effects/updateDisplay";

/** Phaser scene key — must match the route name (see Scenes/routes.ts). */
export const CRYSTAL_SELECTION_SCENE_KEY = "crystals";
/** Probe/event name (the e2e smoke test and debug API expect this). */
export const CRYSTAL_SELECTION_SCREEN_NAME = "crystal_selection";

export type CrystalSelectionEvents = {
	playClicked: ReturnType<typeof createEvent<void>>;
	backClicked: ReturnType<typeof createEvent<void>>;
	crystalChanged: ReturnType<typeof createEvent<{ index: number }>>;
};

/** Context handed to the crystal-selection sub-components. */
export type CrystalSelectionContext = {
	events: CrystalSelectionEvents;
};

export class CrystalSelectionScene extends ScreenScene {
	private selectionCtx: CrystalSelectionContext | null = null;
	private displayRefs: CrystalDisplayRefs | null = null;
	private disposers: (() => void)[] = [];

	constructor() {
		super({ key: CRYSTAL_SELECTION_SCENE_KEY }, CRYSTAL_SELECTION_SCREEN_NAME);
	}

	protected buildScreen(): void {
		const crystals = Card.getCores();
		setSelection(crystals, 0);

		// Fresh numeric seed for the new run: what the numpad shows is what
		// the run starts with (startNewGame threads it through createSession).
		const freshSeed = SessionManager.generateSessionSeed();
		env.patchState({
			session: { ...env.state.session, seed: freshSeed, initial_seed: freshSeed },
		});

		cloudsBg.create();

		// Card display background
		background.create();

		// Crystal display (sprite + float tween, name, description)
		const display = crystalDisplay.create(crystals[0]);
		const dots = paginationDots.create(crystals.length);
		this.displayRefs = {
			sprite: display.sprite,
			nameText: display.nameText,
			descText: display.descText,
			dots,
		};

		title.create();

		// Seed input (DOM numpad + text field)
		seedInput.create();

		const events = createSelectionEvents();
		this.selectionCtx = { events };
		this.disposers = [
			events.playClicked.listen(Effects.startNewGame),
			events.backClicked.listen(() => {
				void go("title");
			}),
			events.crystalChanged.listen(({ index }) => this.onCrystalChanged(index)),
		];

		navigationButtons.create(this.selectionCtx);
		actionButtons.create(this.selectionCtx);

		Effects.updateDisplay(crystals, 0, this.displayRefs);
	}

	protected onScreenShutdown(): void {
		this.disposers.forEach((dispose) => dispose());
		this.disposers = [];
		this.selectionCtx = null;
		this.displayRefs = null;

		// DOM + module-level singletons Phaser cannot clean up on its own.
		keyboard.destroy();
		cloudsBg.destroy();
		clearSelection();
	}

	private onCrystalChanged(index: number): void {
		const { crystals } = getSelection();
		setCurrentIndex(index);
		if (this.displayRefs) {
			Effects.updateDisplay(crystals, index, this.displayRefs);
		}
	}
}

function createSelectionEvents(): CrystalSelectionEvents {
	return {
		playClicked: createEvent<void>(),
		backClicked: createEvent<void>(),
		crystalChanged: createEvent<{ index: number }>(),
	};
}
