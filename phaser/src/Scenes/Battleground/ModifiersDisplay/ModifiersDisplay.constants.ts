/**
 * Constants for ModifiersDisplay positioning and dimensions
 */

export const MODIFIERS_DISPLAY = {
	// Dimensions
	WIDTH: 360,
	HEIGHT: 240,
	PADDING: 24,
	LINE_HEIGHT: 54,

	// Text offsets from padding
	ATK_VALUE_OFFSET: 105,
	DEF_VALUE_OFFSET: 105,
	HEAL_VALUE_OFFSET: 120,

	// Colors
	PLAYER_VALUE_COLOR: '#00ff00',
	CPU_VALUE_COLOR: '#ff4444',
	LABEL_COLOR: '#ffffff',
	BACKGROUND_COLOR: 0x000000,
	BORDER_COLOR: 0xffffff,

	// Position offsets for different forces
	PLAYER_OFFSET_X: 20,
	CPU_OFFSET_X: 380, // This will be subtracted from SCREEN_WIDTH
	PLAYER_OFFSET_Y: 260, // This will be subtracted from SCREEN_HEIGHT
	CPU_OFFSET_Y: 20
} as const;
