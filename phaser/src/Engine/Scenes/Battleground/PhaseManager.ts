import { getState, State } from "@Models/State";
import * as c from "@Constants/constants";
import { clearAll, summon } from "@Systems/Chara/Chara";
import { delay } from "@Utils/animation";
import * as PoisonSystem from "@Systems/PoisonDamageSystem";
import * as RegenSystem from "@Systems/RegenSystem";
import * as CombatSystemStates from "@Systems/CombatSystemStates";
import { getServerAdapter } from "@Core/ServerFactory";
export { getServerAdapter }; // Re-export for convenience
import { isMultiplayer } from "@Multiplayer/MultiplayerManager";
import { ActionPayload } from "@Core/Types";
import * as Board from "@Models/Board";
import { handleMultiplayerPhase } from "@Scenes/Battleground/MultiplayerPhaseManager";
import type { PhaseTransport } from "@Scenes/Battleground/MultiplayerPhaseManager";

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

export async function startPhase(
	state: State,
	options: {
		showReadyOnInitialCombat?: boolean;
	} = {}
) {
	// Both multiplayer and single-player use the same phase handler.
	// Multiplayer uses the remote transport (default); single-player uses a local transport.
	const transport = isMultiplayer ? undefined : createLocalPhaseTransport();
	await handleMultiplayerPhase(state, transport, {
		showReadyOnInitialCombat: options.showReadyOnInitialCombat || false,
	});
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
