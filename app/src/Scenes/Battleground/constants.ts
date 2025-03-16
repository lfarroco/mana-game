
export const SCREEN_WIDTH = 1920;
export const SCREEN_HEIGHT = 1080;

export const TILE_WIDTH = 150;
export const TILE_HEIGHT = 150;
export const HALF_TILE_WIDTH = TILE_WIDTH / 2;
export const HALF_TILE_HEIGHT = TILE_HEIGHT / 2;

export const RECRUIT_UNIT_PRICE = 3;
export const PROMOTE_UNIT_PRICE = 5;
export const GOLD_PER_WAVE = 3;
export const defaultTextConfig = {
	fontSize: (
		Math.min(SCREEN_WIDTH, SCREEN_HEIGHT) / 100
	) * 4 + "px",
	color: "white",
	fontFamily: "'Macondo', cursive",
	stroke: "black",
	strokeThickness: 4,
};
