import { createUIButton } from "../../../Components/UIButton";
import { slideOut, ResultsUIState } from "./ResultsUI";
import { createResultsPanel } from "./Panel";
import { vec2 } from "@Models/Geometry";
import {
	RESULTS_COLORS,
	RESULTS_FONT_SIZES,
	RESULTS_SPACING
} from "./ResultsConfig";
import { createTitle, createMessage, createLivesDisplay } from "./ResultsHelpers";

export function displayDefeat(
	state: ResultsUIState,
	livesChange: number,
	nextPhaseCallback: () => void
): void {
	const { panelX, panelY, panelWidth, panelHeight } = createResultsPanel(state);

	const centerX = panelX + panelWidth / 2;

	// Add title
	const title = createTitle(
		centerX,
		panelY + RESULTS_SPACING.titleY,
		"Defeat",
		RESULTS_FONT_SIZES.titleMedium,
		RESULTS_COLORS.defeat
	);
	state.resultsContainer.add(title);

	// Add result message
	const message = createMessage(
		centerX,
		panelY + RESULTS_SPACING.messageY,
		"You have been defeated.\nBetter luck next time!",
		RESULTS_FONT_SIZES.messageMedium,
		panelWidth - RESULTS_SPACING.panelPadding
	);
	state.resultsContainer.add(message);

	const livesDisplay = createLivesDisplay(
		centerX,
		panelY + 160,
		livesChange
	);
	state.resultsContainer.add(livesDisplay);

	const buttonY = panelY + panelHeight - RESULTS_SPACING.buttonBottomOffset;
	const nextButton = createUIButton("Continue", vec2(centerX, buttonY), async () => {
		await slideOut();
		nextPhaseCallback();
	});
	state.resultsContainer.add(nextButton.container);
}
