import { scene } from "../BattlegroundScene";
import * as c from "../../../constants/constants";
import { ResultsUIState } from "./ResultsUI";

export function createResultsPanel(state: ResultsUIState): { panelX: number; panelY: number; panelWidth: number; panelHeight: number } {
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

	return { panelX, panelY, panelWidth, panelHeight };
}
