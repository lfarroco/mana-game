import { scene } from "../BattlegroundScene";
import { createUIButton } from "../../../Components/UIButton";
import * as c from "@Constants/constants";
import { slideOut, ResultsUIState } from "./ResultsUI";
import { createResultsPanel } from "./Panel";
import { vec2 } from "@Models/Geometry";
import { resetState } from "@Models/State";
import { startGame } from "../../../Game/effects/startGame";

export function displayGameOver(
	state: ResultsUIState,
	nextPhaseCallback: () => void
): void {
	const { panelX, panelY, panelWidth, panelHeight } = createResultsPanel(state);

	// Add title
	const titleText = "Game Over!";
	const title = scene.add
		.text(panelX + panelWidth / 2, panelY + 50, titleText, {
			...c.titleTextConfig,
			fontSize: "48px",
			color: "#F44336",
		})
		.setOrigin(0.5);
	title.setDepth(1001);
	state.resultsContainer.add(title);

	// Add result message
	const messageText = "You have been defeated. Good luck next time!";
	const message = scene.add
		.text(panelX + panelWidth / 2, panelY + 120, messageText, {
			...c.defaultTextConfig,
			fontSize: "20px",
			wordWrap: { width: panelWidth - 80 },
		})
		.setOrigin(0.5);
	message.setDepth(1001);
	state.resultsContainer.add(message);

	const newRunButton = createUIButton(
		"New Run",
		vec2(panelX + panelWidth / 2, panelY + panelHeight - 180),
		async () => {
			resetState();
			startGame();
		}
	);
	state.resultsContainer.add(newRunButton.container);

	const mainMenuButton = createUIButton(
		"Main Menu",
		vec2(panelX + panelWidth / 2, panelY + panelHeight - 80),
		async () => {
			await slideOut();
			nextPhaseCallback();
		}
	);
	state.resultsContainer.add(mainMenuButton.container);
}
