// Centralized offset vectors for secondary impact effects around a target.
// These are used by multiple effects (e.g., explodeEffect, fireballEffect).

import { vec2 } from "@Models/Geometry";
import { TILE_WIDTH } from "@Constants/constants";

// All 8 directions around a tile (no (0,0))
export const IMPACT_OFFSETS = [-1, 0, 1]
	.flatMap(dx => [-1, 0, 1].map(dy => [dx, dy]))
	.filter(([dx, dy]) => dx !== 0 || dy !== 0)
	.map(([dx, dy]) => vec2(dx * TILE_WIDTH, dy * TILE_WIDTH));
