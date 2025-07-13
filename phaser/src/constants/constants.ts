export const SCREEN_WIDTH = 1920;
export const SCREEN_HEIGHT = 1080;

export const MIDDLE_SCREEN_X = SCREEN_WIDTH / 2;
export const MIDDLE_SCREEN_Y = SCREEN_HEIGHT / 2;

export const TICK_DURATION = 100;

export const TILE_WIDTH = SCREEN_WIDTH / 12;
export const TILE_HEIGHT = TILE_WIDTH;
export const HALF_TILE_WIDTH = TILE_WIDTH / 2;
export const HALF_TILE_HEIGHT = TILE_HEIGHT / 2;

export const SHOP_ITEM_PURCHASE_COST = 3;
export const DRAG_CLICK_THRESHOLD = 10;

export const MAX_PARTY_SIZE = 5;

export const REROLL_UNITS_PRICE = 3;

export const MIN_COOLDOWN = 200;

export const PLAYER_BOARD_X = SCREEN_WIDTH / 2 - (TILE_WIDTH * 3 / 2);
export const PLAYER_BOARD_Y = SCREEN_HEIGHT / 2 + 40;

export const CPU_BOARD_X = PLAYER_BOARD_X;
export const CPU_BOARD_Y = 20;

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
export const GRID_FILL_COLOR = 0x000000;
export const MAX_GRID_HEIGHT = 32;
export const MAX_GRID_WIDTH = 32;
export const FORCE_ID_PLAYER = "PLAYER";
export const FORCE_ID_CPU = "CPU";

// Morale Bar UI Constants
export const PLAYER_MORALE_BAR_BOTTOM_OFFSET = 50; // Distance from the bottom of the screen
export const CPU_MORALE_BAR_TOP_OFFSET = 20;    // Distance from the top of the screen

// Shield Bar UI Constants (positioned above morale bars)
export const PLAYER_SHIELD_BAR_BOTTOM_OFFSET = 80; // Distance from the bottom of the screen
export const CPU_SHIELD_BAR_TOP_OFFSET = 50;    // Distance from the top of the screen

export const INITIAL_MORALE = 500;

export const PLAYER_MORALE_BAR_COLOR = 0x4e9de0; // Blue for player
export const CPU_MORALE_BAR_COLOR = 0xe04e4e;   // Red for CPU

export const PLAYER_SHIELD_BAR_COLOR = 0x9de04e; // Green for player
export const CPU_SHIELD_BAR_COLOR = 0xe0a04e;   // Orange for CPU

// Scene Keys
export const SCENE_KEYS = {
	DEBUG: "DebugScene",
	BATTLEGROUND: "BattlegroundScene",
	CORE: "Core",
	TITLE: "TitleScene"
} as const;

// Pop Text Animation Constants
export const POP_TEXT_CONFIG = {
	MAX_ANGLE: 30,
	SCALE_TARGET: 1.4,
	MOVE_DURATION: 1000,
	FADE_DELAY: 500,
	FADE_DURATION: 1000,
	VERTICAL_DISTANCE: 128,
	HORIZONTAL_SPREAD: 60,
	COLORS: {
		HEAL: "green",
		DAMAGE: "red",
		SHIELD: "yellow",
	}
} as const;

// Impact Effect Constants
export const IMPACT_EFFECT_CONFIG = {
	PARTICLE_SPEED: 200,
	PARTICLE_LIFESPAN: 600,
	ANGLE_SPREAD: 40,
	MAX_ALIVE_PARTICLES: 5,
	SCALE_MIN: 1,
	SCALE_MAX: 6,
	STOP_AFTER: 5
} as const;

// Healing Hit Effect Constants
export const HEALING_HIT_EFFECT_CONFIG = {
	PARTICLE_SPEED: 50,
	PARTICLE_SCALE_START: 3,
	PARTICLE_SCALE_END: 0,
	PARTICLE_QUANTITY: 5,
	PARTICLE_FREQUENCY: 100,
	LIFESPAN_RATIO: 0.5, // particles.stop() at lifespan / 2
	HEALING_COLORS: [0x00ff00, 0x32cd32, 0x3cb371, 0x2e8b57, 0x228b22, 0x556b2f, 0x6b8e23, 0x8b4513, 0xcd853f, 0xdaa520, 0xffd700] as number[]
} as const;

// Summon Effect Constants
export const SUMMON_EFFECT_CONFIG = {
	LIFESPAN: 300,
	SCALE_START: 0.05,
	SCALE_END: 0.3,
	SPEED_MIN: 100,
	SPEED_MAX: 200,
	PARTICLE_QUANTITY: 4,
	EMIT_ZONE_RADIUS: 10,
	EMIT_ZONE_QUANTITY: 8
} as const;

// Arcane Missile Effect Constants
export const ARCANE_MISSILE_CONFIG = {
	DEFAULT_COLORS: [0xFF00FF, 0x0000FF, 0x000000] as number[], // dark purple to blue
	BEAM_AMPLITUDE_BASE: 30,
	BEAM_AMPLITUDE_RANDOM: 100,
	BEAM_FREQUENCY_MIN: 1,
	BEAM_FREQUENCY_MAX: 3,
	BEAM_SEGMENTS: 20,
	BEAM_COLOR: 0x00FFFF,
	PARTICLE_SPEED: 20,
	PARTICLE_LIFESPAN: 600,
	PARTICLE_SCALE_START: 4,
	PARTICLE_SCALE_END: 0,
	DURATION_MULTIPLIER: 2,
	IMPACT_SPEED: 300,
	IMPACT_COLORS: [0x800080, 0x0000FF] as number[], // purple to blue
	IMPACT_LIFESPAN: 400,
	IMPACT_SCALE_START: 6,
	IMPACT_SCALE_END: 0,
	IMPACT_ALPHA_START: 0.5,
	IMPACT_DELAY: 300
} as const;

// Difficulty Tier Constants
export const DIFFICULTY_TIER_CONFIG = {
	ELITE: {
		HP_MULTIPLIER: 1.15,
		POWER_MULTIPLIER: 1.10,
		OVERFLOW_THRESHOLD: 0.5,
		HASTE_DURATION: 3000,
		HASTE_COOLDOWN_MULTIPLIER: 0.5
	},
	VETERAN: {
		HP_MULTIPLIER: 1.10,
		POWER_MULTIPLIER: 1.05,
		OVERFLOW_THRESHOLD: 0.3,
		CRIT_BONUS: 5
	},
	CHALLENGER: {
		HP_MULTIPLIER: 1.05,
		POWER_MULTIPLIER: 1.05,
		OVERFLOW_THRESHOLD: 0.7
	}
} as const;

// Character Stats Display Colors
export const CHARA_STATS_COLORS = {
	DAMAGE_BG: 0xff0000,
	HEAL_BG: 0x23a423,
	ARMOR_BG: 0x666666,
	DEFAULT_BG: 0x000000
} as const;
