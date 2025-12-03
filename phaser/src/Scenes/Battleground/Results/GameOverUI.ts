import { createUIButton } from "../../../Components/UIButton";
import * as c from "@Constants/constants";
import { size, vec2 } from "@Models/Geometry";
import { getCurrentScene, resetState } from "@Models/State";
import { startGame } from "../../../Game/effects/startGame";
import {
	RESULTS_COLORS,
	RESULTS_FONT_SIZES,
	RESULTS_PANEL,
	RESULTS_SPACING
} from "./ResultsConfig";
import * as io from "@PhaserIO";

export function displayGameOver(): Phaser.GameObjects.Container {
	// Panel dimensions
	const panelWidth = RESULTS_PANEL.width;
	const panelHeight = RESULTS_PANEL.height;
	const panelX = c.MIDDLE_SCREEN_X;
	const panelY = c.MIDDLE_SCREEN_Y;

	// Button definitions
	const buttonDefinitions: Array<[string, () => Promise<void>]> = [
		[
			"NEW RUN",
			async () => {
				resetState();
				startGame();
			}
		],
		[
			"MAIN MENU",
			async () => {
				resetState();
				getCurrentScene().game.scene.start(c.SCENE_KEYS.TITLE);
			}
		]
	];

	// Map button definitions to containers
	const buttons = buttonDefinitions.map(
		([label, callback], i) =>
			createUIButton(
				label,
				vec2(panelX, panelY + panelHeight / 2 - RESULTS_SPACING.buttonBottomOffsetLarge - (i === 0 ? RESULTS_SPACING.buttonSpacing : 0)),
				callback
			).container
	);

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
			() => io.Text("Game Over!", { ...c.titleTextConfig, fontSize: RESULTS_FONT_SIZES.titleLarge, color: RESULTS_COLORS.defeat }),
			(title) => io.SetPosition(title, vec2(panelX, panelY - panelHeight / 2 + RESULTS_SPACING.titleYLarge)),
			(title) => io.Centralize(title),
		],
		[
			() => io.Text("You have been defeated. Good luck next time!", { ...c.defaultTextConfig, fontSize: RESULTS_FONT_SIZES.messageLarge, wordWrap: { width: panelWidth - RESULTS_SPACING.panelPaddingLarge } }),
			(label) => io.SetPosition(label, vec2(panelX, panelY - panelHeight / 2 + RESULTS_SPACING.messageYLarge)),
			(label) => io.Centralize(label),
		],
		...buttons,
	]);

	return container;
}
