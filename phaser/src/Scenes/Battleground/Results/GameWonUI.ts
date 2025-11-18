import { scene } from "../BattlegroundScene";
import { createUIButton } from "../../../Components/UIButton";
import * as c from "@Constants/constants";
import { slideOut, ResultsUIState } from "./ResultsUI";
import { createResultsPanel } from "./Panel";
import { vec2 } from "@Models/Geometry";
import { startGame } from "../../../Game/effects/startGame";
import { getCurrentScene, resetState } from "@Models/State";

export function displayGameWon(
	state: ResultsUIState,
	prestigeChange: number,
	nextPhaseCallback: () => void
): void {
	const { panelX, panelY, panelWidth, panelHeight } = createResultsPanel(state);

	// Add title
	const titleText = "You Win the Game!";
	const title = scene.add.text(
		panelX + panelWidth / 2,
		panelY + 50,
		titleText,
		{
			...c.titleTextConfig,
			fontSize: "48px",
			color: "#FFD700"
		}
	).setOrigin(0.5);
	title.setDepth(1001);
	state.resultsContainer.add(title);

	// Add result message
	const messageText = "Congratulations! You have won the game.";
	const message = scene.add.text(
		panelX + panelWidth / 2,
		panelY + 120,
		messageText,
		{
			...c.defaultTextConfig,
			fontSize: "20px",
			wordWrap: { width: panelWidth - 80 }
		}
	).setOrigin(0.5);
	message.setDepth(1001);
	state.resultsContainer.add(message);

	// Add prestige info
	const prestigeText = `Prestige: ${prestigeChange > 0 ? '+' : ''}${prestigeChange}`;
	const prestigeDisplay = scene.add.text(
		panelX + panelWidth / 2,
		panelY + 230,
		prestigeText,
		{
			...c.defaultTextConfig,
			fontSize: "28px",
			color: prestigeChange > 0 ? "#4CAF50" : "#F44336",
			fontStyle: "bold"
		}
	).setOrigin(0.5);
	prestigeDisplay.setDepth(1001);
	state.resultsContainer.add(prestigeDisplay);

	// Add next phase button
	const buttonX = panelX + panelWidth / 2;
	const buttonY = panelY + panelHeight - 80;
	const nextButton = createUIButton(
		"Continue (Endless)",
		vec2(buttonX, buttonY),
		async () => {
			await slideOut();
			nextPhaseCallback();
		}
	);
	state.resultsContainer.add(nextButton.container);

	// New Run Button
	const newRunButton = createUIButton(
		"New Run",
		vec2(
			panelX + panelWidth / 2,
			panelY + panelHeight - 180,
		),
		async () => {
			resetState();
			startGame();
		}
	);

	state.resultsContainer.add(newRunButton.container);

	// Main Menu Button
	const mainMenuButton = createUIButton(
		"Main Menu",
		vec2(panelX + panelWidth / 2, panelY + panelHeight - 280),
		async () => {

			getCurrentScene().game.scene.start(c.SCENE_KEYS.TITLE);
			resetState();
		}
	);

	state.resultsContainer.add(mainMenuButton.container);
}
