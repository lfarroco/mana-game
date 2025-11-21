import BBCodeText from "phaser3-rex-plugins/plugins/gameobjects/tagtext/bbcodetext/BBCodeText";
import { titleTextConfig } from "@Constants/constants";
import { tooltipFragmentShader } from "../Shaders/TooltipShader";
import { getCurrentScene } from "@Models/State";

const PADDING = 30;
const INTER_ELEMENT_PADDING = PADDING / 2;

const MIN_TOOLTIP_WIDTH = 600;
const MIN_TOOLTIP_HEIGHT = 330;
const MAX_TOOLTIP_WIDTH = 800;

const DESCRIPTION_FONT_SIZE = 30;
const DESCRIPTION_LINE_SPACING = 8;

let container: Phaser.GameObjects.Container | null = null;
let bg: Phaser.GameObjects.Shader | null = null;
let titleText: Phaser.GameObjects.Text | null = null;
let descriptionText: BBCodeText | null = null;
let currentTitle: string = "";
let currentDescription: string = "";
let startTime: number = 0;

let tooltipWidth: number = MIN_TOOLTIP_WIDTH;
let tooltipHeight: number = MIN_TOOLTIP_HEIGHT;
let lastAdjustedX: number | undefined;
let lastAdjustedY: number | undefined;

function getAdjustedPosition(x: number, y: number): { x: number; y: number } {
	if (!container) return { x, y };

	const scene = getCurrentScene();

	if (
		lastAdjustedX !== undefined &&
		lastAdjustedY !== undefined &&
		Math.abs(x - (container.x + tooltipWidth / 2)) < 1 &&
		Math.abs(y - (container.y + tooltipHeight / 2)) < 1
	) {
		return { x: lastAdjustedX, y: lastAdjustedY };
	}

	const canvasWidth = scene.scale.width;
	const canvasHeight = scene.scale.height;
	const halfTooltipWidth = tooltipWidth / 2;
	const halfTooltipHeight = tooltipHeight / 2;

	const centerX = Math.max(halfTooltipWidth, Math.min(x, canvasWidth - halfTooltipWidth));
	const centerY = Math.max(halfTooltipHeight, Math.min(y, canvasHeight - halfTooltipHeight));

	const adjustedX = centerX - halfTooltipWidth;
	const adjustedY = centerY - halfTooltipHeight;

	lastAdjustedX = adjustedX;
	lastAdjustedY = adjustedY;

	return { x: adjustedX, y: adjustedY };
}

export function destroyTooltip(): void {
	if (container) {
		container.destroy(true);
	}
	container = null;
	bg = null;
	titleText = null;
	descriptionText = null;
	currentTitle = "";
	currentDescription = "";
	tooltipWidth = MIN_TOOLTIP_WIDTH;
	tooltipHeight = MIN_TOOLTIP_HEIGHT;
	lastAdjustedX = undefined;
	lastAdjustedY = undefined;
	startTime = 0;
}

export function init() {
	const scene = getCurrentScene();
	startTime = scene.time.now;

	container = scene.add.container(0, 0);
	container.setDepth(Phaser.Math.MAX_SAFE_INTEGER);
	tooltipWidth = MIN_TOOLTIP_WIDTH;
	tooltipHeight = MIN_TOOLTIP_HEIGHT;

	const bgColorVec3 = { x: 0.1, y: 0.21, z: 0.21 };
	const borderColorVec3 = { x: 0.78, y: 0.64, z: 0.33 };

	const baseShader = new Phaser.Display.BaseShader(
		"TooltipShader",
		tooltipFragmentShader,
		undefined,
		{
			time: { type: "1f", value: 0.0 },
			resolution: { type: "2f", value: [tooltipWidth, tooltipHeight] },
			bgColor: { type: "3f", value: bgColorVec3 },
			borderColor: { type: "3f", value: borderColorVec3 },
		}
	);

	bg = scene.add.shader(baseShader, 0, 0, tooltipWidth, tooltipHeight).setOrigin(0, 0);

	container.add(bg);

	titleText = scene.add
		.text(0, 0, "", titleTextConfig)
		.setAlign("left");
	container.add(titleText);

	descriptionText = scene.add
		.rexBBCodeText(0, 0, "")
		.setOrigin(0)
		.setFontSize(DESCRIPTION_FONT_SIZE)
		.setAlign("left")
		.setWrapMode(1)
		.setFontFamily("Arimo");

	if ((descriptionText as any).setLineSpacing) {
		(descriptionText as any).setLineSpacing(DESCRIPTION_LINE_SPACING);
	} else if ("lineSpacing" in (descriptionText as any)) {
		(descriptionText as any).lineSpacing = DESCRIPTION_LINE_SPACING;
	}
	container.add(descriptionText);

	container.setVisible(false);
}

