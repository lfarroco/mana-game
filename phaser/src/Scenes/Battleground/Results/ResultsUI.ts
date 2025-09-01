import { scene } from "../BattlegroundScene";
import { tween } from "../../../Utils/animation";
import * as AudioManager from "@Systems/AudioManager";
import * as c from "../../../constants/constants";
import { getState } from "@Models/State";
import { displayGameOver } from "./GameOverUI";
import { displayGameWon } from "./GameWonUI";
import { displayVictory } from "./VictoryUI";
import { displayDefeat } from "./DefeatUI";

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

	const gameState = getState();

	const player = gameState.gameData.player;
	const currentPlayerRound = player.round;

	const displayGoldAmount = 5;

	const prestigeChange = resultType === "victory"
		? Math.max(Math.floor(currentPlayerRound / 2), 1)
		: (Math.max(0, player.prestige - currentPlayerRound) - player.prestige);

	const expectedNewPrestige = player.prestige + prestigeChange;
	const newWins = resultType === "victory" ? player.wins + 1 : player.wins;

	const WINS_TO_WIN_GAME = 2;

	const gameWon = (resultType === "victory" && newWins >= WINS_TO_WIN_GAME);
	const gameOver = (resultType === "defeat" && expectedNewPrestige <= 0);

	if (gameWon) {
		displayGameWon(state, displayGoldAmount, prestigeChange, nextPhaseCallback);
	} else if (gameOver) {
		displayGameOver(state, displayGoldAmount, prestigeChange, nextPhaseCallback);
	} else if (resultType === "victory") {
		displayVictory(state, displayGoldAmount, prestigeChange, nextPhaseCallback);
	} else {
		displayDefeat(state, displayGoldAmount, prestigeChange, nextPhaseCallback);
	}
}

export async function slideIn(): Promise<void> {
	if (!state) throw new Error("ResultsUI not initialized. Call create() first.");
	AudioManager.playSoundEffect('sfx_ui_modalwindow_swoosh_enter');

	if (state.backgroundOverlay) {
		state.backgroundOverlay.setVisible(true);
	}

	state.resultsContainer.setDepth(1002);
	await tween({ targets: [state.resultsContainer], y: 0 });
	state.isOpen = true;
}

export async function slideOut(): Promise<void> {
	if (!state) throw new Error("ResultsUI not initialized. Call create() first.");
	AudioManager.playSoundEffect('sfx_ui_modalwindow_swoosh_exit');
	await tween({ targets: [state.resultsContainer], y: c.SCREEN_HEIGHT * -1 });

	if (state.backgroundOverlay) {
		state.backgroundOverlay.setVisible(false);
	}

	state.isOpen = false;
}

export function destroy(): void {
	if (!state) return;

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
