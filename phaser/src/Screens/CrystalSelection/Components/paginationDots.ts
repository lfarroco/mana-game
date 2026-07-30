import * as constants from "@Constants";
import { env } from "@Env";

const PAGINATION_Y = 700;
const DOT_SIZE = 16;
const DOT_SPACING = 32;
const PAGINATION_DOT_STROKE_COLOR = 0xffffff;
export const PAGINATION_DOT_INACTIVE_ALPHA = 0.3;
const PAGINATION_DOT_STROKE_WIDTH = 2;
const PAGINATION_DOT_STROKE_ALPHA = 0.5;
export const PAGINATION_DOT_COLOR = 0xffffff;
export const PAGINATION_DOT_ACTIVE_ALPHA = 1;

/**
 * Create pagination dots for the given number of crystals.
 * Returns the dots so the caller can track them for disposal.
 */
export function create(count: number): Phaser.GameObjects.Arc[] {
	const dots: Phaser.GameObjects.Arc[] = [];
	const totalWidth = (count - 1) * DOT_SPACING;
	const startX = constants.MIDDLE_SCREEN_X - totalWidth / 2;

	for (let i = 0; i < count; i++) {
		const dot = env.scene.add.circle(
			startX + i * DOT_SPACING,
			PAGINATION_Y,
			DOT_SIZE / 2,
			PAGINATION_DOT_COLOR,
			PAGINATION_DOT_INACTIVE_ALPHA
		);
		dot.setStrokeStyle(
			PAGINATION_DOT_STROKE_WIDTH,
			PAGINATION_DOT_STROKE_COLOR,
			PAGINATION_DOT_STROKE_ALPHA
		);
		dots.push(dot);
	}
	return dots;
}

