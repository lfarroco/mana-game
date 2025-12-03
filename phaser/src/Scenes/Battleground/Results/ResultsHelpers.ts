import * as c from "@Constants/constants";
import { getCurrentScene } from "@Models/State";
import { RESULTS_FONT_SIZES, RESULTS_SPACING } from "./ResultsConfig";

export function createTitle(
	x: number,
	y: number,
	text: string,
	fontSize: string,
	color: string
): Phaser.GameObjects.Text {
	const scene = getCurrentScene();
	const title = scene.add
		.text(x, y, text, {
			...c.titleTextConfig,
			fontSize,
			color,
		})
		.setOrigin(0.5);
	return title;
}

export function createMessage(
	x: number,
	y: number,
	text: string,
	fontSize: string,
	wrapWidth: number,
	color?: string
): Phaser.GameObjects.Text {
	const scene = getCurrentScene();
	const config: Phaser.Types.GameObjects.Text.TextStyle = {
		...c.defaultTextConfig,
		fontSize,
		wordWrap: { width: wrapWidth },
	};

	if (color) {
		config.color = color;
	}

	const message = scene.add
		.text(x, y, text, config)
		.setOrigin(0.5);
	return message;
}

export function calculateButtonPositions(
	baseY: number,
	count: number,
	spacing: number = RESULTS_SPACING.buttonSpacing
): number[] {
	const positions: number[] = [];
	const totalHeight = (count - 1) * spacing;
	const startY = baseY - totalHeight / 2;

	for (let i = 0; i < count; i++) {
		positions.push(startY + i * spacing);
	}

	return positions;
}

export function createLivesDisplay(
	x: number,
	y: number,
	livesChange: number
): Phaser.GameObjects.Text {
	const scene = getCurrentScene();
	const livesText = `Lives: ${livesChange > 0 ? "+" : ""}${livesChange}`;
	const livesDisplay = scene.add
		.text(x, y, livesText, {
			...c.defaultTextConfig,
			fontSize: RESULTS_FONT_SIZES.messageSmall,
			color: livesChange > 0 ? "#4CAF50" : "#F44336",
			fontStyle: "bold",
		})
		.setOrigin(0.5);
	return livesDisplay;
}
