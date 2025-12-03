import { tween } from "@Utils/animation";
import * as AudioManager from "@Systems/AudioManager";
import * as c from "@Constants/constants";
import { getCurrentScene, getState } from "@Models/State";
import { displayVictory } from "./VictoryUI";
import { displayDefeat } from "./DefeatUI";
import { displayGameComplete } from "./GameCompleteUI";
import { Unit } from "@Models/Entities/Unit";
import { WINS_TO_WIN_GAME, RESULTS_DEPTHS } from "./ResultsConfig";

const RESULTS_CONTAINER_HIDDEN_Y = c.SCREEN_HEIGHT * -1;

export type ResultsUIState = {
	resultsContainer: Phaser.GameObjects.Container;
	backgroundOverlay: Phaser.GameObjects.Rectangle | null;
	isOpen: boolean;
};

let state: ResultsUIState | null = null;

export function create() {
	state = {
		resultsContainer: getCurrentScene().add.container(0, 0),
		backgroundOverlay: null,
		isOpen: false,
	};

	state.resultsContainer.setY(RESULTS_CONTAINER_HIDDEN_Y);
	state.resultsContainer.setDepth(RESULTS_DEPTHS.container);
}

function calculateLivesChange(
	resultType: "victory" | "defeat"
): number {
	if (resultType === "victory") {
		return 0;
	} else {
		return -1;
	}
}

function determineGameOutcome(
	resultType: "victory" | "defeat",
	newWins: number,
	expectedNewLives: number
): { gameWon: boolean; gameOver: boolean } {
	const gameWon = resultType === "victory" && newWins === WINS_TO_WIN_GAME;
	const gameOver = resultType === "defeat" && expectedNewLives <= 0;
	return { gameWon, gameOver };
}

function displayAppropriateUI(
	state: ResultsUIState,
	resultType: "victory" | "defeat",
	gameWon: boolean,
	gameOver: boolean,
	livesChange: number,
	nextPhaseCallback: () => void,
	newWins: number,
	units: Unit[]
): void {
	if (gameWon) {
		displayGameComplete(state, newWins, units, false, nextPhaseCallback);
	} else if (gameOver) {
		displayGameComplete(state, newWins, units, true, nextPhaseCallback);
	} else if (resultType === "victory") {
		displayVictory(state, newWins, nextPhaseCallback);
	} else {
		displayDefeat(state, livesChange, nextPhaseCallback);
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

	const livesChange = calculateLivesChange(resultType);
	const expectedNewLives = player.lives + livesChange;
	const newWins = resultType === "victory" ? player.wins + 1 : player.wins;

	const { gameWon, gameOver } = determineGameOutcome(resultType, newWins, expectedNewLives);

	displayAppropriateUI(state, resultType, gameWon, gameOver, livesChange, nextPhaseCallback, newWins, player.units);
}

export async function slideIn(): Promise<void> {
	if (!state) throw new Error("ResultsUI not initialized. Call create() first.");
	AudioManager.playSoundEffect("sfx_ui_modalwindow_swoosh_enter");

	if (state.backgroundOverlay) {
		state.backgroundOverlay.setVisible(true);
	}

	state.resultsContainer.setDepth(RESULTS_DEPTHS.container);
	await tween({ targets: [state.resultsContainer], y: 0 });
	state.isOpen = true;
}

export async function slideOut(): Promise<void> {
	if (!state) throw new Error("ResultsUI not initialized. Call create() first.");
	AudioManager.playSoundEffect("sfx_ui_modalwindow_swoosh_exit");
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
