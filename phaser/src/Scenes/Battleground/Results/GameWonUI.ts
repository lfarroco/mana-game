import { createUIButton } from "../../../Components/UIButton";
import * as c from "@Constants/constants";
import { slideOut, ResultsUIState } from "./ResultsUI";
import { createResultsPanel } from "./Panel";
import { vec2 } from "@Models/Geometry";
import { startGame } from "../../../Game/effects/startGame";
import { getCurrentScene, resetState } from "@Models/State";
import {
	RESULTS_COLORS,
	RESULTS_FONT_SIZES,
	RESULTS_SPACING
} from "./ResultsConfig";
import { createTitle, createMessage } from "./ResultsHelpers";

export function displayGameWon(
	state: ResultsUIState,
	nextPhaseCallback: () => void
): void {
	const { panelX, panelY, panelWidth, panelHeight } = createResultsPanel(state);

	const centerX = panelX + panelWidth / 2;

	const title = createTitle(
		centerX,
		panelY + RESULTS_SPACING.titleYLarge,
		"You Win the Game!",
		RESULTS_FONT_SIZES.titleLarge,
		RESULTS_COLORS.gameWon
	);
	state.resultsContainer.add(title);

	const message = createMessage(
		centerX,
		panelY + RESULTS_SPACING.messageYLarge,
		"Congratulations! You have won the game.",
		RESULTS_FONT_SIZES.messageLarge,
		panelWidth - RESULTS_SPACING.panelPaddingLarge
	);
	state.resultsContainer.add(message);

	const mainMenuButton = createUIButton(
		"Main Menu",
		vec2(centerX, panelY + panelHeight - RESULTS_SPACING.buttonBottomOffsetLarge - (RESULTS_SPACING.buttonSpacing * 2)),
		async () => {
			resetState();
			getCurrentScene().game.scene.start(c.SCENE_KEYS.TITLE);
		}
	);
	state.resultsContainer.add(mainMenuButton.container);

	const newRunButton = createUIButton(
		"NEW RUN",
		vec2(centerX, panelY + panelHeight - RESULTS_SPACING.buttonBottomOffsetLarge - RESULTS_SPACING.buttonSpacing),
		async () => {
			resetState();
			startGame();
		}
	);
	state.resultsContainer.add(newRunButton.container);

	const nextButton = createUIButton(
		"Continue (Endless)",
		vec2(centerX, panelY + panelHeight - RESULTS_SPACING.buttonBottomOffsetLarge),
		async () => {
			await slideOut();
			nextPhaseCallback();
		}
	);
	state.resultsContainer.add(nextButton.container);
}
