import * as animation from "@Utils/animation";
import * as AudioManager from "@Systems/AudioManager";
import * as c from "@Constants";
import * as Constants from "@game/Constants";
import * as VictoryUI from "./VictoryUI";
import * as DefeatUI from "./DefeatUI";
import * as GameCompleteUI from "./GameCompleteUI";
import { Unit } from "@game/Models";
import * as ResultsConfig from "./ResultsConfig";
import * as BackgroundOverlay from "@Components/Overlay/BackgroundOverlay";
import * as Config from "@config";
import { ClientState } from "@Models/ClientState";

export function determineGameOutcome(
	resultType: "victory" | "defeat",
	currentWins: number,
	currentLives: number
): { gameWon: boolean; gameOver: boolean } {
	// In demo mode, treat reaching MAX_VICTORIES as "game won" to trigger demo complete screen
	const demoComplete = resultType === "victory" && currentWins >= Config.GAME_CONFIG.MAX_VICTORIES;
	const gameWon = resultType === "victory" && (currentWins === ResultsConfig.WINS_TO_WIN_GAME || demoComplete);
	const gameOver = resultType === "defeat" && currentLives <= 0;
	return { gameWon, gameOver };
}

const RESULTS_CONTAINER_HIDDEN_Y = c.SCREEN_HEIGHT * -1;

export let resultsContainer: Phaser.GameObjects.Container;
export let overlay: BackgroundOverlay.BackgroundOverlay;
export let isOpen: boolean;

export function create() {

	overlay = BackgroundOverlay.create({
		color: ResultsConfig.RESULTS_PANEL.overlayColor,
		alpha: ResultsConfig.RESULTS_PANEL.overlayAlpha,
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
		return VictoryUI.displayVictory(units, nextPhaseCallback, replayCallback);
	} else {
		return DefeatUI.displayDefeat(livesChange, units, nextPhaseCallback, replayCallback);
	}
}

export async function displayResults(
	clientState: ClientState,
	resultType: "victory" | "defeat",
	nextPhaseCallback: () => void,
	replayCallback?: () => void
): Promise<void> {
	resultsContainer.removeAll(true);
	io.scene.children.bringToTop(overlay.rectangle);
	io.scene.children.bringToTop(resultsContainer);

	const gameState = clientState;
	const postCombatSession = gameState.session;
	const player = {
		wins: postCombatSession?.wins ?? gameState.session.wins,
		lives: 4 - (postCombatSession?.losses ?? gameState.session.losses),
	};

	const livesChange = calculateLivesChange(resultType);
	const currentLives = player.lives;
	const currentWins = player.wins;

	const { gameWon, gameOver } = determineGameOutcome(resultType, currentWins, currentLives);

	const allBattleUnits = clientState.combatState?.units ?? [];

	const handleContinue = async () => {
		if (gameWon || gameOver) {
			resultsContainer.removeAll(true);
			const playerUnits = allBattleUnits.filter((u) => u.force === Constants.FORCE_ID_PLAYER);
			const ui = await GameCompleteUI.displayGameComplete(
				clientState,
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
	clientState: ClientState,
	isGameOver: boolean,
	nextPhaseCallback?: () => void,
	onComplete?: () => void
): Promise<void> {
	resultsContainer.removeAll(true);
	io.scene.children.bringToTop(overlay.rectangle);
	io.scene.children.bringToTop(resultsContainer);

	const ui = await GameCompleteUI.displayGameComplete(
		clientState,
		clientState.session.wins,
		clientState.session.team.units,
		isGameOver,
		nextPhaseCallback,
		onComplete
	);
	resultsContainer.add(ui);
}

export async function slideIn(): Promise<void> {
	AudioManager.playSoundEffect("sfx_ui_modalwindow_swoosh_enter");

	overlay.fadeIn(300);

	await animation.tween({ targets: [resultsContainer], y: 0 });

	isOpen = true;
}

export async function slideOut(): Promise<void> {
	AudioManager.playSoundEffect("sfx_ui_modalwindow_swoosh_exit");

	overlay.fadeOut(300);

	await animation.tween({ targets: [resultsContainer], y: RESULTS_CONTAINER_HIDDEN_Y });

	resultsContainer.removeAll(true);

	isOpen = false;
}

export function getIsResultsOpen(): boolean {
	return isOpen;
}
