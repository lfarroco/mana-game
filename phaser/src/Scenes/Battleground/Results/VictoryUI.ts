import { createUIButton } from "../../../Components/UIButton";
import * as c from "@Constants/constants";
import { slideOut, ResultsUIState } from "./ResultsUI";
import { createResultsPanel } from "./Panel";
import { vec2 } from "@Models/Geometry";
import { getCurrentScene } from "@Models/State";

export function displayVictory(
	state: ResultsUIState,
	nextPhaseCallback: () => void
): void {
	const { panelX, panelY, panelWidth, panelHeight } = createResultsPanel(state);

	const scene = getCurrentScene();

	// Add title
	const titleText = "Victory!";
	const title = scene.add
		.text(panelX + panelWidth / 2, panelY + 30, titleText, {
			...c.titleTextConfig,
			fontSize: "36px",
			color: "#4CAF50",
		})
		.setOrigin(0.5);
	title.setDepth(1001);
	state.resultsContainer.add(title);

	// Add result message
	const messageText = "Congratulations! You have won the battle.";
	const message = scene.add
		.text(panelX + panelWidth / 2, panelY + 80, messageText, {
			...c.defaultTextConfig,
			fontSize: "16px",
			wordWrap: { width: panelWidth - 60 },
		})
		.setOrigin(0.5);
	message.setDepth(1001);
	state.resultsContainer.add(message);

	// Add next phase button
	const buttonX = panelX + panelWidth / 2;
	const buttonY = panelY + panelHeight - 60;
	const nextButton = createUIButton("Continue", vec2(buttonX, buttonY), async () => {
		await slideOut();
		nextPhaseCallback();
	});
	state.resultsContainer.add(nextButton.container);
}
