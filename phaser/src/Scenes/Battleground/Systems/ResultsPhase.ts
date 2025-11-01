import { getState } from "@Models/State";
import { delay } from "@Utils/animation";
import { renderVignette } from "../Animations/vignette";
import * as AudioManager from "@Systems/AudioManager";
import * as ResultsUI from "../Results/ResultsUI";
import * as PrestigeSystem from "@Systems/PrestigeSystem";
import * as PhaseManager from "../PhaseManager";

export async function handleCombatEndedDefeat(): Promise<void> {
	const state = getState();
	console.log("Round", state.gameData.round, "Processing Defeat...");

	AudioManager.playSoundEffect('sfx_victory_match');

	await delay(1000);
	await delay(1500);

	// Show results panel instead of immediately transitioning
	ResultsUI.displayResults("defeat", () => {
		handleDefeat();
	});
	await ResultsUI.slideIn();
}

export async function handlePlayerWonGame(): Promise<void> {
	const state = getState();
	console.log(`PLAYER HAS WON THE GAME! Prestige: ${state.gameData.player.prestige}, Total Rounds: ${state.gameData.player.round}`);


	renderVignette({
		message: `Victory! You reached Champion status in ${state.gameData.player.round
			} rounds!`
	});
}

export async function handleCombatEndedVictory(): Promise<void> {
	const state = getState();
	console.log("Round", state.gameData.round, "Processing Victory...");

	AudioManager.playSoundEffect('sfx_victory_reward_chant');

	await delay(1500);

	// Show results panel instead of immediately transitioning
	ResultsUI.displayResults("victory", () => {
		handleVictory();
	});
	await ResultsUI.slideIn();
}

export function handleCombatEnded(combatResult: string) {
	if (combatResult === "player_won") {
		handleCombatEndedVictory();
	} else {
		handleCombatEndedDefeat();
	}
}

async function handleVictory(): Promise<void> {

	PrestigeSystem.processVictory();
	PrestigeSystem.finalizeRound();

	const state = getState();
	console.log("Round", state.gameData.round, "Shop Phase Starting (Victory Transition).");

	await PhaseManager.resetBoard(true);
	PhaseManager.handlePhaseEnded();
}

async function handleDefeat(): Promise<void> {

	PrestigeSystem.processDefeat();
	PrestigeSystem.finalizeRound();

	const state = getState();
	console.log("Round", state.gameData.round, "Shop Phase Starting (After Defeat).");

	const player = state.gameData.player;
	if (player.prestige <= 0) {
		await renderVignette({ message: `Game Over! You were defeated in ${player.round} rounds` });
		return;
	}

	await PhaseManager.resetBoard(true);
	PhaseManager.handlePhaseEnded();

}

