import { SCREEN_HEIGHT, SCREEN_WIDTH } from "../../../../constants/constants";


export const TAVERN_BASE_X = 50;
export const TAVERN_BASE_Y = 50;

export const TAVERN_BG_OFFSET_X = 800;
export const TAVERN_TITLE_X = 50 + TAVERN_BG_OFFSET_X + 100;
export const TAVERN_TITLE_Y = 10;
export const TAVERN_CHARA_BASE_Y = 180;
export const TAVERN_CHARA_FIRST_X = 50 + TAVERN_BG_OFFSET_X + 150;
export const TAVERN_CHARA_SPACING = 200;
export const TAVERN_BG_WIDTH = 900;
export const TAVERN_BG_HEIGHT = 300;

export const PANEL_BG_COLOR = 0x2c3e50; // Dark slate blue
export const PANEL_BG_OPACITY = 0.95; // Mostly opaque
export const PANEL_X = 20;
export const PANEL_Y = 20;
export const SUB_PANEL_CORNER_RADIUS = 15;

export const SELL_ZONE_WIDTH = SCREEN_WIDTH - 100;
export const SELL_ZONE_HEIGHT = SCREEN_HEIGHT / 2;
export const SELL_ZONE_Y_OFFSET_FROM_BOTTOM = 0; // Distance from the bottom of the shop panel to the top of the sell zone
export const SELL_ZONE_BG_COLOR = 0xffa500; // Orange
export const SELL_ZONE_BG_ALPHA = 0.7;
export const SELL_ZONE_TEXT = "SELL";
export const SELL_ZONE_TEXT_STYLE = { fontSize: '32px', color: '#000000', fontStyle: 'bold' };
export const SELL_ZONE_CORNER_RADIUS = 10;
export const SHOP_SELL_ZONE_NAME = "shop_sell_zone";

// Number of items in the shop
export const NUM_TAVERN_SLOTS = 3;

// Animation constants for shop items
export const SHOP_ITEM_APPEAR_SCALE_DURATION = 400;
export const SHOP_ITEM_APPEAR_WIGGLE_ANGLE = 10;
export const SHOP_ITEM_APPEAR_WIGGLE_DURATION_1 = 100;
export const SHOP_ITEM_APPEAR_WIGGLE_DURATION_2 = 100;
export const SHOP_ITEM_APPEAR_WIGGLE_RETURN_DURATION = 50;