import { defaultTextConfig } from "../Scenes/Battleground/constants";

// TODO: on mobile, use a long press to show the tooltip

export class Tooltip {
	private scene: Phaser.Scene;
	private container: Phaser.GameObjects.Container;
	private bg: Phaser.GameObjects.Graphics;
	private titleText: Phaser.GameObjects.Text;
	private descriptionText: Phaser.GameObjects.Text;

	// Cached content and dimensions
	private currentTitle: string = '';
	private currentDescription: string = '';
	private currentDynamicWidth: number;
	private currentDynamicHeight: number;

	// Style constants can be static members or remain module-level if preferred
	private static readonly PADDING = 20;
	private static readonly TITLE_FONT_SIZE = 40;
	private static readonly DESCRIPTION_FONT_SIZE = 30;
	private static readonly BORDER_RADIUS = 10;
	private static readonly BACKGROUND_COLOR = 0x000000;
	private static readonly BACKGROUND_ALPHA = 0.8;
	private static readonly INTER_ELEMENT_PADDING = Tooltip.PADDING / 2;

	// Dynamic sizing constants
	private static readonly MIN_TOOLTIP_WIDTH = 150;
	private static readonly MIN_TOOLTIP_HEIGHT = 80;
	private static readonly MAX_TOOLTIP_WIDTH = 500;
	private static readonly MAX_TOOLTIP_HEIGHT = 400; // Optional: Or adjust as needed
	private static readonly MIN_CONTENT_WIDTH = 100; // Min width for description text wrap

	constructor(scene: Phaser.Scene) {
		this.scene = scene;

		this.container = this.scene.add.container(0, 0);
		this.container.setDepth(Phaser.Math.MAX_SAFE_INTEGER); // Ensure tooltip is on top

		this.currentDynamicWidth = Tooltip.MIN_TOOLTIP_WIDTH;
		this.currentDynamicHeight = Tooltip.MIN_TOOLTIP_HEIGHT;

		this.bg = this.scene.add.graphics();
		this.bg.fillStyle(Tooltip.BACKGROUND_COLOR, Tooltip.BACKGROUND_ALPHA);
		this.bg.fillRoundedRect(
			-this.currentDynamicWidth / 2,
			-this.currentDynamicHeight / 2,
			this.currentDynamicWidth,
			this.currentDynamicHeight,
			Tooltip.BORDER_RADIUS
		);
		this.container.add(this.bg);

		this.titleText = this.scene.add.text(
			-this.currentDynamicWidth / 2 + Tooltip.PADDING,
			-this.currentDynamicHeight / 2 + Tooltip.PADDING,
			'', // Initial empty text
			defaultTextConfig
		)
			.setOrigin(0)
			.setFontSize(Tooltip.TITLE_FONT_SIZE)
			.setFontFamily("Arial Black")
			.setAlign("left");
		this.container.add(this.titleText);

		const initialDescriptionWrapWidth = Tooltip.MAX_TOOLTIP_WIDTH - (2 * Tooltip.PADDING);
		this.descriptionText = this.scene.add.text(
			-this.currentDynamicWidth / 2 + Tooltip.PADDING,
			this.titleText.y + this.titleText.displayHeight + Tooltip.INTER_ELEMENT_PADDING, // Initial Y, will be updated
			'', // Initial empty text
			defaultTextConfig
		)
			.setOrigin(0)
			.setFontSize(Tooltip.DESCRIPTION_FONT_SIZE)
			.setAlign("left")
			.setWordWrapWidth(initialDescriptionWrapWidth);
		this.container.add(this.descriptionText);

		this.container.setVisible(false); // Initially hidden
	}

	public render(x: number, y: number, title: string, description: string): void {
		let titleChanged = this.currentTitle !== title;
		let descriptionChanged = this.currentDescription !== description;
		let overallContentChanged = titleChanged || descriptionChanged;

		if (titleChanged) {
			this.titleText.setText(title);
			this.currentTitle = title;
		}

		const titleActualWidth = this.titleText.width;
		const maxContentAreaWidth = Tooltip.MAX_TOOLTIP_WIDTH - (2 * Tooltip.PADDING);
		const newDescriptionWrapWidth = Phaser.Math.Clamp(
			titleActualWidth,
			Tooltip.MIN_CONTENT_WIDTH,
			maxContentAreaWidth
		);

		let descriptionWrapWidthChanged = false;
		if (this.descriptionText.style.wordWrapWidth !== newDescriptionWrapWidth) {
			this.descriptionText.setWordWrapWidth(newDescriptionWrapWidth);
			descriptionWrapWidthChanged = true;
		}

		if (descriptionChanged || descriptionWrapWidthChanged) {
			this.descriptionText.setText(description);
			this.currentDescription = description;
			overallContentChanged = true; // Content has effectively changed if wrap width altered dimensions
		}

		const needsFullLayoutUpdate = overallContentChanged || !this.container.visible;

		if (needsFullLayoutUpdate) {
			const descActualWidth = this.descriptionText.width;
			const finalContentWidth = Math.max(titleActualWidth, descActualWidth);

			this.currentDynamicWidth = Phaser.Math.Clamp(
				finalContentWidth + (2 * Tooltip.PADDING),
				Tooltip.MIN_TOOLTIP_WIDTH,
				Tooltip.MAX_TOOLTIP_WIDTH
			);

			const titleActualHeight = this.titleText.height;
			const descActualHeight = this.descriptionText.height;
			const contentTotalHeight = titleActualHeight + Tooltip.INTER_ELEMENT_PADDING + descActualHeight;

			this.currentDynamicHeight = Phaser.Math.Clamp(
				contentTotalHeight + (2 * Tooltip.PADDING),
				Tooltip.MIN_TOOLTIP_HEIGHT,
				Tooltip.MAX_TOOLTIP_HEIGHT
			);

			this.bg.clear();
			this.bg.fillStyle(Tooltip.BACKGROUND_COLOR, Tooltip.BACKGROUND_ALPHA);
			this.bg.fillRoundedRect(
				-this.currentDynamicWidth / 2, -this.currentDynamicHeight / 2,
				this.currentDynamicWidth, this.currentDynamicHeight,
				Tooltip.BORDER_RADIUS
			);

			this.titleText.setX(-this.currentDynamicWidth / 2 + Tooltip.PADDING);
			this.titleText.setY(-this.currentDynamicHeight / 2 + Tooltip.PADDING);

			this.descriptionText.setX(-this.currentDynamicWidth / 2 + Tooltip.PADDING);
			this.descriptionText.setY(this.titleText.y + titleActualHeight + Tooltip.INTER_ELEMENT_PADDING);
		}

		const { x: adjustedX, y: adjustedY } = this._getAdjustedPosition(x, y, this.currentDynamicWidth, this.currentDynamicHeight);
		if (this.container.x !== adjustedX || this.container.y !== adjustedY) {
			this.container.setPosition(adjustedX, adjustedY);
		}
		if (!this.container.visible) {
			this.container.setVisible(true);
		}
	}

	public move(x: number, y: number): void {
		if (!this.container.visible) return;
		const { x: adjustedX, y: adjustedY } = this._getAdjustedPosition(x, y, this.currentDynamicWidth, this.currentDynamicHeight);
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

	private _getAdjustedPosition(x: number, y: number, tooltipWidth: number, tooltipHeight: number): { x: number, y: number } {
		const canvasWidth = this.scene.scale.width;
		const canvasHeight = this.scene.scale.height;
		const halfTooltipWidth = tooltipWidth / 2;
		const halfTooltipHeight = tooltipHeight / 2;

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
