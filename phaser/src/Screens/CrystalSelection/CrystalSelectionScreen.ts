import * as Card from "@game/Entities/Card";
import * as cloudsBg from "../../Screens/Title/Components/cloudsBg";
import BBCodeText from "phaser3-rex-plugins/plugins/gameobjects/tagtext/bbcodetext/BBCodeText";

import * as Components from "./Components";
import * as Effects from "./Effects";
import * as keyboard from "./Components/keyboard";
import * as Models from "@game/Models";
import { createEvent } from "@game/Models";
import { NavigationEvent } from "../../Events";
import { createScreenLifecycle } from "../screenLifecycle";

// ---------------------------------------------------------------------------
// Events
// ---------------------------------------------------------------------------

export type CrystalSelectionEvents = {
	playClicked: ReturnType<typeof createEvent<void>>;
	backClicked: ReturnType<typeof createEvent<void>>;
	crystalChanged: ReturnType<typeof createEvent<{ index: number }>>;
};
export const name = "crystal_selection";


const lifecycle = createScreenLifecycle();

export let events: CrystalSelectionEvents;

export function init() {
	events = lifecycle.init(() => {
		const e: CrystalSelectionEvents = {
			playClicked: createEvent<void>(),
			backClicked: createEvent<void>(),
			crystalChanged: createEvent<{ index: number }>(),
		};
		return {
			events: e,
			disposers: [
				e.playClicked.listen(Effects.startNewGame),
				e.backClicked.listen(NavigationEvent.toTitle.emit),
				e.crystalChanged.listen(({ index }) => {
					state.currentIndex = index;
					Effects.updateDisplay();
				}),
			],
		};
	});
}

export function destroy() {
	keyboard.destroy();
	lifecycle.destroy();
}


export const state: {
	crystals: Models.CardDefinition[];
	currentIndex: number;
	crystalSprite: Phaser.GameObjects.Image;
	crystalName: Phaser.GameObjects.Text;
	descriptionText: BBCodeText;
	seedWarningText: Phaser.GameObjects.Text;
	multiplayerQueueType: Models.MultiplayerQueueType;
	paginationDots: Phaser.GameObjects.Arc[];
} = {
	crystals: [] as Models.CardDefinition[],
	currentIndex: 0,
	crystalSprite: {} as Phaser.GameObjects.Image,
	crystalName: {} as Phaser.GameObjects.Text,
	descriptionText: {} as BBCodeText,
	paginationDots: [] as Phaser.GameObjects.Arc[],
	seedWarningText: {} as Phaser.GameObjects.Text,
	multiplayerQueueType: "casual",
};

export function create() {
	init();

	state.crystals = Card.getCores();
	state.currentIndex = 0;

	cloudsBg.create();

	Components.create();

	Effects.updateDisplay();
}

