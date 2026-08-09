import * as Tooltip from "@Components/Tooltip/Tooltip";

const BUTTON_TOOLTIP_VERTICAL_OFFSET = 180;
const BUTTON_TOOLTIP_MAX_WIDTH = 600;
const POINTER_OVER_EVENT = "pointerover";
const POINTER_OUT_EVENT = "pointerout";
const POINTER_DOWN_EVENT = "pointerdown";
const POINTER_UP_EVENT = "pointerup";

export type ButtonTooltipContent = {
	title: string;
	description: string;
	position?: "bottom" | "right";
};

type TooltipPosition = {
	x: number;
	y: number;
};

type TooltipBinding = {
	destroy: () => void;
	hide: () => void;
};

type TooltipTarget = Phaser.GameObjects.GameObject & {
	scene: Phaser.Scene;
	on: (event: string, callback: () => void) => Phaser.GameObjects.GameObject;
	off: (event: string, callback: () => void) => Phaser.GameObjects.GameObject;
	once: (event: string, callback: () => void) => Phaser.GameObjects.GameObject;
};

export const attachButtonTooltip = (
	target: TooltipTarget,
	tooltip: ButtonTooltipContent,
	canShow: () => boolean = () => true,
	getTooltipPosition?: () => TooltipPosition
): TooltipBinding => {
	let isHovered = false;
	let isVisible = false;
	let isDestroyed = false;

	const hide = () => {
		if (!isVisible) {
			return;
		}
		Tooltip.hideTooltip();
		isVisible = false;
	};

	const show = () => {
		if (isVisible || !canShow()) {
			return;
		}
		const position = getTooltipPosition?.() ?? { x: 0, y: BUTTON_TOOLTIP_VERTICAL_OFFSET };
		Tooltip.renderTooltip(position.x, position.y, tooltip.title, tooltip.description, {
			anchorX: tooltip.position === "right" ? "left" : "center",
			maxWidth: BUTTON_TOOLTIP_MAX_WIDTH,
		});
		isVisible = true;
	};

	const onPointerOver = () => {
		isHovered = true;
		show();
	};

	const onPointerOut = () => {
		isHovered = false;
		hide();
	};

	const onPointerDown = () => {
		show();
	};

	const onPointerUp = () => {
		if (!isHovered && isVisible) {
			Tooltip.hideTooltip();
			isVisible = false;
		}
	};

	const destroy = () => {
		if (isDestroyed) {
			return;
		}
		isDestroyed = true;
		hide();
		target.off(POINTER_OVER_EVENT, onPointerOver);
		target.off(POINTER_OUT_EVENT, onPointerOut);
		target.off(POINTER_DOWN_EVENT, onPointerDown);
		target.off(POINTER_UP_EVENT, onPointerUp);
	};

	target.on(POINTER_OVER_EVENT, onPointerOver);
	target.on(POINTER_OUT_EVENT, onPointerOut);
	target.on(POINTER_DOWN_EVENT, onPointerDown);
	target.on(POINTER_UP_EVENT, onPointerUp);
	target.once("destroy", destroy);

	return {
		destroy,
		hide,
	};
};
