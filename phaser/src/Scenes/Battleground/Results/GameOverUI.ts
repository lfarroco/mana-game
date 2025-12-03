import { createUIButton } from "../../../Components/UIButton";
import * as c from "@Constants/constants";
import { ResultsUIState } from "./ResultsUI";
import { createResultsPanel } from "./Panel";
import { vec2 } from "@Models/Geometry";
import { getCurrentScene, resetState } from "@Models/State";
import { startGame } from "../../../Game/effects/startGame";
import {
	RESULTS_COLORS,
	RESULTS_FONT_SIZES,
	RESULTS_SPACING
} from "./ResultsConfig";
import { createTitle, createMessage } from "./ResultsHelpers";

export function displayGameOver(
	state: ResultsUIState,
): void {
	const { panelX, panelY, panelWidth, panelHeight } = createResultsPanel(state);

	const centerX = panelX + panelWidth / 2;

	const title = createTitle(
		centerX,
		panelY + RESULTS_SPACING.titleYLarge,
		"Game Over!",
		RESULTS_FONT_SIZES.titleLarge,
		RESULTS_COLORS.defeat
	);
	state.resultsContainer.add(title);

	// Add result message
	const message = createMessage(
		centerX,
		panelY + RESULTS_SPACING.messageYLarge,
		"You have been defeated. Good luck next time!",
		RESULTS_FONT_SIZES.messageLarge,
		panelWidth - RESULTS_SPACING.panelPaddingLarge
	);
	state.resultsContainer.add(message);

	const newRunButton = createUIButton(
		"NEW RUN",
		vec2(centerX, panelY + panelHeight - RESULTS_SPACING.buttonBottomOffsetLarge - RESULTS_SPACING.buttonSpacing),
		async () => {
			resetState();
			startGame();
		}
	);
	state.resultsContainer.add(newRunButton.container);

	const mainMenuButton = createUIButton(
		"MAIN MENU",
		vec2(centerX, panelY + panelHeight - RESULTS_SPACING.buttonBottomOffsetLarge),
		async () => {
			resetState();
			getCurrentScene().game.scene.start(c.SCENE_KEYS.TITLE);
		}
	);
	state.resultsContainer.add(mainMenuButton.container);
}
