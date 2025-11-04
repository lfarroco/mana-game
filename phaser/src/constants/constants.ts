import { size, vec2 } from "@Models/Geometry";

export const SCREEN_WIDTH = 1920;
export const SCREEN_HEIGHT = 1080;

export const MIDDLE_SCREEN_X = SCREEN_WIDTH / 2;
export const MIDDLE_SCREEN_Y = SCREEN_HEIGHT / 2;

export const MIDDLE_SCREEN = vec2(MIDDLE_SCREEN_X, MIDDLE_SCREEN_Y);

export const WHOLE_SCREEN = size(SCREEN_WIDTH, SCREEN_HEIGHT)

export const TICK_DURATION = 100;

export const TILE_WIDTH = SCREEN_WIDTH / 8;
export const TILE_HEIGHT = TILE_WIDTH;
export const HALF_TILE_WIDTH = TILE_WIDTH / 2;
export const HALF_TILE_HEIGHT = TILE_HEIGHT / 2;

export const SHOP_ITEM_PURCHASE_COST = 3;
export const DRAG_CLICK_THRESHOLD = 10;

export const MAX_PARTY_SIZE = 9;

export const REROLL_UNITS_PRICE = 3;

export const MIN_COOLDOWN = 200;

export const PLAYER_BOARD_X = 120;
export const PLAYER_BOARD_Y = (SCREEN_HEIGHT - (TILE_HEIGHT * 3 + 8 * 2)) / 2;

export const CPU_BOARD_X = SCREEN_WIDTH - (TILE_WIDTH * 3 + 8 * 2) - 120;
export const CPU_BOARD_Y = PLAYER_BOARD_Y;

export const defaultTextConfig: Phaser.Types.GameObjects.Text.TextStyle = {
	fontSize: (TILE_HEIGHT * 0.15) + "px",
	color: "white",
	fontFamily: "'Arial', sans-serif",
	stroke: "black",
	strokeThickness: 4,
};

export const titleTextConfig: Phaser.Types.GameObjects.Text.TextStyle = {
	...defaultTextConfig,
	fontSize: (TILE_HEIGHT * 0.2) + "px",
	fontFamily: "'Arial Black', sans-serif",
	strokeThickness: 14,
	stroke: "black",
};

export const FORCE_ID_PLAYER = "PLAYER";
export const FORCE_ID_CPU = "CPU";


export const SCENE_KEYS = {
	DEBUG: "DebugScene",
	BATTLEGROUND: "BattlegroundScene",
	CORE: "Core",
	TITLE: "TitleScene",
	OPTIONS: "OptionsScene"
} as const;