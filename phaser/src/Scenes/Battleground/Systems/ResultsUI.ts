import { scene } from "../BattlegroundScene";
import { tween } from "../../../Utils/animation";
import * as AudioManager from "@Systems/AudioManager";
import { createUIButton } from "../../../UI/UIButton";
import * as c from "../../../constants/constants";
import { getState } from "@Models/State";

export type ResultsUIState = {
	resultsContainer: Container;
	backgroundOverlay: Phaser.GameObjects.Rectangle | null;
	isOpen: boolean;
};

let state: ResultsUIState | null = null;

export function create() {
	state = {
		resultsContainer: scene.add.container(0, 0),
		backgroundOverlay: null,
		isOpen: false,
	};

	state.resultsContainer.setY(c.SCREEN_HEIGHT * -1);
	state.resultsContainer.setDepth(1002);

	return state;
};

export function displayResults(
	resultType: "victory" | "defeat",
	nextPhaseCallback: () => void
): void {
	if (!state) throw new Error("ResultsUI not initialized. Call create() first.");
	state.resultsContainer.removeAll(true);

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
		0 // Invisible but still blocks interactions
	);
	state.backgroundOverlay.setInteractive();
	state.backgroundOverlay.setDepth(1000); // High depth to be above game elements

	const gameState = getState();

	// NOTE: prestige/win calculations must mirror PrestigeSystem.processVictory/processDefeat
	// Use the player's round (player.round) because PrestigeSystem uses that field.
	const player = gameState.gameData.player;
	const currentPlayerRound = player.round;

	// Calculate rewards/penalties (keep gold reward same as battlegroundConstants VICTORY_GOLD_REWARD)
	const goldReward = resultType === "victory" ? 5 : 0;

	// Match PrestigeSystem logic exactly so the UI preview equals the state change.
	const prestigeChange = resultType === "victory"
		? Math.max(Math.floor(currentPlayerRound / 2), 1)
		: (Math.max(0, player.prestige - currentPlayerRound) - player.prestige); // negative or zero

	const expectedNewPrestige = player.prestige + prestigeChange;
	const newWins = resultType === "victory" ? player.wins + 1 : player.wins;

	// Localised win threshold (keeps behaviour identical to previous hard-coded 10)
	const WINS_TO_WIN_GAME = 2;

	const gameWon = (resultType === "victory" && newWins >= WINS_TO_WIN_GAME);
	const gameOver = (resultType === "defeat" && expectedNewPrestige <= 0);

	const screenWidth = scene.cameras.main.width;
	const panelX = screenWidth - 600 - 40;
	const panelY = 240;
	const panelWidth = 600;
	const panelHeight = 500; // Increased height to accommodate new info

	// Create background panel
	const resultsBackground = scene.add.graphics()
		.fillStyle(0x2c3e50, 0.95)
		.fillRoundedRect(panelX, panelY, panelWidth, panelHeight, 20);
	resultsBackground.setDepth(1001); // Above background overlay
	state.resultsContainer.add(resultsBackground);

	// Add title
	const titleText = gameWon ? "You Win the Game!" : (gameOver ? "Game Over!" : (resultType === "victory" ? "Victory!" : "Defeat"));
	const title = scene.add.text(
		panelX + panelWidth / 2,
		panelY + 50,
		titleText,
		{
			...c.titleTextConfig,
			fontSize: "48px",
			color: gameWon ? "#FFD700" : (gameOver ? "#F44336" : (resultType === "victory" ? "#4CAF50" : "#F44336"))
		}
	).setOrigin(0.5);
	title.setDepth(1001);
	state.resultsContainer.add(title);

	// Add result message
	const messageText = gameWon
		? "Congratulations! You have won the game."
		: (gameOver
			? "You have been defeated and lost the game."
			: (resultType === "victory"
				? "Congratulations! You have won the battle."
				: "You have been defeated. Better luck next time!"));
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
		(gameWon || gameOver) ? "Finish" : "Continue",
		buttonX,
		buttonY,
		async () => {
			await slideOut();
			nextPhaseCallback();
		}
	);
	state.resultsContainer.add(nextButton);
}

export async function slideIn(): Promise<void> {
	if (!state) throw new Error("ResultsUI not initialized. Call create() first.");
	AudioManager.playSoundEffect('sfx_ui_modalwindow_swoosh_enter');

	// Bring background overlay to top
	if (state.backgroundOverlay) {
		state.backgroundOverlay.setVisible(true);
	}

	// Bring results container to top
	state.resultsContainer.setDepth(1002);
	await tween({ targets: [state.resultsContainer], y: 0 });
	state.isOpen = true;
}

export async function slideOut(): Promise<void> {
	if (!state) throw new Error("ResultsUI not initialized. Call create() first.");
	AudioManager.playSoundEffect('sfx_ui_modalwindow_swoosh_exit');
	await tween({ targets: [state.resultsContainer], y: c.SCREEN_HEIGHT * -1 });

	// Hide background overlay
	if (state.backgroundOverlay) {
		state.backgroundOverlay.setVisible(false);
	}

	state.isOpen = false;
}

export function destroy(): void {
	if (!state) return;

	// Destroy background overlay
	if (state.backgroundOverlay) {
		state.backgroundOverlay.destroy();
		state.backgroundOverlay = null;
	}

	state.resultsContainer.destroy(true);
	state = null;
}

export function getIsResultsOpen(): boolean {
	return !!state?.isOpen;
}
