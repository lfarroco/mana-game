import { scene } from "../BattlegroundScene";
import { createUIButton } from "../../../Components/UIButton";
import * as c from "@Constants/constants";
import { ResultsUIState } from "./ResultsUI";
import { createResultsPanel } from "./Panel";
import { vec2 } from "@Models/Geometry";
import { getCurrentScene, resetState } from "@Models/State";
import { startGame } from "../../../Game/effects/startGame";

export function displayGameOver(
	state: ResultsUIState,
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
		"NEW RUN",
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

			resetState();
			getCurrentScene().game.scene.start(c.SCENE_KEYS.TITLE);
		}
	);
	state.resultsContainer.add(mainMenuButton.container);
}
