import { scene } from "../BattlegroundScene";
import { tween } from "../../../Utils/animation";
import * as AudioManager from "@Systems/AudioManager";
import * as c from "../../../constants/constants";
import { getState } from "@Models/State";
import { displayGameOver } from "./GameOverUI";
import { displayGameWon } from "./GameWonUI";
import { displayVictory } from "./VictoryUI";
import { displayDefeat } from "./DefeatUI";

const GOLD_REWARD_AMOUNT = 5;
const WINS_TO_WIN_GAME = 2;
const RESULTS_CONTAINER_DEPTH = 1002;
const RESULTS_CONTAINER_HIDDEN_Y = c.SCREEN_HEIGHT * -1;

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

	state.resultsContainer.setY(RESULTS_CONTAINER_HIDDEN_Y);
	state.resultsContainer.setDepth(RESULTS_CONTAINER_DEPTH);
}

function calculatePrestigeChange(resultType: "victory" | "defeat", currentPlayerRound: number, currentPrestige: number): number {
	if (resultType === "victory") {
		return Math.max(Math.floor(currentPlayerRound / 2), 1);
	} else {
		return Math.max(0, currentPrestige - currentPlayerRound) - currentPrestige;
	}
}

function determineGameOutcome(resultType: "victory" | "defeat", newWins: number, expectedNewPrestige: number): { gameWon: boolean; gameOver: boolean } {
	const gameWon = (resultType === "victory" && newWins >= WINS_TO_WIN_GAME);
	const gameOver = (resultType === "defeat" && expectedNewPrestige <= 0);
	return { gameWon, gameOver };
}

function displayAppropriateUI(
	state: ResultsUIState,
	resultType: "victory" | "defeat",
	gameWon: boolean,
	gameOver: boolean,
	displayGoldAmount: number,
	prestigeChange: number,
	nextPhaseCallback: () => void
): void {
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

export function displayResults(
	resultType: "victory" | "defeat",
	nextPhaseCallback: () => void
): void {
	if (!state) throw new Error("ResultsUI not initialized. Call create() first.");
	state.resultsContainer.removeAll(true);

	const gameState = getState();
	const player = gameState.gameData.player;
	const currentPlayerRound = player.round;

	const prestigeChange = calculatePrestigeChange(resultType, currentPlayerRound, player.prestige);
	const expectedNewPrestige = player.prestige + prestigeChange;
	const newWins = resultType === "victory" ? player.wins + 1 : player.wins;

	const { gameWon, gameOver } = determineGameOutcome(resultType, newWins, expectedNewPrestige);

	displayAppropriateUI(state, resultType, gameWon, gameOver, GOLD_REWARD_AMOUNT, prestigeChange, nextPhaseCallback);
}

export async function slideIn(): Promise<void> {
	if (!state) throw new Error("ResultsUI not initialized. Call create() first.");
	AudioManager.playSoundEffect('sfx_ui_modalwindow_swoosh_enter');

	if (state.backgroundOverlay) {
		state.backgroundOverlay.setVisible(true);
	}

	state.resultsContainer.setDepth(RESULTS_CONTAINER_DEPTH);
	await tween({ targets: [state.resultsContainer], y: 0 });
	state.isOpen = true;
}

export async function slideOut(): Promise<void> {
	if (!state) throw new Error("ResultsUI not initialized. Call create() first.");
	AudioManager.playSoundEffect('sfx_ui_modalwindow_swoosh_exit');
	await tween({ targets: [state.resultsContainer], y: RESULTS_CONTAINER_HIDDEN_Y });

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
