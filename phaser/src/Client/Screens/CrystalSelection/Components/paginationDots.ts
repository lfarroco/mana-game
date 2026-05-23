import * as constants from "@Constants/constants";
import * as io from "@PhaserIO";
import * as _ from "../CrystalSelectionScene";

export function paginationDots() {
	_.state.paginationDots = [];
	const totalDots = _.state.crystals.length;
	const totalWidth = (totalDots - 1) * _.DOT_SPACING;
	const startX = constants.MIDDLE_SCREEN_X - totalWidth / 2;

	for (let i = 0; i < totalDots; i++) {
		const dot = io.scene.add.circle(
			startX + i * _.DOT_SPACING,
			_.PAGINATION_Y,
			_.DOT_SIZE / 2,
			_.PAGINATION_DOT_COLOR,
			_.PAGINATION_DOT_INACTIVE_ALPHA
		);
		dot.setStrokeStyle(
			_.PAGINATION_DOT_STROKE_WIDTH,
			_.PAGINATION_DOT_STROKE_COLOR,
			_.PAGINATION_DOT_STROKE_ALPHA
		);
		_.state.paginationDots.push(dot);
	}
}
