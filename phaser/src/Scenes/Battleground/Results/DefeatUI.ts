import { createUIButton } from "../../../Components/UIButton";
import * as c from "@Constants/constants";
import { size, vec2 } from "@Models/Geometry";
import {
	RESULTS_COLORS,
	RESULTS_FONT_SIZES,
	RESULTS_PANEL,
	RESULTS_SPACING
} from "./ResultsConfig";
import * as io from "@PhaserIO";

export function displayDefeat(
	livesChange: number,
	nextPhaseCallback: () => void
): Phaser.GameObjects.Container {
	// Panel dimensions
	const panelWidth = RESULTS_PANEL.width;
	const panelHeight = RESULTS_PANEL.height;
	const panelX = c.MIDDLE_SCREEN_X;
	const panelY = c.MIDDLE_SCREEN_Y;

	const livesText = `Lives: ${livesChange > 0 ? "+" : ""}${livesChange}`;
	const livesColor = livesChange > 0 ? "#4CAF50" : "#F44336";

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

	const container = io.Container([
		io.BorderedRoundRect(
			vec2(panelX, panelY),
			size(panelWidth, panelHeight),
			RESULTS_PANEL.borderRadius,
			RESULTS_PANEL.backgroundColor,
			RESULTS_PANEL.backgroundAlpha
		),
		[
			() => io.Text("Defeat", { ...c.titleTextConfig, fontSize: RESULTS_FONT_SIZES.titleMedium, color: RESULTS_COLORS.defeat }),
			(title) => io.SetPosition(title, vec2(panelX, panelY - panelHeight / 2 + RESULTS_SPACING.titleY)),
			(title) => io.Centralize(title),
		],
		[
			() => io.Text("You have been defeated.\nBetter luck next time!", { ...c.defaultTextConfig, fontSize: RESULTS_FONT_SIZES.messageMedium, wordWrap: { width: panelWidth - RESULTS_SPACING.panelPadding } }),
			(label) => io.SetPosition(label, vec2(panelX, panelY - panelHeight / 2 + RESULTS_SPACING.messageY)),
			(label) => io.Centralize(label),
		],
		[
			() => io.Text(livesText, {
				...c.defaultTextConfig,
				fontSize: RESULTS_FONT_SIZES.messageSmall,
				color: livesColor,
				fontStyle: "bold",
			}),
			(label) => io.SetPosition(label, vec2(panelX, panelY - panelHeight / 2 + 160)),
			(label) => io.Centralize(label),
		],
		...buttons,
	]);

	return container;
}
