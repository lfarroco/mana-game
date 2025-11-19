import { scene } from "../BattlegroundScene";
import { createUIButton } from "../../../Components/UIButton";
import * as c from "@Constants/constants";
import { slideOut, ResultsUIState } from "./ResultsUI";
import { createResultsPanel } from "./Panel";
import { vec2 } from "@Models/Geometry";

export function displayVictory(
	state: ResultsUIState,
	nextPhaseCallback: () => void
): void {
	const { panelX, panelY, panelWidth, panelHeight } = createResultsPanel(state);

	// Add title
	const titleText = "Victory!";
	const title = scene.add
		.text(panelX + panelWidth / 2, panelY + 50, titleText, {
			...c.titleTextConfig,
			fontSize: "48px",
			color: "#4CAF50",
		})
		.setOrigin(0.5);
	title.setDepth(1001);
	state.resultsContainer.add(title);

	// Add result message
	const messageText = "Congratulations! You have won the battle.";
	const message = scene.add
		.text(panelX + panelWidth / 2, panelY + 120, messageText, {
			...c.defaultTextConfig,
			fontSize: "20px",
			wordWrap: { width: panelWidth - 80 },
		})
		.setOrigin(0.5);
	message.setDepth(1001);
	state.resultsContainer.add(message);

	// Add next phase button
	const buttonX = panelX + panelWidth / 2;
	const buttonY = panelY + panelHeight - 80;
	const nextButton = createUIButton("Continue", vec2(buttonX, buttonY), async () => {
		await slideOut();
		nextPhaseCallback();
	});
	state.resultsContainer.add(nextButton.container);
}
