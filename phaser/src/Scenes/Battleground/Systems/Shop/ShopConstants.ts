import { SCREEN_HEIGHT, SCREEN_WIDTH, TILE_WIDTH } from "../../../../constants/constants";

// --- Sizing & Layout ---
export const NUM_TAVERN_SLOTS = 3;
const PANEL_PADDING = 40;
const TAVERN_PADDING = 20;
export const TAVERN_CHARA_SPACING = 300; // Spacing between centers of charas
const BUTTON_AREA_HEIGHT = 100;

// --- Calculated Dimensions ---

// Width required for all character cards, from the left edge of the first to the right edge of the last.
const TAVERN_CHARAS_TOTAL_WIDTH = (NUM_TAVERN_SLOTS - 1) * TAVERN_CHARA_SPACING + TILE_WIDTH;

// The tavern background panel must be wide enough to hold the characters plus padding.
export const TAVERN_BG_WIDTH = TAVERN_CHARAS_TOTAL_WIDTH + (TAVERN_PADDING * 2);
export const TAVERN_BG_HEIGHT = 300;

// The main shop panel must be wide enough for the tavern plus its own padding.
export const SHOP_PANEL_WIDTH = TAVERN_BG_WIDTH + (PANEL_PADDING * 2);
// The main shop panel height is the tavern height, plus button area, plus padding.
export const SHOP_PANEL_HEIGHT = TAVERN_BG_HEIGHT + BUTTON_AREA_HEIGHT + (PANEL_PADDING * 2);

// --- Positioning ---

// Main panel position (centered horizontally, near the top vertically)
export const PANEL_X = (SCREEN_WIDTH - SHOP_PANEL_WIDTH) / 2;
export const PANEL_Y = 240;

// --- Child Element Positions (calculated from PANEL_X, PANEL_Y) ---

// Tavern background position
export const TAVERN_BASE_X = PANEL_X + PANEL_PADDING;
export const TAVERN_BASE_Y = PANEL_Y + PANEL_PADDING;

// Tavern title position
export const TAVERN_TITLE_X = TAVERN_BASE_X + TAVERN_PADDING;
export const TAVERN_TITLE_Y = TAVERN_BASE_Y + 15; // A small offset from the top of the tavern bg

// Tavern character positions
// Center the charas horizontally within the tavern background
export const TAVERN_CHARA_FIRST_X = TAVERN_BASE_X + (600);
export const TAVERN_CHARA_BASE_Y = TAVERN_BASE_Y + 180; // Vertical position for charas within the tavern

// --- Styling ---
export const PANEL_BG_COLOR = 0x2c3e50; // Dark slate blue
export const PANEL_BG_OPACITY = 0.95; // Mostly opaque
export const SUB_PANEL_CORNER_RADIUS = 15;

// --- Sell Zone ---
// The sell zone is positioned in the lower left corner of the screen.
export const SELL_ZONE_WIDTH = SCREEN_WIDTH * 0.3;
export const SELL_ZONE_HEIGHT = SCREEN_HEIGHT / 2;
export const SELL_ZONE_Y_OFFSET_FROM_BOTTOM = 0; // Distance from the bottom of the shop panel to the top of the sell zone
export const SELL_ZONE_BG_COLOR = 0xffa500; // Orange
export const SELL_ZONE_BG_ALPHA = 0.7;
export const SELL_ZONE_TEXT = "SELL";
export const SELL_ZONE_TEXT_STYLE = { fontSize: '32px', color: '#000000', fontStyle: 'bold' };
export const SELL_ZONE_CORNER_RADIUS = 10;
export const SHOP_SELL_ZONE_NAME = "shop_sell_zone";

// --- Animation ---
export const SHOP_ITEM_APPEAR_SCALE_DURATION = 400;
export const SHOP_ITEM_APPEAR_WIGGLE_ANGLE = 10;
export const SHOP_ITEM_APPEAR_WIGGLE_DURATION_1 = 100;
export const SHOP_ITEM_APPEAR_WIGGLE_DURATION_2 = 100;
export const SHOP_ITEM_APPEAR_WIGGLE_RETURN_DURATION = 50;