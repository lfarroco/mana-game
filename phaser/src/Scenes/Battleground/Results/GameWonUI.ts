import { createUIButton } from "../../../Components/UIButton";
import * as c from "@Constants/constants";
import { getPanelContainer, getPanelBounds } from "./Panel";
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
	nextPhaseCallback: () => void
): void {
	const panelContainer = getPanelContainer();
	const { panelWidth, panelHeight } = getPanelBounds();

	const centerX = panelWidth / 2;

	const title = createTitle(
		centerX,
		RESULTS_SPACING.titleYLarge,
		"You Win the Game!",
		RESULTS_FONT_SIZES.titleLarge,
		RESULTS_COLORS.gameWon
	);
	panelContainer.add(title);

	const message = createMessage(
		centerX,
		RESULTS_SPACING.messageYLarge,
		"Congratulations! You have won the game.",
		RESULTS_FONT_SIZES.messageLarge,
		panelWidth - RESULTS_SPACING.panelPaddingLarge
	);
	panelContainer.add(message);

	const mainMenuButton = createUIButton(
		"Main Menu",
		vec2(centerX, panelHeight - RESULTS_SPACING.buttonBottomOffsetLarge - (RESULTS_SPACING.buttonSpacing * 2)),
		async () => {
			resetState();
			getCurrentScene().game.scene.start(c.SCENE_KEYS.TITLE);
		}
	);
	panelContainer.add(mainMenuButton.container);

	const newRunButton = createUIButton(
		"NEW RUN",
		vec2(centerX, panelHeight - RESULTS_SPACING.buttonBottomOffsetLarge - RESULTS_SPACING.buttonSpacing),
		async () => {
			resetState();
			startGame();
		}
	);
	panelContainer.add(newRunButton.container);

	const nextButton = createUIButton(
		"Continue (Endless)",
		vec2(centerX, panelHeight - RESULTS_SPACING.buttonBottomOffsetLarge),
		async () => {
			const { slideOut } = await import("./ResultsUI");
			await slideOut();
			nextPhaseCallback();
		}
	);

	panelContainer.add(nextButton.container);
}
