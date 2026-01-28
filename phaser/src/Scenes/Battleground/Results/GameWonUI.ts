import { createUIButton } from "../../../Components/UIButton";
import * as c from "@Constants/constants";
import { size, vec2 } from "@Models/Geometry";
import { startGame } from "../../../Game/effects/startGame";
import { getCurrentScene, resetState, State } from "@Models/State";
import {
	RESULTS_COLORS,
	RESULTS_FONT_SIZES,
	RESULTS_PANEL,
	RESULTS_SPACING
} from "./ResultsConfig";
import * as io from "@PhaserIO";
import { t } from "@i18n/i18n";

export function displayGameWon(
	_state: State,
	nextPhaseCallback: () => void
): Phaser.GameObjects.Container {
	// Panel dimensions
	const panelWidth = 600;
	const panelHeight = 600;
	const panelX = c.MIDDLE_SCREEN_X;
	const panelY = c.MIDDLE_SCREEN_Y;

	// Button definitions
	const buttonDefinitions: Array<[string, () => Promise<void>]> = [
		[
			t("results.buttons.main_menu"),
			async () => {
				resetState();
				getCurrentScene().game.scene.start(c.SCENE_KEYS.TITLE);
			}
		],
		[
			t("results.buttons.new_run"),
			async () => {
				resetState();
				startGame(false);
			}
		],
		[
			t("results.buttons.continueEndless"),
			async () => {
				const { slideOut } = await import("./ResultsUI");
				await slideOut();
				nextPhaseCallback();
			}
		]
	];

	// Map button definitions to containers
	const buttons = buttonDefinitions.map(
		([label, callback], i) =>
			createUIButton(
				label,
				vec2(panelX, panelY + panelHeight / 2 - RESULTS_SPACING.buttonBottomOffsetLarge - (buttonDefinitions.length - 1 - i) * RESULTS_SPACING.buttonSpacing),
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
			() => io.Text(t("results.titles.gameWon"), { ...c.titleTextConfig, fontSize: RESULTS_FONT_SIZES.titleLarge, color: RESULTS_COLORS.gameWon }),
			(title) => io.SetPosition(title, vec2(panelX, panelY - panelHeight / 2 + RESULTS_SPACING.titleYLarge)),
			(title) => io.Centralize(title),
		],
		[
			() => io.Text(t("results.messages.gameWon"), { ...c.defaultTextConfig, fontSize: RESULTS_FONT_SIZES.messageLarge, wordWrap: { width: panelWidth - RESULTS_SPACING.panelPaddingLarge } }),
			(label) => io.SetPosition(label, vec2(panelX, panelY - panelHeight / 2 + RESULTS_SPACING.messageYLarge)),
			(label) => io.Centralize(label),
		],
		...buttons,
	]);

	return container;
}
