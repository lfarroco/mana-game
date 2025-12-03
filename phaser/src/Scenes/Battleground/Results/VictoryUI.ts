import { createUIButton } from "../../../Components/UIButton";
import * as c from "@Constants/constants";
import { size, vec2 } from "@Models/Geometry";
import {
	VICTORY_MESSAGES,
	INFINITE_MODE_THRESHOLD,
	RESULTS_COLORS,
	RESULTS_FONT_SIZES,
	RESULTS_PANEL,
	RESULTS_SPACING
} from "./ResultsConfig";
import * as io from "@PhaserIO";

export function displayVictory(
	wins: number,
	nextPhaseCallback: () => void
): Phaser.GameObjects.Container {
	// Panel dimensions
	const panelWidth = RESULTS_PANEL.width;
	const panelHeight = RESULTS_PANEL.height;
	const panelX = c.MIDDLE_SCREEN_X;
	const panelY = c.MIDDLE_SCREEN_Y;

	const messageText = wins > INFINITE_MODE_THRESHOLD
		? VICTORY_MESSAGES.infinite(wins)
		: VICTORY_MESSAGES.standard;

	// Button definitions
	const buttonDefinitions: Array<[string, () => Promise<void>]> = [
		[
			"Continue",
			async () => {
				const { slideOut } = await import("./ResultsUI");
				await slideOut();
				nextPhaseCallback();
			}
		]
	];

	// Map button definitions to containers
	const buttons = buttonDefinitions.map(
		([label, callback]) =>
			createUIButton(
				label,
				vec2(panelX, panelY + panelHeight / 2 - RESULTS_SPACING.buttonBottomOffset),
				callback
			).container
	);

	// Create container with all elements
	const container = io.Container([
		[
			() => io.Rectangle(c.MIDDLE_SCREEN, c.WHOLE_SCREEN, RESULTS_PANEL.overlayColor, RESULTS_PANEL.overlayAlpha),
			io.SetInteractiveRect(size(c.SCREEN_WIDTH, c.SCREEN_HEIGHT)),
		],
		io.BorderedRoundRect(
			vec2(panelX, panelY),
			size(panelWidth, panelHeight),
			RESULTS_PANEL.borderRadius,
			RESULTS_PANEL.backgroundColor,
			RESULTS_PANEL.backgroundAlpha
		),
		[
			() => io.Text("Victory!", { ...c.titleTextConfig, fontSize: RESULTS_FONT_SIZES.titleMedium, color: RESULTS_COLORS.victory }),
			(title) => io.SetPosition(title, vec2(panelX, panelY - panelHeight / 2 + RESULTS_SPACING.titleY)),
			(title) => io.Centralize(title),
		],
		[
			() => io.Text(messageText, { ...c.defaultTextConfig, fontSize: RESULTS_FONT_SIZES.messageMedium, wordWrap: { width: panelWidth - RESULTS_SPACING.panelPadding } }),
			(label) => io.SetPosition(label, vec2(panelX, panelY - panelHeight / 2 + RESULTS_SPACING.messageY)),
			(label) => io.Centralize(label),
		],
		...buttons,
	]);

	return container;
}
