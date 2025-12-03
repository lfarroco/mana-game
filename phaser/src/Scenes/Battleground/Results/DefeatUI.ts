import { createUIButton } from "../../../Components/UIButton";
import { getPanelContainer, getPanelBounds } from "./Panel";
import { vec2 } from "@Models/Geometry";
import {
	RESULTS_COLORS,
	RESULTS_FONT_SIZES,
	RESULTS_SPACING
} from "./ResultsConfig";
import { createTitle, createMessage, createLivesDisplay } from "./ResultsHelpers";

export function displayDefeat(
	livesChange: number,
	nextPhaseCallback: () => void
): void {
	const panelContainer = getPanelContainer();
	const { panelWidth, panelHeight } = getPanelBounds();

	const centerX = panelWidth / 2;

	// Add title
	const title = createTitle(
		centerX,
		RESULTS_SPACING.titleY,
		"Defeat",
		RESULTS_FONT_SIZES.titleMedium,
		RESULTS_COLORS.defeat
	);
	panelContainer.add(title);

	// Add result message
	const message = createMessage(
		centerX,
		RESULTS_SPACING.messageY,
		"You have been defeated.\nBetter luck next time!",
		RESULTS_FONT_SIZES.messageMedium,
		panelWidth - RESULTS_SPACING.panelPadding
	);
	panelContainer.add(message);

	const livesDisplay = createLivesDisplay(
		centerX,
		160,
		livesChange
	);
	panelContainer.add(livesDisplay);

	const buttonY = panelHeight - RESULTS_SPACING.buttonBottomOffset;
	const nextButton = createUIButton("Continue", vec2(centerX, buttonY), async () => {
		const { slideOut } = await import("./ResultsUI");
		await slideOut();
		nextPhaseCallback();
	});
	panelContainer.add(nextButton.container);
}
