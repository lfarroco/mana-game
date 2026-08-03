import * as animation from "@Utils/animation";
import * as AudioManager from "@Systems/AudioManager";
import * as c from "@Constants";
import * as VictoryUI from "./VictoryUI";
import * as DefeatUI from "./DefeatUI";
import * as GameCompleteUI from "./GameCompleteUI";
import { Unit } from "@game/Models";
import * as ResultsConfig from "./ResultsConfig";
import * as BackgroundOverlay from "@Components/Overlay/BackgroundOverlay";
import { env } from "@Env";
import { BattlegroundEvent } from "../../../../Events";

const RESULTS_CONTAINER_HIDDEN_Y = c.SCREEN_HEIGHT * -1;

let resultsContainer: Phaser.GameObjects.Container;
let overlay: BackgroundOverlay.BackgroundOverlay;
let isOpen: boolean;

export function create() {

	overlay = BackgroundOverlay.create({
		color: ResultsConfig.RESULTS_PANEL.overlayColor,
		alpha: ResultsConfig.RESULTS_PANEL.overlayAlpha,
		interactive: true,
	});

	resultsContainer = env.scene.add.container(0, 0);
	isOpen = false;

	resultsContainer.setY(RESULTS_CONTAINER_HIDDEN_Y);

	return [overlay, resultsContainer]
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
	units: Unit[],
): Promise<Phaser.GameObjects.Container> {
	if (resultType === "victory") {
		return VictoryUI.displayVictory(units);
	} else {
		return DefeatUI.displayDefeat(livesChange, units);
	}
}

export async function displayResults(
	resultType: "victory" | "defeat",
): Promise<void> {
	return new Promise<void>((resolve) => {
		resultsContainer.removeAll(true);
		env.scene.children.bringToTop(overlay.rectangle);
		env.scene.children.bringToTop(resultsContainer);

		const livesChange = calculateLivesChange(resultType);
		const allBattleUnits = env.state.combatState?.units ?? [];

		// Temporary listeners — clean themselves up after first fire
		const unlistenContinue = BattlegroundEvent.combatContinueRequested.listen(async () => {
			unlistenContinue();
			unlistenReplay();
			await slideOut();
			resolve();
		});

		const unlistenReplay = BattlegroundEvent.combatReplayRequested.listen(async () => {
			unlistenContinue();
			unlistenReplay();
			await slideOut();
			resolve();
		});

		// Render the UI — its buttons will emit events, triggering the listeners above
		void displayAppropriateUI(
			resultType, livesChange, allBattleUnits)
			.then((uiContainer) => { resultsContainer.add(uiContainer); });
	});
}

export async function displayGameCompleteResults(
	isGameOver: boolean,
	onComplete?: () => void
) {
	resultsContainer.removeAll(true);
	env.scene.children.bringToTop(overlay.rectangle);
	env.scene.children.bringToTop(resultsContainer);

	const ui = await GameCompleteUI.displayGameComplete(
		env.state.session.wins,
		env.state.session.team.units,
		isGameOver,
		onComplete
	);
	resultsContainer.add(ui);

	return [resultsContainer];
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
