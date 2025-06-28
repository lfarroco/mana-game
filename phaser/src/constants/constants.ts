
export const SCREEN_WIDTH = 1920;
export const SCREEN_HEIGHT = 1080;

export const MIDDLE_SCREEN_X = SCREEN_WIDTH / 2;
export const MIDDLE_SCREEN_Y = SCREEN_HEIGHT / 2;

export const TICK_DURATION = 100;

export const TILE_WIDTH = SCREEN_WIDTH / 12;
export const TILE_HEIGHT = TILE_WIDTH
export const HALF_TILE_WIDTH = TILE_WIDTH / 2;
export const HALF_TILE_HEIGHT = TILE_HEIGHT / 2;

export const SHOP_ITEM_PURCHASE_COST = 3;
export const DRAG_CLICK_THRESHOLD = 10;

export const MAX_PARTY_SIZE = 5;

export const REROLL_UNITS_PRICE = 3;

export const MIN_COOLDOWN = 200;

export const PLAYER_BOARD_X = SCREEN_WIDTH / 2 - (TILE_WIDTH * 3 / 2)
export const PLAYER_BOARD_Y = SCREEN_HEIGHT / 2;

export const CPU_BOARD_X = PLAYER_BOARD_X;
export const CPU_BOARD_Y = PLAYER_BOARD_Y - (TILE_HEIGHT * 3);

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

export const GRID_BORDER_COLOR = 0x00FF00;
export const GRID_FILL_COLOR = 0x000000; export const MAX_GRID_HEIGHT = 32;
export const MAX_GRID_WIDTH = 32;
export const FORCE_ID_PLAYER = "PLAYER";
export const FORCE_ID_CPU = "CPU";

// Morale Bar UI Constants
export const PLAYER_MORALE_BAR_BOTTOM_OFFSET = 50; // Distance from the bottom of the screen
export const CPU_MORALE_BAR_TOP_OFFSET = 20;    // Distance from the top of the screen

export const INITIAL_MORALE = 500;

export const PLAYER_MORALE_BAR_COLOR = 0x4e9de0; // Blue for player
export const CPU_MORALE_BAR_COLOR = 0xe04e4e;   // Red for CPU
