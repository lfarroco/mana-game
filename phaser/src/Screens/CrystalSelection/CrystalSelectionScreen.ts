import * as Card from "@game/Entities/Card";
import * as cloudsBg from "../../Screens/Title/Components/cloudsBg";
import * as Effects from "./Effects";
import * as keyboard from "./Components/keyboard";
import * as background from "./Components/background";
import * as crystalDisplay from "./Components/crystalDisplay";
import * as paginationDots from "./Components/paginationDots";
import * as navigationButtons from "./Components/navigationButtons";
import * as actionButtons from "./Components/actionButtons";
import * as seedInput from "./Components/seedInput";
import * as title from "./Components/title";
import { CardDefinition, createEvent } from "@game/Models";
import { NavigationEvent } from "../../Events";
import { createScreen } from "../screenTracking";
import { CRYSTAL_IDS, paginationDotId } from "./ids";

// ---------------------------------------------------------------------------
// Events
// ---------------------------------------------------------------------------

export type CrystalSelectionEvents = {
	playClicked: ReturnType<typeof createEvent<void>>;
	backClicked: ReturnType<typeof createEvent<void>>;
	crystalChanged: ReturnType<typeof createEvent<{ index: number }>>;
};

// ---------------------------------------------------------------------------
// Phases — single "main" phase; all content lives in the persistent layer.
// Crystal navigation (prev/next) is event-driven, not phase-driven.
// ---------------------------------------------------------------------------

type CrystalPhase = "main";

// ---------------------------------------------------------------------------
// Selection state — data only, no Phaser refs.
// Populated in create(), read by navigation buttons and effects.
// ---------------------------------------------------------------------------

let crystals: CardDefinition[] = [];
let currentIndex = 0;

export function getSelection() {
	return { crystals, currentIndex };
}

// ---------------------------------------------------------------------------
// Screen factory
// ---------------------------------------------------------------------------

const screen = createScreen<CrystalPhase, CrystalSelectionEvents>({
	name: "crystal_selection",

	events: () => {
		const e: CrystalSelectionEvents = {
			playClicked: createEvent<void>(),
			backClicked: createEvent<void>(),
			crystalChanged: createEvent<{ index: number }>(),
		};
		return {
			events: e,
			listeners: [
				e.playClicked.listen(Effects.startNewGame),
				e.backClicked.listen(NavigationEvent.toTitle.emit),
				e.crystalChanged.listen(({ index }) => {
					currentIndex = index;
					Effects.updateDisplay(crystals, currentIndex);
				}),
			],
		};
	},

	create: async (ctx) => {
		crystals = Card.getCores();
		currentIndex = 0;

		cloudsBg.create();

		// Card display background
		ctx.add(background.create(), { id: CRYSTAL_IDS.background });

		// Crystal display (sprite + float tween, name, description)
		const display = crystalDisplay.create(crystals[currentIndex]);
		ctx.add(display.sprite, { id: CRYSTAL_IDS.sprite });
		ctx.add(display.nameText, { id: CRYSTAL_IDS.name });
		ctx.add(display.descText, { id: CRYSTAL_IDS.description });

		// Title
		ctx.add(title.create(), { id: CRYSTAL_IDS.title });

		// Pagination dots
		const dots = paginationDots.create(crystals.length);
		dots.forEach((dot, i) => ctx.add(dot, { id: paginationDotId(i) }));

		// Navigation buttons (prev / next)
		navigationButtons.create().forEach((c) => ctx.add(c));

		// Action buttons (play / back)
		actionButtons.create().forEach((c) => ctx.add(c));

		// Seed input (DOM keyboard + text field)
		seedInput.create(ctx);

		// Keyboard uses DOM — clean up on screen destroy
		ctx.onDestroy(() => keyboard.destroy());

		// Initial display update
		Effects.updateDisplay(crystals, currentIndex);

		await ctx.go("main");
	},

	phases: {
		main: () => {
			// Single-phase screen — all content lives in the persistent create() layer.
		},
	},
});

// ---------------------------------------------------------------------------
// ScreenModule exports — the shape Client.ts expects
// ---------------------------------------------------------------------------

export const name = screen.name;

export let events: CrystalSelectionEvents;

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
	crystals = [];
	currentIndex = 0;
}


