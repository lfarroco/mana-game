
// TODO: separate client-side, rendering/ui constants
// from game logic constants.

export const SCREEN_WIDTH = 1920;
export const SCREEN_HEIGHT = 1080;

export const MIDDLE_SCREEN_X = SCREEN_WIDTH / 2;
export const MIDDLE_SCREEN_Y = SCREEN_HEIGHT / 2;

export const MIDDLE_SCREEN: Vec2 = [MIDDLE_SCREEN_X, MIDDLE_SCREEN_Y];

export const WHOLE_SCREEN: Size = [SCREEN_WIDTH, SCREEN_HEIGHT];

export const TILE_WIDTH = 250;
export const TILE_HEIGHT = TILE_WIDTH;
export const HALF_TILE_WIDTH = TILE_WIDTH / 2;
export const HALF_TILE_HEIGHT = TILE_HEIGHT / 2;

export const DRAG_CLICK_THRESHOLD = 10;

export const PLAYER_BOARD_X = 120;
export const PLAYER_BOARD_Y = (SCREEN_HEIGHT - (TILE_HEIGHT * 3 + 8 * 2)) / 2;

export const CPU_BOARD_X = SCREEN_WIDTH - (TILE_WIDTH * 3 + 8 * 2) - 120;
export const CPU_BOARD_Y = PLAYER_BOARD_Y;

export const BATTLEGROUND_BUTTON_MARGIN_TOP = 50;
export const BATTLEGROUND_BUTTON_MARGIN_BOTTOM = 50;
export const BATTLEGROUND_BUTTON_X = SCREEN_WIDTH - 200;

export const defaultTextConfig: Phaser.Types.GameObjects.Text.TextStyle = {
	fontSize: "20px",
	color: "white",
	fontFamily: "Arimo",
	stroke: "black",
	strokeThickness: 4,
	align: "center",
};

export const titleTextConfig: Phaser.Types.GameObjects.Text.TextStyle = {
	...defaultTextConfig,
	fontSize: "28px",
	strokeThickness: 14,
	fontStyle: "bold",
};


