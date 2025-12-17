import { getState, getCurrentScene } from "@Models/State";
import { delay } from "@Utils/animation";
import * as AudioManager from "@Systems/AudioManager";
import * as ResultsUI from "../Results/ResultsUI";
import * as PrestigeSystem from "@Systems/PrestigeSystem";
import * as PhaseManager from "../PhaseManager";
import { deactivateBlackHole } from "../BlackHole";
import { saveGameData } from "../../../Game/effects/saveGameData";
import { deleteSavedData } from "../../../Game/effects/deleteSavedData";
import * as StatsStore from "@Models/StatsStore";
import * as c from "@Constants/constants";
import { getName } from "@i18n/i18n";

export async function handleCombatEndedDefeat(): Promise<void> {
	const state = getState();
	console.log("Round", state.gameData.round, "Processing Defeat...");

	AudioManager.playSoundEffect("sfx_victory_match");

	await delay(300);

	ResultsUI.displayResults("defeat", async () => {
		await handleDefeat();
	});
	PrestigeSystem.processDefeat();
	await ResultsUI.slideIn();
}

export async function handleCombatEndedVictory(): Promise<void> {
	const state = getState();
	console.log("Round", state.gameData.round, "Processing Victory...");

	AudioManager.playSoundEffect("sfx_victory_reward_chant");

	await delay(300);

	ResultsUI.displayResults("victory", async () => {
		await handleVictory();
	});
	PrestigeSystem.processVictory();
	await ResultsUI.slideIn();
}

export function handleCombatEnded(combatResult: string) {
	deactivateBlackHole();

	// Track unit usage and most powerful unit from battle data (buffs still active)
	const state = getState();
	const playerUnits = state.battleData.units.filter(u => u.force === c.FORCE_ID_PLAYER && !u.isCore);
	for (const unit of playerUnits) {
		StatsStore.recordUnitUsage(getName(unit.cardId));
		StatsStore.checkMostPowerfulUnit(getName(unit.cardId), unit.power);
	}
	StatsStore.save();

	if (combatResult === "player_won") {
		handleCombatEndedVictory();
	} else {
		handleCombatEndedDefeat();
	}
}

async function handleVictory(): Promise<void> {
	PrestigeSystem.finalizeRound();

	const state = getState();
	console.log("Round", state.gameData.round, "Shop Phase Starting (Victory Transition).");

	saveGameData();

	await PhaseManager.resetBoard(true);
	PhaseManager.handlePhaseEnded();
}

async function handleDefeat(): Promise<void> {
	PrestigeSystem.finalizeRound();

	const state = getState();
	console.log("Round", state.gameData.round, "Shop Phase Starting (After Defeat).");

	const player = state.gameData.player;
	if (player.lives <= 0) {
		deleteSavedData();

		const { displayGameComplete } = await import("../Results/GameCompleteUI");
		const container = await displayGameComplete(player.wins, player.units, true);
		getCurrentScene().add.existing(container);
		return;
	}

	saveGameData();

	await PhaseManager.resetBoard(true);
	PhaseManager.handlePhaseEnded();
}
