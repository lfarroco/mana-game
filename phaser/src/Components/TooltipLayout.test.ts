import { describe, expect, it } from "@jest/globals";
import {
	TOOLTIP_BOTTOM_PADDING,
	TOOLTIP_HORIZONTAL_PADDING,
	TOOLTIP_MAX_WIDTH,
	TOOLTIP_INTER_ELEMENT_PADDING,
	TOOLTIP_TOP_PADDING,
	getTooltipDimensions,
} from "@Components/TooltipLayout";

describe("getTooltipDimensions", () => {
	it("sizes the tooltip to the measured text content", () => {
		expect(
			getTooltipDimensions({
				titleWidth: 180,
				titleHeight: 42,
				descriptionWidth: 260,
				descriptionHeight: 84,
				hasDescription: true,
			})
		).toEqual({
			width: 260 + 2 * TOOLTIP_HORIZONTAL_PADDING,
			height:
				42 +
				TOOLTIP_INTER_ELEMENT_PADDING +
				84 +
				TOOLTIP_TOP_PADDING +
				TOOLTIP_BOTTOM_PADDING,
		});
	});

	it("omits description spacing when the body is empty", () => {
		expect(
			getTooltipDimensions({
				titleWidth: 180,
				titleHeight: 42,
				descriptionWidth: 0,
				descriptionHeight: 0,
				hasDescription: false,
			})
		).toEqual({
			width: 180 + 2 * TOOLTIP_HORIZONTAL_PADDING,
			height: 42 + TOOLTIP_TOP_PADDING + TOOLTIP_BOTTOM_PADDING,
		});
	});

	it("keeps the tooltip within the configured maximum width", () => {
		expect(
			getTooltipDimensions({
				titleWidth: TOOLTIP_MAX_WIDTH + 300,
				titleHeight: 42,
				descriptionWidth: TOOLTIP_MAX_WIDTH + 500,
				descriptionHeight: 84,
				hasDescription: true,
			}).width
		).toBe(TOOLTIP_MAX_WIDTH);
	});
});
