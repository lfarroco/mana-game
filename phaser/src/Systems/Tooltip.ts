import { defaultTextConfig } from "../Scenes/Battleground/constants";

// TODO: on mobile, use a long press to show the tooltip

/**
 * Represents a tooltip UI element that can display a title and description.
 * The tooltip dynamically adjusts its size based on content and attempts to stay within screen bounds.
 */
export class Tooltip {
	/** The Phaser scene this tooltip belongs to. */
	private scene: Phaser.Scene;
	/** The main container for all tooltip game objects. */
	private container: Phaser.GameObjects.Container;
	/** The graphical background of the tooltip. */
	private bg: Phaser.GameObjects.Graphics;
	/** The text object for the tooltip's title. */
	private titleText: Phaser.GameObjects.Text;
	/** The text object for the tooltip's description. */
	private descriptionText: Phaser.GameObjects.Text;

	// Cached content and dimensions
	/** The last rendered title string, used to detect changes. */
	private currentTitle: string = '';
	/** The last rendered description string, used to detect changes. */
	private currentDescription: string = '';
	/** The current dynamically calculated width of the tooltip. */
	private currentDynamicWidth: number;
	/** The current dynamically calculated height of the tooltip. */
	private currentDynamicHeight: number;

	// Style constants can be static members or remain module-level if preferred
	/** Padding around the content within the tooltip. */
	private static readonly PADDING = 20;
	/** Font size for the title text. */
	private static readonly TITLE_FONT_SIZE = 40;
	/** Font size for the description text. */
	private static readonly DESCRIPTION_FONT_SIZE = 30;
	/** Border radius for the tooltip's background. */
	private static readonly BORDER_RADIUS = 10;
	/** Background color of the tooltip. */
	private static readonly BACKGROUND_COLOR = 0x000000;
	/** Alpha transparency of the tooltip's background. */
	private static readonly BACKGROUND_ALPHA = 0.8;
	/** Padding between the title and description text. */
	private static readonly INTER_ELEMENT_PADDING = Tooltip.PADDING / 2;

	// Dynamic sizing constants
	/** Minimum width the tooltip can have. */
	private static readonly MIN_TOOLTIP_WIDTH = 150;
	/** Minimum height the tooltip can have. */
	private static readonly MIN_TOOLTIP_HEIGHT = 80;
	/** Maximum width the tooltip can have. */
	private static readonly MAX_TOOLTIP_WIDTH = 500;
	/**
	 * Maximum height the tooltip can have.
	 * Optional: Or adjust as needed based on typical content length.
	 */
	private static readonly MAX_TOOLTIP_HEIGHT = 400;
	/** Minimum width for the description text's word wrapping. */
	private static readonly MIN_CONTENT_WIDTH = 100; // Min width for description text wrap

	/**
	 * Creates an instance of the Tooltip.
	 * @param scene The Phaser.Scene to which this tooltip will be added.
	 */
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

	/**
	 * Renders or updates the tooltip with new content and position.
	 * @param x The target x-coordinate for the tooltip (center).
	 * @param y The target y-coordinate for the tooltip (center).
	 * @param title The title text to display.
	 * @param description The description text to display.
	 */
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

	/**
	 * Moves the tooltip to a new position if it's visible.
	 * @param x The new target x-coordinate for the tooltip (center).
	 * @param y The new target y-coordinate for the tooltip (center).
	 */
	public move(x: number, y: number): void {
		if (!this.container.visible) return;
		const { x: adjustedX, y: adjustedY } = this._getAdjustedPosition(x, y, this.currentDynamicWidth, this.currentDynamicHeight);
		if (this.container.x !== adjustedX || this.container.y !== adjustedY) {
			this.container.setPosition(adjustedX, adjustedY);
		}
	}

	/**
	 * Hides the tooltip.
	 */
	public hide(): void {
		this.container.setVisible(false);
	}

	/**
	 * Destroys the tooltip and its associated game objects, removing them from the scene.
	 */
	public destroy(): void {
		this.container.destroy(true); // true to destroy children as well
	}

	/**
	 * Calculates the adjusted position for the tooltip to ensure it stays within the canvas bounds.
	 * The tooltip is centered on the provided x, y coordinates unless it would go off-screen.
	 * @param x The desired x-coordinate (center of the tooltip).
	 * @param y The desired y-coordinate (center of the tooltip).
	 * @param tooltipWidth The current width of the tooltip.
	 * @param tooltipHeight The current height of the tooltip.
	 * @returns An object containing the adjusted x and y coordinates.
	 */
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
