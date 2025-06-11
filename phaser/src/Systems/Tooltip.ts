/**
 * @file Implements a dynamic tooltip UI component for displaying information
 * with a title and description. The tooltip automatically adjusts its size
 * based on content and attempts to stay within the screen bounds.
 */


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
	private titleText: Phaser.GameObjects.Text;
	/** An array of text objects for each segment of the tooltip's description, allowing for multiple colors. */
	private descriptionTextSegments: Phaser.GameObjects.Text[] = [];

	// Cached content and dimensions
	/** The last rendered title string, used to detect changes. */
	private currentTitle: string = '';
	/** The last rendered description string, used to detect changes. */
	private currentDescription: string = '';
	/** The current dynamically calculated width of the tooltip. */
	private currentDynamicWidth: number;
	/** The default color for the description text, extracted from defaultTextConfig. */
	private defaultDescriptionColor: string;
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
	/** Target character limit for breaking lines in the description. */
	private static readonly DESCRIPTION_LINE_CHAR_LIMIT = 40;

	/**
	 * Creates an instance of the Tooltip.
	 * @param scene The Phaser.Scene to which this tooltip will be added.
	 */
	constructor(scene: Phaser.Scene) {
		this.scene = scene;

		this.defaultDescriptionColor = (defaultTextConfig.color as string) || '#ffffff'; // Default to white if not specified

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

		// Description text objects will be created dynamically
		this.container.setVisible(false); // Initially hidden
	}

	/**
	 * Parses a BBCode string into segments of text and color.
	 * Example: "Hello [color=red]world[/color]!" becomes:
	 * [{text: "Hello ", color: defaultColor}, {text: "world", color: "red"}, {text: "!", color: defaultColor}]
	 * @param bbCodeText The string containing BBCode for colors.
	 * @returns An array of segments, each with text and its color.
	 */
	private parseBBCodeIntoSegments(bbCodeText: string): Array<{ text: string, color: string }> {
		const segments: Array<{ text: string, color: string }> = [];
		const regex = /\[color=([^\]]+)\](.*?)\[\/color\]/gi;
		let lastIndex = 0;
		let match;

		while ((match = regex.exec(bbCodeText)) !== null) {
			const colorValue = match[1]; // Captured color (e.g., "red", "#FF0000")
			const content = match[2];    // Captured text content within the tags

			// Add text before this match (default color)
			if (match.index > lastIndex) {
				segments.push({
					text: bbCodeText.substring(lastIndex, match.index),
					color: this.defaultDescriptionColor,
				});
			}

			// Add the colored text
			segments.push({
				text: content,
				color: colorValue,
			});

			lastIndex = regex.lastIndex;
		}

		// Add any remaining text after the last match (default color)
		if (lastIndex < bbCodeText.length) {
			segments.push({
				text: bbCodeText.substring(lastIndex),
				color: this.defaultDescriptionColor,
			});
		}

		// If the original string was not empty but produced no segments (e.g. no tags),
		// treat the whole string as a single segment with the default color.
		if (bbCodeText.length > 0 && segments.length === 0) {
			segments.push({ text: bbCodeText, color: this.defaultDescriptionColor });
		}

		return segments;
	}

	/**
	 * Clears existing description text objects and rebuilds them based on the BBCode string.
	 * Each segment from the parsed BBCode will be a new Phaser.GameObjects.Text object.
	 * @param bbCodeDescription The raw description string with BBCode.
	 */
	private _rebuildDescriptionSegments(bbCodeDescription: string): void {
		// Clear and destroy old segments
		this.descriptionTextSegments.forEach(segment => segment.destroy());
		this.descriptionTextSegments = [];

		const parsedBBCodeSegments = this.parseBBCodeIntoSegments(bbCodeDescription);

		for (const bbSegment of parsedBBCodeSegments) {
			if (bbSegment.text.length === 0) {
				continue; // Skip empty initial segments
			}

			let currentTextChunk = bbSegment.text;
			while (currentTextChunk.length > 0) {
				let lineText: string;
				if (currentTextChunk.length > Tooltip.DESCRIPTION_LINE_CHAR_LIMIT) {
					// Try to find a break point (space) at or before the limit.
					// Search within the substring that could potentially be a line.
					let potentialCutSubstring = currentTextChunk.substring(0, Tooltip.DESCRIPTION_LINE_CHAR_LIMIT + 1);
					let breakAt = potentialCutSubstring.lastIndexOf(' ');

					if (breakAt > 0) { // Found a space, and it's not at the beginning.
						lineText = currentTextChunk.substring(0, breakAt);
						currentTextChunk = currentTextChunk.substring(breakAt + 1); // +1 to skip the space
					} else {
						// No suitable space found (or space is at index 0). Hard break at the limit.
						lineText = currentTextChunk.substring(0, Tooltip.DESCRIPTION_LINE_CHAR_LIMIT);
						currentTextChunk = currentTextChunk.substring(Tooltip.DESCRIPTION_LINE_CHAR_LIMIT);
					}
				} else {
					lineText = currentTextChunk;
					currentTextChunk = "";
				}

				if (lineText.length > 0) { // Ensure we don't add empty text objects
					const newTextSegment = this.scene.add.text(
						0, 0, // Position will be set in render() during layout
						lineText,
						defaultTextConfig
					)
						.setOrigin(0)
						.setFontSize(Tooltip.DESCRIPTION_FONT_SIZE)
						.setAlign("left") // Individual segments are left-aligned
						.setColor(bbSegment.color);

					this.container.add(newTextSegment);
					this.descriptionTextSegments.push(newTextSegment);
				}
			}
		}
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
		const titleActualHeight = this.titleText.height;


		// For simplicity, let's assume description content/layout changes if description string or its available width changes.
		// A more sophisticated check could compare old wrap width with new.
		// For now, if description string changes, we rebuild.

		if (descriptionChanged) {
			this.currentDescription = description;
			this._rebuildDescriptionSegments(this.currentDescription);
			overallContentChanged = true; // Content has effectively changed if wrap width altered dimensions
		}

		const needsFullLayoutUpdate = overallContentChanged || !this.container.visible;

		let descActualWidth = 0;
		let descActualHeight = 0;

		if (needsFullLayoutUpdate) {
			// --- Layout Description Segments ---
			// Segments in this.descriptionTextSegments are already pre-split by _rebuildDescriptionSegments
			// to have a text length <= Tooltip.DESCRIPTION_LINE_CHAR_LIMIT (or less if word-broken).
			// Now, we lay them out, forming lines based on character count.
			let currentLineX = 0; // Tracks visual X position on the current line
			let currentLineY = 0; // Tracks visual Y position (top of current line)
			let currentLineMaxSegmentHeight = 0; // Max height of segments on current line
			let currentLineCharCount = 0; // Tracks character count on current line

			descActualWidth = 0; // Will store the maximum visual width encountered for any line

			this.descriptionTextSegments.forEach(segment => {
				const segmentCharLength = segment.text.length;

				// If current line has content and adding this segment exceeds char limit, start new line.
				if (currentLineCharCount > 0 && currentLineCharCount + segmentCharLength > Tooltip.DESCRIPTION_LINE_CHAR_LIMIT) {
					currentLineX = 0;
					currentLineY += currentLineMaxSegmentHeight;
					currentLineMaxSegmentHeight = 0;
					currentLineCharCount = 0;
				}
				segment.setPosition(currentLineX, currentLineY); // Position relative to description block's start
				currentLineX += segment.width; // Advance X by visual width
				currentLineMaxSegmentHeight = Math.max(currentLineMaxSegmentHeight, segment.height);
				currentLineCharCount += segmentCharLength;
				descActualWidth = Math.max(descActualWidth, currentLineX); // Update max line width
			});
			descActualHeight = currentLineY + currentLineMaxSegmentHeight; // Total height of description block
			// --- End Description Layout ---

			const finalContentWidth = Math.max(titleActualWidth, descActualWidth);
			this.currentDynamicWidth = Phaser.Math.Clamp(
				finalContentWidth + (2 * Tooltip.PADDING),
				Tooltip.MIN_TOOLTIP_WIDTH,
				Tooltip.MAX_TOOLTIP_WIDTH
			);

			const contentTotalHeight = titleActualHeight + Tooltip.INTER_ELEMENT_PADDING + descActualHeight;

			this.currentDynamicHeight = Phaser.Math.Clamp(
				contentTotalHeight + (2 * Tooltip.PADDING),
				Tooltip.MIN_TOOLTIP_HEIGHT,
				Tooltip.MAX_TOOLTIP_HEIGHT
			);

			// Now that final dimensions are known, redraw background
			this.bg.clear();
			this.bg.fillStyle(Tooltip.BACKGROUND_COLOR, Tooltip.BACKGROUND_ALPHA);
			this.bg.fillRoundedRect(
				-this.currentDynamicWidth / 2, -this.currentDynamicHeight / 2,
				this.currentDynamicWidth, this.currentDynamicHeight,
				Tooltip.BORDER_RADIUS
			);

			// Position title
			const titleX = -this.currentDynamicWidth / 2 + Tooltip.PADDING;
			const titleY = -this.currentDynamicHeight / 2 + Tooltip.PADDING;
			this.titleText.setPosition(titleX, titleY);

			// Position description segments relative to the title and new tooltip dimensions
			// Their internal x,y (set during the forEach loop above) are relative to the description block's (0,0)
			const descriptionBlockStartX = titleX; // Align description block with title's X
			const descriptionBlockStartY = titleY + titleActualHeight + Tooltip.INTER_ELEMENT_PADDING;
			this.descriptionTextSegments.forEach(segment => {
				// segment.x and segment.y are from the relative layout pass
				segment.setPosition(descriptionBlockStartX + segment.x, descriptionBlockStartY + segment.y);
			});
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
		this.descriptionTextSegments.forEach(segment => segment.destroy());
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
