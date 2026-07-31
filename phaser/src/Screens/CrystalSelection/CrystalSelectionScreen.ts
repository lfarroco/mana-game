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
import { createScreen, screenModule } from "../screenTracking";
import { CRYSTAL_IDS } from "./ids";

// ---------------------------------------------------------------------------
// Events
// ---------------------------------------------------------------------------

export type CrystalSelectionEvents = {
	playClicked: ReturnType<typeof createEvent<void>>;
	backClicked: ReturnType<typeof createEvent<void>>;
	crystalChanged: ReturnType<typeof createEvent<{ index: number }>>;
};

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
// Screen factory — single-view, no phases needed
// ---------------------------------------------------------------------------

const screen = createScreen<never, CrystalSelectionEvents>({
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
		ctx.add(paginationDots.create(crystals.length), { idPrefix: "crystal.pagination-dot-" });

		// Navigation buttons (prev / next)
		ctx.add(navigationButtons.create());

		// Action buttons (play / back)
		ctx.add(actionButtons.create());

		// Seed input (DOM keyboard + text field)
		seedInput.create(ctx);

		// Keyboard uses DOM — clean up on screen destroy
		ctx.onDestroy(() => keyboard.destroy());

		// Initial display update
		Effects.updateDisplay(crystals, currentIndex);
	},
});

// ---------------------------------------------------------------------------
// ScreenModule exports — the shape Client.ts expects
// ---------------------------------------------------------------------------

const _cscreen = screenModule(screen, {
    onDestroy: () => { crystals = []; currentIndex = 0; },
});
export const { init, create, destroy } = _cscreen;
export const name = _cscreen.name;

// events must remain live (re-created per init cycle via the getter),
// so export a proxy that delegates every property access to the live events
export const events: CrystalSelectionEvents = new Proxy({} as CrystalSelectionEvents, {
    get(_target, prop, receiver) {
        const e = _cscreen.events;
        return e ? Reflect.get(e, prop, receiver) : undefined;
    }
}) as CrystalSelectionEvents;