function updateShaderAnimation(): void {
	if (!bg || !container?.visible) return;

	const elapsedTime = (getCurrentScene().time.now - startTime) / 1000;
	bg.setUniform("time.value", elapsedTime);
}

export function renderTooltip(x: number, y: number, title: string, description: string): void {
	if (!container || !titleText || !descriptionText || !bg) {
		console.warn("Tooltip not initialized. Call initializeTooltip(scene) first.");
		return;
	}

	const titleChanged = currentTitle !== title;
	const descriptionChanged = currentDescription !== description;
	const contentChanged = titleChanged || descriptionChanged;

	if (titleChanged) {
		titleText.setText(title);
		currentTitle = title;
	}

	if (descriptionChanged) {
		descriptionText.setText(description);
		currentDescription = description;
	}

	if (contentChanged || !container.visible) {
		const maxWrapWidth = MAX_TOOLTIP_WIDTH - 2 * PADDING;
		descriptionText.setWordWrapWidth(maxWrapWidth);

		descriptionText.updateText();

		const contentWidth = Math.max(titleText.width, descriptionText.width);
		tooltipWidth = Math.max(
			MIN_TOOLTIP_WIDTH,
			Math.min(contentWidth + 2 * PADDING, MAX_TOOLTIP_WIDTH)
		);

		const actualDescriptionWrapWidth = tooltipWidth - 2 * PADDING;
		if (actualDescriptionWrapWidth < maxWrapWidth) {
			descriptionText.setWordWrapWidth(actualDescriptionWrapWidth);
			descriptionText.updateText();
		}

		const totalContentHeight = titleText.height + INTER_ELEMENT_PADDING + descriptionText.height;
		tooltipHeight = Math.max(MIN_TOOLTIP_HEIGHT, totalContentHeight + 2 * PADDING);

		if (!bg) return;
		bg.setSize(tooltipWidth, tooltipHeight);
		bg.setUniform("resolution.value", [tooltipWidth, tooltipHeight]);

		const elapsedTime = (getCurrentScene().time.now - startTime) / 1000;
		bg.setUniform("time.value", elapsedTime);

		titleText.setPosition(PADDING, PADDING);
		descriptionText.setPosition(PADDING + 10, 10 + PADDING + titleText.height + INTER_ELEMENT_PADDING);
	}

	const { x: adjustedX, y: adjustedY } = getAdjustedPosition(x, y);
	if (container.x !== adjustedX || container.y !== adjustedY) {
		container.setPosition(adjustedX, adjustedY);
	}

	if (!container.visible) {
		container.setVisible(true);
		getCurrentScene().children.bringToTop(container);
	}

	updateShaderAnimation();
}

export function moveTooltip(x: number, y: number): void {
	if (!container || !container.visible) return;

	const { x: adjustedX, y: adjustedY } = getAdjustedPosition(x, y);
	if (container.x !== adjustedX || container.y !== adjustedY) {
		container.setPosition(adjustedX, adjustedY);
	}

	updateShaderAnimation();
}

export function hideTooltip() {
	if (container) {
		container.setVisible(false);
	}
}
