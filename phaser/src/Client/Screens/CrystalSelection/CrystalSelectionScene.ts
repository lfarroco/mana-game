import * as Card from "@Models/Entities/Card";
import * as cloudsBg from "Client/Screens/Title/Components/cloudsBg";
import BBCodeText from "phaser3-rex-plugins/plugins/gameobjects/tagtext/bbcodetext/BBCodeText";
import * as Logger from "@Utils/Logger";
import * as MultiplayerTypes from "@Multiplayer/MultiplayerTypes";

import * as paginationDots from "./Components/paginationDots";
import * as crystalDisplay from "./Components/crystalDisplay";
import * as navigationButtons from "./Components/navigationButtons";
import * as actionButtons from "./Components/actionButtons";
import * as seedInput from "./Components/seedInput";
import * as background from "./Components/background";
import * as title from "./Components/title";

import * as updateDisplay from "./Effects/updateDisplay";

export const logger = Logger.createLogger("CrystalSelectionScene");

//TODO: should also disable seed selection in multiplayer mode

export const state: {
	crystals: Card.CardDefinition[];
	currentIndex: number;
	crystalSprite: Phaser.GameObjects.Image;
	crystalName: Phaser.GameObjects.Text;
	descriptionText: BBCodeText;
	seedWarningText: Phaser.GameObjects.Text;
	isMultiplayer: boolean;
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
	isMultiplayer: false,
	multiplayerQueueType: "casual",
};

export function renderCrystalSelectionScreen(multiplayer: boolean) {

	state.isMultiplayer = multiplayer;
	state.crystals = Card.getCores();
	state.currentIndex = 0;

	cloudsBg.render();
	background.background();
	title.title();
	crystalDisplay.crystalDisplay();
	navigationButtons.navigationButtons();
	paginationDots.paginationDots();
	actionButtons.actionButtons();
	seedInput.seedInput();
	updateDisplay.updateDisplay();
}

