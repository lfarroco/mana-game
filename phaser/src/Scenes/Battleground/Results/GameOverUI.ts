import { createUIButton } from "../../../Components/UIButton";
import * as c from "@Constants/constants";
import { getPanelContainer, getPanelBounds } from "./Panel";
import { vec2 } from "@Models/Geometry";
import { getCurrentScene, resetState } from "@Models/State";
import { startGame } from "../../../Game/effects/startGame";
import {
	RESULTS_COLORS,
	RESULTS_FONT_SIZES,
	RESULTS_SPACING
} from "./ResultsConfig";
import { createTitle, createMessage } from "./ResultsHelpers";

export function displayGameOver(): void {
	const panelContainer = getPanelContainer();
	const { panelWidth, panelHeight } = getPanelBounds();

	const centerX = panelWidth / 2;

	const title = createTitle(
		centerX,
		RESULTS_SPACING.titleYLarge,
		"Game Over!",
		RESULTS_FONT_SIZES.titleLarge,
		RESULTS_COLORS.defeat
	);
	panelContainer.add(title);

	// Add result message
	const message = createMessage(
		centerX,
		RESULTS_SPACING.messageYLarge,
		"You have been defeated. Good luck next time!",
		RESULTS_FONT_SIZES.messageLarge,
		panelWidth - RESULTS_SPACING.panelPaddingLarge
	);
	panelContainer.add(message);

	const newRunButton = createUIButton(
		"NEW RUN",
		vec2(centerX, panelHeight - RESULTS_SPACING.buttonBottomOffsetLarge - RESULTS_SPACING.buttonSpacing),
		async () => {
			resetState();
			startGame();
		}
	);
	panelContainer.add(newRunButton.container);

	const mainMenuButton = createUIButton(
		"MAIN MENU",
		vec2(centerX, panelHeight - RESULTS_SPACING.buttonBottomOffsetLarge),
		async () => {
			resetState();
			getCurrentScene().game.scene.start(c.SCENE_KEYS.TITLE);
		}
	);
	panelContainer.add(mainMenuButton.container);
}
