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
import { getScreenManager } from "../ScreenManager";
import { createScreen, screenModule } from "@mana/framework";
import { CRYSTAL_IDS } from "./ids";
import { GameEvent } from "../../Events";

export type CrystalSelectionEvents = {
	playClicked: ReturnType<typeof createEvent<void>>;
	backClicked: ReturnType<typeof createEvent<void>>;
	crystalChanged: ReturnType<typeof createEvent<{ index: number }>>;
};

let crystals: CardDefinition[] = [];
let currentIndex = 0;

export function getSelection() {
	return { crystals, currentIndex };
}

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
				GameEvent.screenHidden.listen(cleanup),
				e.playClicked.listen(Effects.startNewGame),
				e.backClicked.listen(() => {
					void getScreenManager().go("title");
				}),
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
		ctx.track(background.create(), { id: CRYSTAL_IDS.background });

		// Crystal display (sprite + float tween, name, description)
		const display = crystalDisplay.create(crystals[currentIndex]);
		ctx.track(display.sprite, { id: CRYSTAL_IDS.sprite });
		ctx.track(display.nameText, { id: CRYSTAL_IDS.name });
		ctx.track(display.descText, { id: CRYSTAL_IDS.description });

		// Title
		ctx.track(title.create(), { id: CRYSTAL_IDS.title });

		// Pagination dots — tracked by ID so updateDisplay() can refresh them
		ctx.track(paginationDots.create(crystals.length), { idPrefix: "crystal.pagination-dot-" });

		// Seed input (DOM keyboard + text field) — tracks its own elements
		seedInput.create(ctx);

		const elements = [keyboard, ...navigationButtons.create(ctx), ...actionButtons.create(ctx)];

		Effects.updateDisplay(crystals, currentIndex);

		return elements;
	},
});

const cleanup = () => {
	crystals = [];
	currentIndex = 0;
};

export const { init, create, destroy, name } = screenModule(screen);
