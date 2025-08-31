import { scene } from "../BattlegroundScene";
import { tween } from "../../../Utils/animation";
import * as AudioManager from "@Systems/AudioManager";
import { createUIButton } from "../../../UI/UIButton";
import * as c from "../../../constants/constants";

export type ResultsUIState = {
	resultsContainer: Container;
	isOpen: boolean;
};

let state: ResultsUIState | null = null;

export function create() {
	state = {
		resultsContainer: scene.add.container(0, 0),
		isOpen: false,
	};

	state.resultsContainer.setY(c.SCREEN_HEIGHT * -1);

	return state;
}

export function displayResults(
	resultType: "victory" | "defeat",
	nextPhaseCallback: () => void
): void {
	if (!state) throw new Error("ResultsUI not initialized. Call create() first.");
	state.resultsContainer.removeAll(true);

	const screenWidth = scene.cameras.main.width;
	const panelX = screenWidth - 600 - 40; // Similar to shop panel width
	const panelY = 240;
	const panelWidth = 600;
	const panelHeight = 400;

	// Create background panel
	const resultsBackground = scene.add.graphics()
		.fillStyle(0x2c3e50, 0.95)
		.fillRoundedRect(panelX, panelY, panelWidth, panelHeight, 20);
	state.resultsContainer.add(resultsBackground);

	// Add title
	const titleText = resultType === "victory" ? "Victory!" : "Defeat";
	const title = scene.add.text(
		panelX + panelWidth / 2,
		panelY + 50,
		titleText,
		{
			...c.titleTextConfig,
			fontSize: "48px",
			color: resultType === "victory" ? "#4CAF50" : "#F44336"
		}
	).setOrigin(0.5);
	state.resultsContainer.add(title);

	// Add result message
	const messageText = resultType === "victory"
		? "Congratulations! You have won the battle."
		: "You have been defeated. Better luck next time!";
	const message = scene.add.text(
		panelX + panelWidth / 2,
		panelY + 150,
		messageText,
		{
			...c.defaultTextConfig,
			fontSize: "24px",
			wordWrap: { width: panelWidth - 80 }
		}
	).setOrigin(0.5);
	state.resultsContainer.add(message);

	// Add next phase button
	const buttonX = panelX + panelWidth / 2;
	const buttonY = panelY + panelHeight - 80;
	const nextButton = createUIButton(
		scene,
		"Continue",
		buttonX,
		buttonY,
		nextPhaseCallback
	);
	state.resultsContainer.add(nextButton);
}

export async function slideIn(): Promise<void> {
	if (!state) throw new Error("ResultsUI not initialized. Call create() first.");
	AudioManager.playSoundEffect('sfx_ui_modalwindow_swoosh_enter');
	scene.children.bringToTop(state.resultsContainer);
	await tween({ targets: [state.resultsContainer], y: 0 });
	state.isOpen = true;
}

export async function slideOut(): Promise<void> {
	if (!state) throw new Error("ResultsUI not initialized. Call create() first.");
	AudioManager.playSoundEffect('sfx_ui_modalwindow_swoosh_exit');
	await tween({ targets: [state.resultsContainer], y: c.SCREEN_HEIGHT * -1 });
	state.isOpen = false;
}

export function destroy(): void {
	if (!state) return;
	state.resultsContainer.destroy(true);
	state = null;
}

export function getIsResultsOpen(): boolean {
	return !!state?.isOpen;
}
