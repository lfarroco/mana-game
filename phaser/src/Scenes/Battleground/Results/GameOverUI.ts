import { scene } from "../BattlegroundScene";
import { createUIButton } from "../../../UI/UIButton";
import * as c from "../../../constants/constants";
import { slideOut, ResultsUIState } from "./ResultsUI";

export function displayGameOver(
	state: ResultsUIState,
	goldReward: number,
	prestigeChange: number,
	nextPhaseCallback: () => void
): void {
	// Create background overlay to block interactions
	if (state.backgroundOverlay) {
		state.backgroundOverlay.destroy();
	}
	state.backgroundOverlay = scene.add.rectangle(
		c.SCREEN_WIDTH / 2,
		c.SCREEN_HEIGHT / 2,
		c.SCREEN_WIDTH,
		c.SCREEN_HEIGHT,
		0x000000,
		0
	);
	state.backgroundOverlay.setInteractive();
	state.backgroundOverlay.setDepth(1000);

	const screenWidth = scene.cameras.main.width;
	const panelX = screenWidth - 600 - 40;
	const panelY = 240;
	const panelWidth = 600;
	const panelHeight = 500;

	// Create background panel
	const resultsBackground = scene.add.graphics()
		.fillStyle(0x2c3e50, 0.95)
		.fillRoundedRect(panelX, panelY, panelWidth, panelHeight, 20);
	resultsBackground.setDepth(1001);
	state.resultsContainer.add(resultsBackground);

	// Add title
	const titleText = "Game Over!";
	const title = scene.add.text(
		panelX + panelWidth / 2,
		panelY + 50,
		titleText,
		{
			...c.titleTextConfig,
			fontSize: "48px",
			color: "#F44336"
		}
	).setOrigin(0.5);
	title.setDepth(1001);
	state.resultsContainer.add(title);

	// Add result message
	const messageText = "You have been defeated and lost the game.";
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

	// Add gold reward info
	const goldText = `Gold: +${goldReward}`;
	const goldDisplay = scene.add.text(
		panelX + panelWidth / 2,
		panelY + 180,
		goldText,
		{
			...c.defaultTextConfig,
			fontSize: "28px",
			color: "#FFD700",
			fontStyle: "bold"
		}
	).setOrigin(0.5);
	goldDisplay.setDepth(1001);
	state.resultsContainer.add(goldDisplay);

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
		scene,
		"Finish",
		buttonX,
		buttonY,
		async () => {
			await slideOut();
			nextPhaseCallback();
		}
	);
	state.resultsContainer.add(nextButton);
}
