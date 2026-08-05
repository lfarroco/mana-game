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

export type ResultsContainer = {
	overlay: BackgroundOverlay.BackgroundOverlay;
	container: Container;
	destroy: () => void;
}

export function create(): ResultsContainer {

	const overlay = BackgroundOverlay.create({
		color: ResultsConfig.RESULTS_PANEL.overlayColor,
		alpha: ResultsConfig.RESULTS_PANEL.overlayAlpha,
		interactive: true,
	});

	const resultsContainer = env.scene.add.container(0, 0);

	resultsContainer.setY(RESULTS_CONTAINER_HIDDEN_Y);

	return {
		overlay,
		container: resultsContainer,
		destroy: () => {
			overlay.destroy();
			resultsContainer.destroy();
		},
	}
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

		const resultsUI = create();

		const livesChange = calculateLivesChange(resultType);
		const allBattleUnits = env.state.combatState?.units ?? [];

		// Temporary listeners — clean themselves up after first fire
		const unlistenContinue = BattlegroundEvent.combatContinueRequested.listen(async () => {
			unlistenContinue();
			unlistenReplay();
			await slideOut(resultsUI);
			resolve();
		});

		const unlistenReplay = BattlegroundEvent.combatReplayRequested.listen(async () => {
			unlistenContinue();
			unlistenReplay();
			await slideOut(resultsUI);
			resolve();
		});

		// Render the UI — its buttons will emit events, triggering the listeners above
		void displayAppropriateUI(
			resultType, livesChange, allBattleUnits)
			.then((uiContainer) => {
				resultsUI.container.add(uiContainer);
			});
	});
}

export async function displayGameCompleteResults(
	isGameOver: boolean,
) {
	const resultsUI = create();

	const ui = await GameCompleteUI.displayGameComplete(
		env.state.session.wins,
		env.state.session.team.units,
		isGameOver,
	);
	resultsUI.container.add(ui);

	return resultsUI;
}

export async function slideIn(resultsUI: ResultsContainer): Promise<void> {
	AudioManager.playSoundEffect("sfx_ui_modalwindow_swoosh_enter");

	resultsUI.overlay.fadeIn(300);

	await animation.tween({ targets: [resultsUI.container], y: 0 });

}

export async function slideOut(resultsUI: ResultsContainer): Promise<void> {
	AudioManager.playSoundEffect("sfx_ui_modalwindow_swoosh_exit");

	resultsUI.overlay.fadeOut(300);

	await animation.tween({ targets: [resultsUI.container], y: RESULTS_CONTAINER_HIDDEN_Y });

	resultsUI.container.removeAll(true);
	resultsUI.container.destroy()

}

/**
 * Slide the results container out WITHOUT destroying it.  The framework's
 * phase tracking will destroy the container + overlay after the exit transition
 * completes.  Used as the `exit` transition for victory/game_over phases.
 */
export async function slideOutOnly(resultsUI: ResultsContainer): Promise<void> {
	AudioManager.playSoundEffect("sfx_ui_modalwindow_swoosh_exit");

	resultsUI.overlay.fadeOut(300);

	await animation.tween({ targets: [resultsUI.container], y: RESULTS_CONTAINER_HIDDEN_Y });
}


