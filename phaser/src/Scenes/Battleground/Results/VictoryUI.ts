import { createUIButton } from "../../../Components/UIButton";
import { getPanelContainer, getPanelBounds } from "./Panel";
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
	wins: number,
	nextPhaseCallback: () => void
): void {
	const panelContainer = getPanelContainer();
	const { panelWidth, panelHeight } = getPanelBounds();

	const centerX = panelWidth / 2;

	const title = createTitle(
		centerX,
		RESULTS_SPACING.titleY,
		"Victory!",
		RESULTS_FONT_SIZES.titleMedium,
		RESULTS_COLORS.victory
	);
	panelContainer.add(title);

	const messageText = wins > INFINITE_MODE_THRESHOLD
		? VICTORY_MESSAGES.infinite(wins)
		: VICTORY_MESSAGES.standard;

	const message = createMessage(
		centerX,
		RESULTS_SPACING.messageY,
		messageText,
		RESULTS_FONT_SIZES.messageMedium,
		panelWidth - RESULTS_SPACING.panelPadding
	);
	panelContainer.add(message);

	const buttonY = panelHeight - RESULTS_SPACING.buttonBottomOffset;
	const nextButton = createUIButton("Continue", vec2(centerX, buttonY), async () => {
		const { slideOut } = await import("./ResultsUI");
		await slideOut();
		nextPhaseCallback();
	});
	panelContainer.add(nextButton.container);
}
