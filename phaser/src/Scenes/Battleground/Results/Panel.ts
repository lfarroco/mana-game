import * as c from "@Constants/constants";
import { ResultsUIState } from "./ResultsUI";
import { getCurrentScene } from "@Models/State";
import { RESULTS_PANEL, RESULTS_DEPTHS } from "./ResultsConfig";

export function createResultsPanel(state: ResultsUIState): {
	panelX: number;
	panelY: number;
	panelWidth: number;
	panelHeight: number;
} {
	const scene = getCurrentScene();
	if (state.backgroundOverlay) {
		state.backgroundOverlay.destroy();
	}
	state.backgroundOverlay = scene.add.rectangle(
		c.SCREEN_WIDTH / 2,
		c.SCREEN_HEIGHT / 2,
		c.SCREEN_WIDTH,
		c.SCREEN_HEIGHT,
		RESULTS_PANEL.overlayColor,
		0
	);
	state.backgroundOverlay.setInteractive();
	state.backgroundOverlay.setDepth(RESULTS_DEPTHS.overlay);

	const { width, height } = scene.cameras.main;
	const panelWidth = RESULTS_PANEL.width;
	const panelHeight = RESULTS_PANEL.height;
	const panelX = width / 2 - panelWidth / 2;
	const panelY = height / 2 - panelHeight / 2;

	const resultsBackground = scene.add
		.graphics()
		.fillStyle(RESULTS_PANEL.backgroundColor, RESULTS_PANEL.backgroundAlpha)
		.fillRoundedRect(panelX, panelY, panelWidth, panelHeight, RESULTS_PANEL.borderRadius);
	resultsBackground.setDepth(RESULTS_DEPTHS.panel);
	state.resultsContainer.add(resultsBackground);

	return { panelX, panelY, panelWidth, panelHeight };
}
