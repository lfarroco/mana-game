
export const SCREEN_WIDTH = 1920;
export const SCREEN_HEIGHT = 1080;

export const TICK_DURATION = 100;

export const TILE_WIDTH = SCREEN_WIDTH / 8;
export const TILE_HEIGHT = TILE_WIDTH;
export const HALF_TILE_WIDTH = TILE_WIDTH / 2;
export const HALF_TILE_HEIGHT = TILE_HEIGHT / 2;

export const MAX_PARTY_SIZE = 5;
export const MAX_BENCH_SIZE = 3;

export const REROLL_UNITS_PRICE = 2;

export const RECRUIT_UNIT_PRICE = 3;
export const PROMOTE_UNIT_PRICE = 5;
export const GOLD_PER_WAVE = 3;
export const defaultTextConfig: Phaser.Types.GameObjects.Text.TextStyle = {
	fontSize: "32px",
	color: "white",
	fontFamily: "'Arial', sans-serif",
	stroke: "black",
	strokeThickness: 4,
};

export const titleTextConfig: Phaser.Types.GameObjects.Text.TextStyle = {
	...defaultTextConfig,
	fontSize: "40px",
	fontFamily: "'Arial Black', sans-serif",
	strokeThickness: 14,
	stroke: "black",
};

export const GRID_BORDER_COLOR = 0x00FF00;
export const GRID_FILL_COLOR = 0x000000; export const MAX_GRID_HEIGHT = 32;
export const MAX_GRID_WIDTH = 32;
export const FORCE_ID_PLAYER = "PLAYER";
export const FORCE_ID_CPU = "CPU";

export const MIN_COOLDOWN = 200;