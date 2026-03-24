import { getState, State } from "@Models/State";
import * as c from "@Constants/constants";
import { clearAll, summon } from "@Systems/Chara/Chara";
import { delay } from "@Utils/animation";
import * as PoisonSystem from "@Systems/PoisonDamageSystem";
import * as RegenSystem from "@Systems/RegenSystem";
import * as CombatSystemStates from "@Systems/CombatSystemStates";
import { saveGameData } from "@Game/effects/saveGameData";
import { getServerAdapter } from "@Core/ServerFactory";
export { getServerAdapter }; // Re-export for convenience
import { isMultiplayer } from "@Multiplayer/MultiplayerManager";
import { EventEmitter } from "@Systems/Events";
import { ActionPayload } from "@Core/Types";
import * as Board from "@Models/Board";
import { handleMultiplayerPhase } from "@Scenes/Battleground/MultiplayerPhaseManager";
import type { PhaseTransport } from "@Scenes/Battleground/MultiplayerPhaseManager";
import { createLogger } from "@Utils/Logger";

const logger = createLogger("PhaseManager");

let currentEventEmitter: EventEmitter | undefined;

const getPhaseCompletionAction = (phase: State["session"]["phase"]): string => {
	switch (phase) {
		case "encounter":
			return "skip_encounter";
		case "shop":
			return "skip_shop";
		case "orb_shop":
			return "orb_shop_done";
		case "upgrade_core":
			return "upgrade_core_done";
		case "add_reaction_core":
			return "add_reaction_core_done";
		case "combat":
			return "combat_done";
		case "victory":
			return "victory";
		default:
			return "phase_complete";
	}
};

const createLocalPhaseTransport = (): PhaseTransport => ({
	getPhaseOptions: async () => {
		const server = getServerAdapter();
		const playerId = getPlayerId();
		return await server.getPhaseOptions(playerId);
	},
	sendOptionSelection: async (optionId: string, payload?: ActionPayload) => {
		const server = getServerAdapter();
		const playerId = getPlayerId();
		return await server.handleAction(playerId, optionId, payload);
	},
});

export async function startPhase(state: State, eventEmitter?: EventEmitter) {
	currentEventEmitter = eventEmitter;
	// Both multiplayer and single-player use the same phase handler.
	// Multiplayer uses the remote transport (default); single-player uses a local transport.
	const transport = isMultiplayer ? undefined : createLocalPhaseTransport();
	await handleMultiplayerPhase(state, transport);
}

// Helper to get player ID (from state or generate one)
export function getPlayerId(): string {
	const state = getState();
	// Use a consistent player ID for single-player
	if (!state.session.player_id) {
		state.session.player_id = "sp_player_" + Date.now();
	}
	return state.session.player_id;
}

export function handlePhaseEnded(state: State): void {
	state.session.step++;

	saveGameData();

	// Use server-based phase transition for single-player
	if (!isMultiplayer) {
		const server = getServerAdapter();
		const playerId = getPlayerId();
		const completionAction = getPhaseCompletionAction(state.session.phase);

		// Notify server of phase completion and get next phase
		server
			.handleAction(playerId, completionAction)
			.then(() => {
				startPhase(state, currentEventEmitter);
			})
			.catch((error) => {
				logger.error("Failed to complete phase:", { error, completionAction });
			});
	} else {
		startPhase(state, currentEventEmitter);
	}
}

export async function resetBoard(shouldResummonUnits: boolean = true): Promise<void> {
	const state = getState();

	// Hide enemy board after combat
	Board.setEnemyBoardVisible(false);

	// Re-enable board input after combat
	Board.setIsInputEnabled(true);

	if (shouldResummonUnits) {
		clearAll();
		state.battleData.units = [];
	}

	if (CombatSystemStates.isInitialized()) {
		const combatStates = CombatSystemStates.getCombatSystemStates();
		let newRegenState = RegenSystem.clearRegen(combatStates.regenSystemState, c.FORCE_ID_PLAYER);
		newRegenState = RegenSystem.clearRegen(newRegenState, c.FORCE_ID_CPU);
		CombatSystemStates.updateRegenSystemState(newRegenState);

		let newPoisonState = PoisonSystem.clearPoison(
			combatStates.poisonSystemState,
			c.FORCE_ID_PLAYER
		);
		newPoisonState = PoisonSystem.clearPoison(newPoisonState, c.FORCE_ID_CPU);
		CombatSystemStates.updatePoisonSystemState(newPoisonState);
	}

	if (shouldResummonUnits) {
		const summonPromises = state.session.team.units.map(async (unit, index) => {
			await delay(index * 200);
			await summon(unit, true);
		});
		await Promise.all(summonPromises);
	}
}
