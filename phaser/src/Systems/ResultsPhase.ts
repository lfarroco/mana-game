import { State, getCurrentScene } from "@Models/State";
import { delay } from "@Utils/animation";
import * as AudioManager from "@Systems/AudioManager";
import * as ResultsUI from "@Scenes/Battleground/Results/ResultsUI";
import * as PrestigeSystem from "@Systems/PrestigeSystem";
import * as PhaseManager from "@Scenes/Battleground/PhaseManager";
import { saveGameData } from "@Game/effects/saveGameData";
import { deleteSavedData } from "@Game/effects/deleteSavedData";
import * as StatsStore from "@Models/StatsStore";
import * as c from "@Constants/constants";
import { getName } from "@i18n/i18n";
import { replayCombat, storeCombatResult } from "@Scenes/Battleground/RunCombatIO";

export async function handleCombatEndedDefeat(state: State): Promise<void> {
	console.log("Round", state.session.round, "Processing Defeat...");

	AudioManager.playSoundEffect("sfx_victory_match");

	await delay(300);

	const nextPhaseCallback = async () => {
		await handleDefeat(state);
	};

	// Store combat result for replay
	storeCombatResult("player_lost", state, nextPhaseCallback);

	ResultsUI.displayResults(
		state,
		"defeat",
		nextPhaseCallback,
		replayCombat
	);
	PrestigeSystem.processDefeat();
	await ResultsUI.slideIn();
}

export async function handleCombatEndedVictory(state: State): Promise<void> {
	console.log("Round", state.session.round, "Processing Victory...");

	AudioManager.playSoundEffect("sfx_victory_reward_chant");

	await delay(300);

	const nextPhaseCallback = async () => {
		await handleVictory(state);
	};

	// Store combat result for replay
	storeCombatResult("player_won", state, nextPhaseCallback);

	ResultsUI.displayResults(
		state,
		"victory",
		nextPhaseCallback,
		replayCombat
	);
	PrestigeSystem.processVictory();
	await ResultsUI.slideIn();
}

export async function handleCombatEnded(state: State, combatResult: string) {

	const playerUnits = state.battleData.units.filter(u => u.force === c.FORCE_ID_PLAYER && !u.isCore);

	// if (!state.gameData.isSeeded) { // TODO: Check for seeded runs in SessionData
	for (const unit of playerUnits) {
		StatsStore.recordUnitUsage(getName(unit.cardId));
		StatsStore.checkMostPowerfulUnit(getName(unit.cardId), unit.power);
	}
	StatsStore.save();
	// }

	if (combatResult === "player_won") {
		await handleCombatEndedVictory(state);
	} else {
		await handleCombatEndedDefeat(state);
	}
}

async function handleVictory(state: State): Promise<void> {
	PrestigeSystem.finalizeRound();

	console.log("Round", state.session.round, "Shop Phase Starting (Victory Transition).");

	saveGameData();

	await PhaseManager.resetBoard(true);

	// Notify server of combat completion and get next phase
	const server = PhaseManager.getServerAdapter();
	const playerId = PhaseManager.getPlayerId();
	await server.handleAction(playerId, 'combat_done');
	PhaseManager.startPhase(state);
}

async function handleDefeat(state: State): Promise<void> {
	PrestigeSystem.finalizeRound();

	console.log("Round", state.session.round, "Shop Phase Starting (After Defeat).");

	const lives = 4 - state.session.losses;
	if (lives <= 0) {
		deleteSavedData();

		const { displayGameComplete } = await import("@Scenes/Battleground/Results/GameCompleteUI");
		const container = await displayGameComplete(state, state.session.wins, state.session.team.units, true);
		getCurrentScene().add.existing(container);
		return;
	}

	saveGameData();

	await PhaseManager.resetBoard(true);

	// Notify server of combat completion and get next phase
	const server = PhaseManager.getServerAdapter();
	const playerId = PhaseManager.getPlayerId();
	await server.handleAction(playerId, 'combat_done');
	PhaseManager.startPhase(state);
}
