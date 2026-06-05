import * as constants from "@Constants/constants";
import * as parent from "../CrystalSelectionScreen";

const PAGINATION_Y = 700;
const DOT_SIZE = 16;
const DOT_SPACING = 32;
const PAGINATION_DOT_STROKE_COLOR = 0xffffff;
export const PAGINATION_DOT_INACTIVE_ALPHA = 0.3;
const PAGINATION_DOT_STROKE_WIDTH = 2;
const PAGINATION_DOT_STROKE_ALPHA = 0.5;
export const PAGINATION_DOT_COLOR = 0xffffff;
export const PAGINATION_DOT_ACTIVE_ALPHA = 1;

export function create() {
	parent.state.paginationDots = [];
	const totalDots = parent.state.crystals.length;
	const totalWidth = (totalDots - 1) * DOT_SPACING;
	const startX = constants.MIDDLE_SCREEN_X - totalWidth / 2;

	for (let i = 0; i < totalDots; i++) {
		const dot = io.scene.add.circle(
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
		parent.state.paginationDots.push(dot);
	}
}
