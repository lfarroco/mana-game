import * as Card from "@Models/Entities/Card";
import * as cloudsBg from "Client/Screens/Title/Components/cloudsBg";
import BBCodeText from "phaser3-rex-plugins/plugins/gameobjects/tagtext/bbcodetext/BBCodeText";
import * as MultiplayerTypes from "@Multiplayer/MultiplayerTypes";

import * as Components from "./Components";
import * as Effects from "./Effects";


//TODO: should also disable seed selection in multiplayer mode

export const state: {
	crystals: Card.CardDefinition[];
	currentIndex: number;
	crystalSprite: Phaser.GameObjects.Image;
	crystalName: Phaser.GameObjects.Text;
	descriptionText: BBCodeText;
	seedWarningText: Phaser.GameObjects.Text;
	multiplayerQueueType: MultiplayerTypes.MultiplayerQueueType;
	paginationDots: Phaser.GameObjects.Arc[];
} = {
	crystals: [] as Card.CardDefinition[],
	currentIndex: 0,
	crystalSprite: {} as Phaser.GameObjects.Image,
	crystalName: {} as Phaser.GameObjects.Text,
	descriptionText: {} as BBCodeText,
	paginationDots: [] as Phaser.GameObjects.Arc[],
	seedWarningText: {} as Phaser.GameObjects.Text,
	multiplayerQueueType: "casual",
};

export function create() {

	state.crystals = Card.getCores();
	state.currentIndex = 0;

	cloudsBg.create();

	Components.create();

	Effects.updateDisplay();
}

