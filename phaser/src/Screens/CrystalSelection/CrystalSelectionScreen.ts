import * as Card from "@game/Entities/Card";
import * as cloudsBg from "../../Screens/Title/Components/cloudsBg";
import BBCodeText from "phaser3-rex-plugins/plugins/gameobjects/tagtext/bbcodetext/BBCodeText";

import * as Components from "./Components";
import * as Effects from "./Effects";
import * as Models from "@game/Models";
import { createEvent } from "@game/Models";
import { NavigationEvent } from "../../Events";

// ---------------------------------------------------------------------------
// Events
// ---------------------------------------------------------------------------

export type CrystalSelectionEvents = {
	playClicked: ReturnType<typeof createEvent<void>>;
	backClicked: ReturnType<typeof createEvent<void>>;
	crystalChanged: ReturnType<typeof createEvent<{ index: number }>>;
};

export let events: CrystalSelectionEvents;
let disposers: (() => void)[] = [];
let initialized = false;

export function init() {
	if (initialized) return;
	initialized = true;

	events = {
		playClicked: createEvent<void>(),
		backClicked: createEvent<void>(),
		crystalChanged: createEvent<{ index: number }>(),
	};

	disposers = [
		events.playClicked.listen(Effects.startNewGame),
		events.backClicked.listen(async () => {
			await NavigationEvent.toTitle.emit(undefined);
		}),
		events.crystalChanged.listen(({ index }) => {
			state.currentIndex = index;
			Effects.updateDisplay();
		}),
	];
}

export function destroy() {
	disposers.forEach((d) => d());
	disposers = [];

	if (events) {
		events.playClicked.clear();
		events.backClicked.clear();
		events.crystalChanged.clear();
	}

	initialized = false;
}


//FIXME: disable seed selection / custom seed input when session type is multiplayer

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

