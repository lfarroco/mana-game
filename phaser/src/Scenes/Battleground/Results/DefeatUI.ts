import { createUIButton } from "../../../Components/UIButton";
import * as c from "@Constants/constants";
import { slideOut, ResultsUIState } from "./ResultsUI";
import { createResultsPanel } from "./Panel";
import { vec2 } from "@Models/Geometry";
import * as io from "@PhaserIO";
import { getCurrentScene } from "@Models/State";

export function displayDefeat(
	state: ResultsUIState,
	livesChange: number,
	nextPhaseCallback: () => void
): void {
	const { panelX, panelY, panelWidth, panelHeight } = createResultsPanel(state);

	const scene = getCurrentScene();

	// Add title
	const titleText = "Defeat";
	const title = io.Text(titleText, c.titleTextConfig)
		.setColor("#F44336")
		.setOrigin(0.5)
		.setPosition(panelX + panelWidth / 2, panelY + 30);

	title.setDepth(1001);
	state.resultsContainer.add(title);

	// Add result message
	const messageText = "You have been defeated.\nBetter luck next time!";
	const message = scene.add
		.text(panelX + panelWidth / 2, panelY + 80, messageText, {
			...c.defaultTextConfig,
			fontSize: "16px",
			wordWrap: { width: panelWidth - 60 },
		})
		.setOrigin(0.5);
	message.setDepth(1001);
	state.resultsContainer.add(message);

	const livesText = `Lives: ${livesChange > 0 ? "+" : ""}${livesChange}`;
	const livesDisplay = scene.add
		.text(panelX + panelWidth / 2, panelY + 160, livesText, {
			...c.defaultTextConfig,
			fontSize: "22px",
			color: livesChange > 0 ? "#4CAF50" : "#F44336",
			fontStyle: "bold",
		})
		.setOrigin(0.5);
	livesDisplay.setDepth(1001);
	state.resultsContainer.add(livesDisplay);

	// Add next phase button
	const buttonX = panelX + panelWidth / 2;
	const buttonY = panelY + panelHeight - 60;
	const nextButton = createUIButton("Continue", vec2(buttonX, buttonY), async () => {
		await slideOut();
		nextPhaseCallback();
	});
	state.resultsContainer.add(nextButton.container);
}
