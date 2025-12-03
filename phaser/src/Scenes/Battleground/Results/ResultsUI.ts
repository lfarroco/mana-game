import { tween } from "@Utils/animation";
import * as AudioManager from "@Systems/AudioManager";
import * as c from "@Constants/constants";
import { getCurrentScene, getState } from "@Models/State";
import { displayVictory } from "./VictoryUI";
import { displayDefeat } from "./DefeatUI";
import { displayGameComplete } from "./GameCompleteUI";
import { Unit } from "@Models/Entities/Unit";
import { WINS_TO_WIN_GAME } from "./ResultsConfig";

const RESULTS_CONTAINER_HIDDEN_Y = c.SCREEN_HEIGHT * -1;

export let resultsContainer: Phaser.GameObjects.Container;
export let isOpen: boolean;

export function createResultsUI() {
	resultsContainer = getCurrentScene().add.container(0, 0);
	isOpen = false;

	resultsContainer.setY(RESULTS_CONTAINER_HIDDEN_Y);
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

async function displayAppropriateUI(
	resultType: "victory" | "defeat",
	gameWon: boolean,
	gameOver: boolean,
	livesChange: number,
	nextPhaseCallback: () => void,
	newWins: number,
	units: Unit[]
): Promise<Phaser.GameObjects.Container> {
	if (gameWon) {
		return await displayGameComplete(newWins, units, false, nextPhaseCallback);
	} else if (gameOver) {
		return await displayGameComplete(newWins, units, true, nextPhaseCallback);
	} else if (resultType === "victory") {
		return displayVictory(newWins, nextPhaseCallback);
	} else {
		return displayDefeat(livesChange, nextPhaseCallback);
	}
}

export async function displayResults(
	resultType: "victory" | "defeat",
	nextPhaseCallback: () => void
): Promise<void> {
	resultsContainer.removeAll(true);
	const scene = getCurrentScene();
	scene.children.bringToTop(resultsContainer);

	const gameState = getState();
	const player = gameState.gameData.player;

	const livesChange = calculateLivesChange(resultType);
	const expectedNewLives = player.lives + livesChange;
	const newWins = resultType === "victory" ? player.wins + 1 : player.wins;

	const { gameWon, gameOver } = determineGameOutcome(resultType, newWins, expectedNewLives);

	const uiContainer = await displayAppropriateUI(resultType, gameWon, gameOver, livesChange, nextPhaseCallback, newWins, player.units);
	resultsContainer.add(uiContainer);
}

export async function slideIn(): Promise<void> {
	AudioManager.playSoundEffect("sfx_ui_modalwindow_swoosh_enter");
	await tween({ targets: [resultsContainer], y: 0 });

	isOpen = true;
}

export async function slideOut(): Promise<void> {
	AudioManager.playSoundEffect("sfx_ui_modalwindow_swoosh_exit");
	await tween({ targets: [resultsContainer], y: RESULTS_CONTAINER_HIDDEN_Y });

	resultsContainer.removeAll(true);

	isOpen = false;
}

export function getIsResultsOpen(): boolean {
	return isOpen;
}
