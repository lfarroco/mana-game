import { createUIButton } from "../../../Components/UIButton";
import { slideOut, ResultsUIState } from "./ResultsUI";
import { createResultsPanel } from "./Panel";
import { vec2 } from "@Models/Geometry";
import {
	VICTORY_MESSAGES,
	INFINITE_MODE_THRESHOLD,
	RESULTS_COLORS,
	RESULTS_FONT_SIZES,
	RESULTS_SPACING
} from "./ResultsConfig";
import { createTitle, createMessage } from "./ResultsHelpers";

export function displayVictory(
	state: ResultsUIState,
	wins: number,
	nextPhaseCallback: () => void
): void {
	const { panelX, panelY, panelWidth, panelHeight } = createResultsPanel(state);

	const centerX = panelX + panelWidth / 2;

	const title = createTitle(
		centerX,
		panelY + RESULTS_SPACING.titleY,
		"Victory!",
		RESULTS_FONT_SIZES.titleMedium,
		RESULTS_COLORS.victory
	);
	state.resultsContainer.add(title);

	const messageText = wins > INFINITE_MODE_THRESHOLD
		? VICTORY_MESSAGES.infinite(wins)
		: VICTORY_MESSAGES.standard;

	const message = createMessage(
		centerX,
		panelY + RESULTS_SPACING.messageY,
		messageText,
		RESULTS_FONT_SIZES.messageMedium,
		panelWidth - RESULTS_SPACING.panelPadding
	);
	state.resultsContainer.add(message);

	const buttonY = panelY + panelHeight - RESULTS_SPACING.buttonBottomOffset;
	const nextButton = createUIButton("Continue", vec2(centerX, buttonY), async () => {
		await slideOut();
		nextPhaseCallback();
	});
	state.resultsContainer.add(nextButton.container);
}
