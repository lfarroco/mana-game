import { getState } from "@Models/State";
import { delay } from "../../../Utils/animation";
import { renderVignette } from "../Animations/vignette";
import * as AudioManager from "@Systems/AudioManager";
import { battleResultAnimation } from "../battleResultAnimation";
import * as PrestigeSystem from "@Systems/PrestigeSystem";
import * as MoraleDisplay from "../MoraleDisplay";
import { transitionToShopPhase, transitionToShopPhaseAfterDefeat } from "./ShopPhase";

const state = getState();

export async function handleCombatEndedDefeat(): Promise<void> {
	console.log("Round", state.gameData.round, "Processing Defeat...");

	AudioManager.playSoundEffect('sfx_victory_match');

	await delay(1000);
	await _fadeOutDisplayBars();
	battleResultAnimation("defeat")
	await delay(1500);

	PrestigeSystem.processDefeat();

	// Transition back to shop phase after defeat
	transitionToShopPhaseAfterDefeat();
}

export async function handlePlayerWonGame(): Promise<void> {
	console.log(`PLAYER HAS WON THE GAME! Prestige: ${state.gameData.player.prestige}, Total Rounds: ${state.gameData.player.round}`);


	renderVignette({
		message: `Victory! You reached Champion status in ${state.gameData.player.round
			} rounds!`
	});
}

export async function handleCombatEndedVictory(): Promise<void> {
	console.log("Round", state.gameData.round, "Processing Victory...");

	AudioManager.playSoundEffect('sfx_victory_reward_chant');

	await delay(1000);
	await _fadeOutDisplayBars();
	battleResultAnimation("victory");
	await delay(1500);

	transitionToShopPhase();
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
