/**
 * @file Implements a dynamic tooltip UI component for displaying information
 * with a title and description. The tooltip automatically adjusts its size
 * based on content and attempts to stay within the screen bounds.
 */


import BBCodeText from "phaser3-rex-plugins/plugins/gameobjects/tagtext/bbcodetext/BBCodeText";
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
	private descriptionText: BBCodeText;
	private currentTitle: string = '';
	private currentDescription: string = '';

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

	// Fixed sizing constants
	/** Fixed width for the tooltip. */
	private static readonly FIXED_TOOLTIP_WIDTH = 600;
	/** Fixed height for the tooltip. */
	private static readonly FIXED_TOOLTIP_HEIGHT = 300;

	/**
	 * Creates an instance of the Tooltip.
	 * @param scene The Phaser.Scene to which this tooltip will be added.
	 */
	constructor(scene: Phaser.Scene) {
		this.scene = scene;

		this.container = this.scene.add.container(0, 0);
		this.container.setDepth(Phaser.Math.MAX_SAFE_INTEGER); // Ensure tooltip is on top

		this.bg = this.scene.add.graphics();
		this.bg.fillStyle(Tooltip.BACKGROUND_COLOR, Tooltip.BACKGROUND_ALPHA);
		this.bg.fillRoundedRect(
			-Tooltip.FIXED_TOOLTIP_WIDTH / 2,
			-Tooltip.FIXED_TOOLTIP_HEIGHT / 2,
			Tooltip.FIXED_TOOLTIP_WIDTH,
			Tooltip.FIXED_TOOLTIP_HEIGHT,
			Tooltip.BORDER_RADIUS
		);
		this.container.add(this.bg);

		this.titleText = this.scene.add.text(
			-Tooltip.FIXED_TOOLTIP_WIDTH / 2 + Tooltip.PADDING,
			-Tooltip.FIXED_TOOLTIP_HEIGHT / 2 + Tooltip.PADDING,
			'', // Initial empty text
			defaultTextConfig
		)
			.setOrigin(0)
			.setFontSize(Tooltip.TITLE_FONT_SIZE)
			.setFontFamily("Arial Black")
			.setAlign("left");
		this.container.add(this.titleText);

		const descriptionWrapWidth = Tooltip.FIXED_TOOLTIP_WIDTH - (2 * Tooltip.PADDING);
		this.descriptionText = this.scene.add.rexBBCodeText(
			-Tooltip.FIXED_TOOLTIP_WIDTH / 2 + Tooltip.PADDING,
			this.titleText.y + this.titleText.displayHeight + Tooltip.INTER_ELEMENT_PADDING, // Initial Y, will be updated
			'', // Initial empty text
		)
			.setOrigin(0)
			.setFontSize(Tooltip.DESCRIPTION_FONT_SIZE)
			.setAlign("left")
			.setWrapMode(1)
			.setFontFamily("Arial")
			.setWordWrapWidth(descriptionWrapWidth);
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
		let contentChanged = titleChanged || descriptionChanged;

		if (titleChanged) {
			this.titleText.setText(title);
			this.currentTitle = title;
		}

		if (descriptionChanged) {
			this.descriptionText.setText(description);
			this.currentDescription = description;
		}

		if (contentChanged || !this.container.visible) {
			// Background is fixed and drawn in constructor.
			// If background style could change, it would need to be redrawn here.

			// Position title text
			this.titleText.setPosition(
				-Tooltip.FIXED_TOOLTIP_WIDTH / 2 + Tooltip.PADDING,
				-Tooltip.FIXED_TOOLTIP_HEIGHT / 2 + Tooltip.PADDING
			);

			// Set description wrap width (it's fixed)
			const descriptionWrapWidth = Tooltip.FIXED_TOOLTIP_WIDTH - (2 * Tooltip.PADDING);
			if (this.descriptionText.style.wrapWidth !== descriptionWrapWidth) {
				this.descriptionText.setWordWrapWidth(descriptionWrapWidth);
			}

			// Position description text relative to title
			// Using .height for actual text height after potential wrapping and content update.
			this.descriptionText.setPosition(
				-Tooltip.FIXED_TOOLTIP_WIDTH / 2 + Tooltip.PADDING,
				this.titleText.y + this.titleText.height + Tooltip.INTER_ELEMENT_PADDING
			);
		}

		const { x: adjustedX, y: adjustedY } = this._getAdjustedPosition(x, y, Tooltip.FIXED_TOOLTIP_WIDTH, Tooltip.FIXED_TOOLTIP_HEIGHT);
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
		const { x: adjustedX, y: adjustedY } = this._getAdjustedPosition(x, y, Tooltip.FIXED_TOOLTIP_WIDTH, Tooltip.FIXED_TOOLTIP_HEIGHT);
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
