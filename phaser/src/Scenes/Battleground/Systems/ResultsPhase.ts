import { getState } from "@Models/State";
import { delay } from "../../../Utils/animation";
import { renderVignette } from "../Animations/vignette";
import * as AudioManager from "@Systems/AudioManager";
import * as MoraleDisplay from "../MoraleDisplay";
import { transitionToShopPhase, transitionToShopPhaseAfterDefeat } from "./ShopPhase";
import * as ResultsUI from "../Results/ResultsUI";

export async function handleCombatEndedDefeat(): Promise<void> {
	const state = getState();
	console.log("Round", state.gameData.round, "Processing Defeat...");

	AudioManager.playSoundEffect('sfx_victory_match');

	await delay(1000);
	await _fadeOutDisplayBars();
	await delay(1500);

	// Show results panel instead of immediately transitioning
	ResultsUI.displayResults("defeat", () => {
		transitionToShopPhaseAfterDefeat();
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

	await delay(1000);
	await _fadeOutDisplayBars();
	await delay(1500);

	// Show results panel instead of immediately transitioning
	ResultsUI.displayResults("victory", () => {
		transitionToShopPhase();
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

async function _fadeOutDisplayBars(): Promise<void> {
	MoraleDisplay.fadeOutBars();
	await delay(500);
}
