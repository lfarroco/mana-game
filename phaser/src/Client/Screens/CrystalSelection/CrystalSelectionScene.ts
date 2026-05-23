import * as Phaser from "phaser";
import { getCores, CardDefinition } from "@Models/Entities/Card";
import { cloudsBg } from "Client/Screens/Title/components/cloudsBg";
import BBCodeText from "phaser3-rex-plugins/plugins/gameobjects/tagtext/bbcodetext/BBCodeText";
import { createLogger } from "@Utils/Logger";
import { MultiplayerQueueType } from "@Multiplayer/MultiplayerTypes";
import * as ControlsSystem from "@Systems/Controls";

import { paginationDots } from "./Components/paginationDots";
import { crystalDisplay } from "./Components/crystalDisplay";
import { navigationButtons } from "./Components/navigationButtons";
import { actionButtons } from "./Components/actionButtons";
import { seedInput } from "./Components/seedInput";
import { background } from "./Components/background";
import { title } from "./Components/title";

import { returnToTitle } from "./Effects/returnToTitle";
import { updateDisplay } from "./Effects/updateDisplay";

export const logger = createLogger("CrystalSelectionScene");

//TODO: should also disable seed selection in multiplayer mode

export const state: {
	crystals: CardDefinition[];
	currentIndex: number;
	crystalSprite: Phaser.GameObjects.Image;
	crystalName: Phaser.GameObjects.Text;
	descriptionText: BBCodeText;
	seedWarningText: Phaser.GameObjects.Text;
	isMultiplayer: boolean;
	multiplayerQueueType: MultiplayerQueueType;
	paginationDots: Phaser.GameObjects.Arc[];
} = {
	crystals: [] as CardDefinition[],
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
	state.crystals = getCores();
	state.currentIndex = 0;

	cloudsBg();
	background();
	title();
	crystalDisplay();
	navigationButtons();
	paginationDots();
	actionButtons();
	seedInput();
	updateDisplay();

	ControlsSystem.init({
		context: "buttons",
		onCancel: returnToTitle,
	});
}

