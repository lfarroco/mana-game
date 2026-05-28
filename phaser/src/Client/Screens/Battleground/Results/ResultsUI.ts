import { tween } from "@Utils/animation";
import * as AudioManager from "@Systems/AudioManager";
import * as c from "@Constants/constants";
import { State } from "@Models/State";
import { displayVictory } from "Client/Screens/Battleground/Results/VictoryUI";
import { displayDefeat } from "Client/Screens/Battleground/Results/DefeatUI";
import { displayGameComplete } from "Client/Screens/Battleground/Results/GameCompleteUI";
import { Unit } from "@Models/Entities/Unit";
import { RESULTS_PANEL } from "Client/Screens/Battleground/Results/ResultsConfig";
import { createBackgroundOverlay, BackgroundOverlay } from "@Components/BackgroundOverlay";
import { determineGameOutcome } from "Client/Screens/Battleground/Results/ResultsOutcome";

const RESULTS_CONTAINER_HIDDEN_Y = c.SCREEN_HEIGHT * -1;

export let resultsContainer: Phaser.GameObjects.Container;
export let overlay: BackgroundOverlay;
export let isOpen: boolean;

export function createResultsUI() {

	overlay = createBackgroundOverlay({
		color: RESULTS_PANEL.overlayColor,
		alpha: RESULTS_PANEL.overlayAlpha,
		interactive: true,
	});

	resultsContainer = io.scene.add.container(0, 0);
	isOpen = false;

	resultsContainer.setY(RESULTS_CONTAINER_HIDDEN_Y);
}

function calculateLivesChange(resultType: "victory" | "defeat"): number {
	if (resultType === "victory") {
		return 0;
	} else {
		return -1;
	}
}

async function displayAppropriateUI(
	resultType: "victory" | "defeat",
	livesChange: number,
	nextPhaseCallback: () => void,
	units: Unit[],
	replayCallback?: () => void
): Promise<Phaser.GameObjects.Container> {
	if (resultType === "victory") {
		return displayVictory(units, nextPhaseCallback, replayCallback);
	} else {
		return displayDefeat(livesChange, units, nextPhaseCallback, replayCallback);
	}
}

export async function displayResults(
	state: State,
	resultType: "victory" | "defeat",
	nextPhaseCallback: () => void,
	replayCallback?: () => void
): Promise<void> {
	resultsContainer.removeAll(true);
	io.scene.children.bringToTop(overlay.rectangle);
	io.scene.children.bringToTop(resultsContainer);

	const gameState = state;
	const postCombatSession = gameState.session.combatState?.nextSession;
	const player = {
		wins: postCombatSession?.wins ?? gameState.session.wins,
		lives: 4 - (postCombatSession?.losses ?? gameState.session.losses),
	};

	const livesChange = calculateLivesChange(resultType);
	const currentLives = player.lives;
	const currentWins = player.wins;

	const { gameWon, gameOver } = determineGameOutcome(resultType, currentWins, currentLives);

	const allBattleUnits = gameState.battleData.units;

	const handleContinue = async () => {
		if (gameWon || gameOver) {
			resultsContainer.removeAll(true);
			const playerUnits = allBattleUnits.filter((u) => u.force === c.FORCE_ID_PLAYER);
			const ui = await displayGameComplete(
				state,
				currentWins,
				playerUnits,
				gameOver,
				nextPhaseCallback
			);
			resultsContainer.add(ui);
		} else {
			await slideOut();
			nextPhaseCallback();
		}
	};

	const handleReplay = async () => {
		await slideOut();
		if (replayCallback) replayCallback();
	};

	const uiContainer = await displayAppropriateUI(
		resultType,
		livesChange,
		handleContinue,
		allBattleUnits,
		replayCallback ? handleReplay : undefined
	);
	resultsContainer.add(uiContainer);
}

export async function displayGameCompleteResults(
	state: State,
	isGameOver: boolean,
	nextPhaseCallback?: () => void,
	onComplete?: () => void
): Promise<void> {
	resultsContainer.removeAll(true);
	io.scene.children.bringToTop(overlay.rectangle);
	io.scene.children.bringToTop(resultsContainer);

	const ui = await displayGameComplete(
		state,
		state.session.wins,
		state.session.team.units,
		isGameOver,
		nextPhaseCallback,
		onComplete
	);
	resultsContainer.add(ui);
}

export async function slideIn(): Promise<void> {
	AudioManager.playSoundEffect("sfx_ui_modalwindow_swoosh_enter");

	overlay.fadeIn(300);

	await tween({ targets: [resultsContainer], y: 0 });

	isOpen = true;
}

export async function slideOut(): Promise<void> {
	AudioManager.playSoundEffect("sfx_ui_modalwindow_swoosh_exit");

	overlay.fadeOut(300);

	await tween({ targets: [resultsContainer], y: RESULTS_CONTAINER_HIDDEN_Y });

	resultsContainer.removeAll(true);

	isOpen = false;
}

export function getIsResultsOpen(): boolean {
	return isOpen;
}
