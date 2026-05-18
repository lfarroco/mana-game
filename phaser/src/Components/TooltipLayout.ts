export const TOOLTIP_HORIZONTAL_PADDING = 30;
export const TOOLTIP_TOP_PADDING = 20;
export const TOOLTIP_BOTTOM_PADDING = 40;
export const TOOLTIP_INTER_ELEMENT_PADDING = TOOLTIP_TOP_PADDING / 2;
export const TOOLTIP_MIN_WIDTH = TOOLTIP_HORIZONTAL_PADDING * 2;
export const TOOLTIP_MIN_HEIGHT = TOOLTIP_TOP_PADDING + TOOLTIP_BOTTOM_PADDING;
export const TOOLTIP_MAX_WIDTH = 1040;

type TooltipDimensionsInput = {
	titleWidth: number;
	titleHeight: number;
	descriptionWidth: number;
	descriptionHeight: number;
	hasDescription: boolean;
};

export const getTooltipDimensions = ({
	titleWidth,
	titleHeight,
	descriptionWidth,
	descriptionHeight,
	hasDescription,
}: TooltipDimensionsInput): { width: number; height: number } => {
	const contentWidth = Math.max(titleWidth, hasDescription ? descriptionWidth : 0);
	const contentHeight =
		titleHeight +
		(hasDescription ? TOOLTIP_INTER_ELEMENT_PADDING + descriptionHeight : 0);

	return {
		width: Math.max(
			TOOLTIP_MIN_WIDTH,
			Math.min(contentWidth + 2 * TOOLTIP_HORIZONTAL_PADDING, TOOLTIP_MAX_WIDTH)
		),
		height: Math.max(
			TOOLTIP_MIN_HEIGHT,
			contentHeight + TOOLTIP_TOP_PADDING + TOOLTIP_BOTTOM_PADDING
		),
	};
};
