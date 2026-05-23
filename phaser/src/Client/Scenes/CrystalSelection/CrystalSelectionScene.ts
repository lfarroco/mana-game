import * as Phaser from "phaser";
import { getCores, CardDefinition } from "@Models/Entities/Card";
import { cloudsBg } from "Client/Scenes/Title/components/cloudsBg";
import BBCodeText from "phaser3-rex-plugins/plugins/gameobjects/tagtext/bbcodetext/BBCodeText";
import { createLogger } from "@Utils/Logger";
import { MultiplayerQueueType } from "@Multiplayer/MultiplayerTypes";
import * as ControlsSystem from "@Systems/Controls";
import { paginationDots } from "./Components/paginationDots";
import { crystalDisplay } from "./Components/crystalDisplay";
import { navigationButtons } from "./Components/navigationButtons";
import { actionButtons } from "./Components/actionButtons";
import { seedInput } from "./Components/seedInput";
import { returnToTitle } from "./Effects/returnToTitle";
import { updateDisplay } from "./Effects/updateDisplay";
import { background } from "./Components/background";
import { title } from "./Components/title";

export const logger = createLogger("CrystalSelectionScene");

//TODO: should also disable seed selection in multiplayer mode
// interface CrystalSelectionData {
// 	isMultiplayer?: boolean;
// 	isArena?: boolean;
// 	multiplayerQueueType?: MultiplayerQueueType;
// }

// Layout positioning
export const CARD_DISPLAY_Y = 400;
export const TITLE_Y = 120;
export const SPRITE_Y = 300;
export const CARD_NAME_Y = SPRITE_Y + 150;
export const DESCRIPTION_Y = 500;
export const PAGINATION_Y = 700;
export const PLAY_BUTTON_Y = 830;
export const BACK_BUTTON_Y = 930;
//const BACK_BUTTON_Y = 930;
export const NAV_BUTTON_OFFSET_X = 350;

// Pagination styling
export const DOT_SIZE = 16;
export const DOT_SPACING = 32;
export const PAGINATION_DOT_COLOR = 0xffffff;
export const PAGINATION_DOT_STROKE_COLOR = 0xffffff;
export const PAGINATION_DOT_INACTIVE_ALPHA = 0.3;
export const PAGINATION_DOT_ACTIVE_ALPHA = 1;
export const PAGINATION_DOT_STROKE_WIDTH = 2;
export const PAGINATION_DOT_STROKE_ALPHA = 0.5;

// Crystal display styling
export const TITLE_FONT_SIZE = "48px";
export const CRYSTAL_NAME_FONT_SIZE = "36px";
export const DESCRIPTION_FONT_SIZE = "24px";
export const DESCRIPTION_LINE_SPACING = 10;
export const DESCRIPTION_WRAP_WIDTH = 1100;
export const DESCRIPTION_ORIGIN_X = 0.5;
export const DESCRIPTION_ORIGIN_Y = 0;

// Crystal display box
export const CARD_DISPLAY_BG_WIDTH = 1200;
export const CARD_DISPLAY_BG_HEIGHT = 700;
export const CARD_DISPLAY_BG_COLOR = 0x000000;
export const CARD_DISPLAY_BG_ALPHA = 0.8;

// Crystal sprite
export const CRYSTAL_SPRITE_SIZE = 200;
export const CRYSTAL_FLOAT_ANIMATION_DURATION = 1500;
export const CRYSTAL_FLOAT_Y_OFFSET = -10;
export const CRYSTAL_FLOAT_EASE = "Sine.InOut";

// Navigation buttons
export const NAV_BUTTON_WIDTH = 200;

// Cloud background animation
export const CLOUD_BG_ANIMATION_DURATION = 1500;
export const CLOUD_BG_ANIMATION_EASE = "Sine.InOut";

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

	ControlsSystem.init({ context: "buttons", onCancel: returnToTitle });
}

