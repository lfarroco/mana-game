import * as c from "@Constants/constants";
import { getCurrentScene } from "@Models/State";
import { RESULTS_PANEL } from "./ResultsConfig";
import { Container } from "@PhaserIO";

let panelContainer: Container | null = null;
let panelBounds: {
	panelX: number;
	panelY: number;
	panelWidth: number;
	panelHeight: number;
} | null = null;

export function createPanel(): void {
	const scene = getCurrentScene();

	const backgroundOverlay = scene.add.rectangle(
		0,
		0,
		c.SCREEN_WIDTH,
		c.SCREEN_HEIGHT,
		RESULTS_PANEL.overlayColor,
		0
	);
	backgroundOverlay.setInteractive();

	const { width, height } = scene.cameras.main;
	const panelWidth = RESULTS_PANEL.width;
	const panelHeight = RESULTS_PANEL.height;
	const panelX = width / 2 - panelWidth / 2;
	const panelY = height / 2 - panelHeight / 2;

	const resultsBackground = scene.add
		.graphics()
		.fillStyle(RESULTS_PANEL.backgroundColor, RESULTS_PANEL.backgroundAlpha)
		.fillRoundedRect(0, 0, panelWidth, panelHeight, RESULTS_PANEL.borderRadius);

	panelContainer = Container([backgroundOverlay, resultsBackground]).setPosition(panelX, panelY);

	panelBounds = { panelX, panelY, panelWidth, panelHeight };
}

export function getPanelContainer(): Container {
	if (!panelContainer) {
		throw new Error("Panel container not initialized. Call createPanel() first.");
	}
	return panelContainer;
}

export function getPanelBounds(): {
	panelX: number;
	panelY: number;
	panelWidth: number;
	panelHeight: number;
} {
	if (!panelBounds) {
		throw new Error("Panel bounds not initialized. Call createPanel() first.");
	}
	return panelBounds;
}

export function clearPanel(): void {
	if (panelContainer) {
		panelContainer.removeAll(true);
		panelContainer.destroy();
		panelContainer = null;
	}
	panelBounds = null;
}
