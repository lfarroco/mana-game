import { tween } from "@Utils/animation";
import * as AudioManager from "@Systems/AudioManager";
import * as c from "@Constants/constants";
import { getCurrentScene, getState } from "@Models/State";
import { displayVictory } from "./VictoryUI";
import { displayDefeat } from "./DefeatUI";
import { displayGameComplete } from "./GameCompleteUI";
import { Unit } from "@Models/Entities/Unit";
import { WINS_TO_WIN_GAME, RESULTS_PANEL } from "./ResultsConfig";

const RESULTS_CONTAINER_HIDDEN_Y = c.SCREEN_HEIGHT * -1;

export let resultsContainer: Phaser.GameObjects.Container;
export let backgroundOverlay: Phaser.GameObjects.Rectangle;
export let isOpen: boolean;

export function createResultsUI() {
	const scene = getCurrentScene();

	// Create background overlay first so it's behind the container
	backgroundOverlay = scene.add.rectangle(
		c.MIDDLE_SCREEN_X,
		c.MIDDLE_SCREEN_Y,
		c.SCREEN_WIDTH,
		c.SCREEN_HEIGHT,
		RESULTS_PANEL.overlayColor,
		RESULTS_PANEL.overlayAlpha
	);
	backgroundOverlay.setInteractive();
	backgroundOverlay.setAlpha(0);
	backgroundOverlay.setVisible(false);
	backgroundOverlay.setDepth(99); // Ensure it's high up but below the results container

	resultsContainer = scene.add.container(0, 0);
	resultsContainer.setDepth(100); // Ensure container is above overlay
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
	livesChange: number,
	nextPhaseCallback: () => void,
	newWins: number,
	units: Unit[]
): Promise<Phaser.GameObjects.Container> {
	if (resultType === "victory") {
		return displayVictory(newWins, units, nextPhaseCallback);
	} else {
		return displayDefeat(livesChange, units, nextPhaseCallback);
	}
}

export async function displayResults(
	resultType: "victory" | "defeat",
	nextPhaseCallback: () => void
): Promise<void> {
	resultsContainer.removeAll(true);
	const scene = getCurrentScene();
	scene.children.bringToTop(backgroundOverlay);
	scene.children.bringToTop(resultsContainer);

	const gameState = getState();
	const player = gameState.gameData.player;

	const livesChange = calculateLivesChange(resultType);
	const expectedNewLives = player.lives + livesChange;
	const newWins = resultType === "victory" ? player.wins + 1 : player.wins;

	const { gameWon, gameOver } = determineGameOutcome(resultType, newWins, expectedNewLives);

	// Get all units from the battle, not just player units
	const allBattleUnits = gameState.battleData.units;

	const handleContinue = async () => {
		if (gameWon || gameOver) {
			resultsContainer.removeAll(true);
			const ui = await displayGameComplete(newWins, allBattleUnits, gameOver, nextPhaseCallback);
			resultsContainer.add(ui);
		} else {
			await slideOut();
			nextPhaseCallback();
		}
	};

	const uiContainer = await displayAppropriateUI(resultType, livesChange, handleContinue, newWins, allBattleUnits);
	resultsContainer.add(uiContainer);
}

export async function slideIn(): Promise<void> {
	AudioManager.playSoundEffect("sfx_ui_modalwindow_swoosh_enter");

	const scene = getCurrentScene();
	backgroundOverlay.setVisible(true);
	scene.tweens.add({
		targets: backgroundOverlay,
		alpha: RESULTS_PANEL.overlayAlpha,
		duration: 300
	});

	await tween({ targets: [resultsContainer], y: 0 });

	isOpen = true;
}

export async function slideOut(): Promise<void> {
	AudioManager.playSoundEffect("sfx_ui_modalwindow_swoosh_exit");

	const scene = getCurrentScene();
	scene.tweens.add({
		targets: backgroundOverlay,
		alpha: 0,
		duration: 300,
		onComplete: () => {
			backgroundOverlay.setVisible(false);
		}
	});

	await tween({ targets: [resultsContainer], y: RESULTS_CONTAINER_HIDDEN_Y });

	resultsContainer.removeAll(true);

	isOpen = false;
}

export function getIsResultsOpen(): boolean {
	return isOpen;
}
