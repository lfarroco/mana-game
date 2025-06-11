import { defaultTextConfig } from "../Scenes/Battleground/constants";

// TODO: on mobile, use a long press to show the tooltip

const TOOLTIP_WIDTH = 500;
const TOOLTIP_HEIGHT = 300;

export class Tooltip {
	private scene: Phaser.Scene;
	private container: Phaser.GameObjects.Container;
	private bg: Phaser.GameObjects.Graphics;
	private titleText: Phaser.GameObjects.Text;
	private descriptionText: Phaser.GameObjects.Text;
	private currentTitle: string = '';
	private currentDescription: string = '';

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
		let contentChanged = false;
		if (this.currentTitle !== title) {
			this.titleText.setText(title);
			this.currentTitle = title;
			contentChanged = true;
		}
		if (this.currentDescription !== description) {
			this.descriptionText.setText(description);
			this.currentDescription = description;
			contentChanged = true;
		}

		const needsLayoutUpdate = contentChanged || !this.container.visible;

		if (needsLayoutUpdate) {
			// Dynamically position description below title
			this.descriptionText.setY(this.titleText.y + this.titleText.displayHeight + Tooltip.INTER_ELEMENT_PADDING);
		}

		// Note: If TOOLTIP_HEIGHT needs to be dynamic based on content,
		// this.bg and potentially _getAdjustedPosition would need updates here.
		// If contentChanged and height is dynamic, bg would need to be redrawn.

		const { x: adjustedX, y: adjustedY } = this._getAdjustedPosition(x, y);
		if (this.container.x !== adjustedX || this.container.y !== adjustedY) {
			this.container.setPosition(adjustedX, adjustedY);
		}
		if (!this.container.visible) {
			this.container.setVisible(true);
		}
	}

	public move(x: number, y: number): void {
		if (!this.container.visible) return;
		const { x: adjustedX, y: adjustedY } = this._getAdjustedPosition(x, y);
		if (this.container.x !== adjustedX || this.container.y !== adjustedY) {
			this.container.setPosition(adjustedX, adjustedY);
		}
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
