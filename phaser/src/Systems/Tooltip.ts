import { defaultTextConfig } from "../Scenes/Battleground/constants";

// TODO: on mobile, use a long press to show the tooltip

const TOOLTIP_WIDTH = 500;
const TOOLTIP_HEIGHT = 300;

class Tooltip {
	private scene: Phaser.Scene;
	private container: Phaser.GameObjects.Container;
	private bg: Phaser.GameObjects.Graphics;
	private titleText: Phaser.GameObjects.Text;
	private descriptionText: Phaser.GameObjects.Text;

	// Style constants can be static members or remain module-level if preferred
	private static readonly PADDING = 20;
	private static readonly TITLE_FONT_SIZE = 40;
	private static readonly DESCRIPTION_FONT_SIZE = 30;
	private static readonly BORDER_RADIUS = 10;
	private static readonly BACKGROUND_COLOR = 0x000000;
	private static readonly BACKGROUND_ALPHA = 0.8;
	private static readonly INTER_ELEMENT_PADDING = Tooltip.PADDING / 2;

	constructor(scene: Phaser.Scene) {
		this.scene = scene;

		this.container = this.scene.add.container(0, 0);
		this.container.setDepth(Phaser.Math.MAX_SAFE_INTEGER); // Ensure tooltip is on top

		this.bg = this.scene.add.graphics();
		this.bg.fillStyle(Tooltip.BACKGROUND_COLOR, Tooltip.BACKGROUND_ALPHA);
		this.bg.fillRoundedRect(
			-TOOLTIP_WIDTH / 2,
			-TOOLTIP_HEIGHT / 2,
			TOOLTIP_WIDTH,
			TOOLTIP_HEIGHT,
			Tooltip.BORDER_RADIUS
		);
		this.container.add(this.bg);

		this.titleText = this.scene.add.text(
			-TOOLTIP_WIDTH / 2 + Tooltip.PADDING,
			-TOOLTIP_HEIGHT / 2 + Tooltip.PADDING,
			'', // Initial empty text
			defaultTextConfig
		)
			.setOrigin(0)
			.setFontSize(Tooltip.TITLE_FONT_SIZE)
			.setFontFamily("Arial Black")
			.setAlign("left");
		this.container.add(this.titleText);

		this.descriptionText = this.scene.add.text(
			-TOOLTIP_WIDTH / 2 + Tooltip.PADDING,
			// Positioned dynamically in render based on titleText's height
			this.titleText.y + Tooltip.TITLE_FONT_SIZE + Tooltip.INTER_ELEMENT_PADDING, // Adjusted initial Y
			'', // Initial empty text
			defaultTextConfig
		)
			.setOrigin(0)
			.setFontSize(Tooltip.DESCRIPTION_FONT_SIZE)
			.setAlign("left")
			.setWordWrapWidth(TOOLTIP_WIDTH - (2 * Tooltip.PADDING));
		this.container.add(this.descriptionText);

		this.container.setVisible(false); // Initially hidden
	}

	public render(x: number, y: number, title: string, description: string): void {
		this.titleText.setText(title);
		this.descriptionText.setText(description);

		// Dynamically position description below title
		this.descriptionText.setY(this.titleText.y + this.titleText.displayHeight + Tooltip.INTER_ELEMENT_PADDING);

		// Note: If TOOLTIP_HEIGHT needs to be dynamic based on content,
		// this.bg and potentially _getAdjustedPosition would need updates here.

		const { x: adjustedX, y: adjustedY } = this._getAdjustedPosition(x, y);
		this.container.setPosition(adjustedX, adjustedY);
		this.container.setVisible(true);
	}

	public move(x: number, y: number): void {
		if (!this.container.visible) return;
		const { x: adjustedX, y: adjustedY } = this._getAdjustedPosition(x, y);
		this.container.setPosition(adjustedX, adjustedY);
	}

	public hide(): void {
		this.container.setVisible(false);
	}

	public destroy(): void {
		this.container.destroy(true); // true to destroy children as well
	}

	private _getAdjustedPosition(x: number, y: number): { x: number, y: number } {
		const canvasWidth = this.scene.scale.width;
		const canvasHeight = this.scene.scale.height;
		const halfTooltipWidth = TOOLTIP_WIDTH / 2;
		const halfTooltipHeight = TOOLTIP_HEIGHT / 2;

		let adjustedX = x;
		let adjustedY = y;

		if (adjustedX - halfTooltipWidth < 0) {
			adjustedX = halfTooltipWidth;
		} else if (adjustedX + halfTooltipWidth > canvasWidth) {
			adjustedX = canvasWidth - halfTooltipWidth;
		}

		if (adjustedY - halfTooltipHeight < 0) {
			adjustedY = halfTooltipHeight;
		} else if (adjustedY + halfTooltipHeight > canvasHeight) {
			adjustedY = canvasHeight - halfTooltipHeight;
		}

		return { x: adjustedX, y: adjustedY };
	}
}

// --- Module interface to manage the singleton Tooltip instance ---
let tooltipInstance: Tooltip | undefined;

export function init(sceneRef: Phaser.Scene): void {
	if (!tooltipInstance) {
		tooltipInstance = new Tooltip(sceneRef);
	} else {
		// This case might occur if init is called multiple times,
		// e.g., on scene restarts without proper cleanup.
		// Consider if the existing instance should be destroyed and recreated,
		// or if its scene reference should be updated.
		// For now, we'll log a warning. A more robust solution might involve
		// the scene explicitly destroying the tooltip via a `destroyTooltip` function.
		console.warn("Tooltip system already initialized. If using multiple scenes or scene restarts, ensure proper lifecycle management for the tooltip.");
		// Optionally, update the scene reference if it can change:
		// tooltipInstance.scene = sceneRef; // (if scene was public or had a setter)
	}
}

export function render(
	x: number,
	y: number,
	title: string,
	description: string,
) {
	if (!tooltipInstance) {
		console.error("Tooltip system not initialized. Call init(scene) first.");
		return;
	}
	tooltipInstance.render(x, y, title, description);
}

/**
 * Moves the existing tooltip to a new position
 */
export function move(x: number, y: number) {
	if (!tooltipInstance) {
		// Silently return or log error if not initialized, consistent with render
		return;
	}
	tooltipInstance.move(x, y);
}

// hide tooltip
export function hide() {
	if (!tooltipInstance) return;
	tooltipInstance.hide();
}

// Optional: A function to explicitly destroy the tooltip, e.g., when a scene ends.
export function destroyTooltip(): void {
	if (tooltipInstance) {
		tooltipInstance.destroy();
		tooltipInstance = undefined;
	}
}