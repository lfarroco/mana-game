import { getState, State } from "@Models/State";
import * as CombatPhase from "@Systems/CombatPhase";
import * as EffectCardShop from "@Systems/Shop/EffectCardShop";
import * as c from "@Constants/constants";
import { clearAll, summon } from "@Systems/Chara/Chara";
import * as Chara from "@Systems/Chara/Chara";
import { delay } from "@Utils/animation";
import * as PoisonSystem from "@Systems/PoisonDamageSystem";
import * as RegenSystem from "@Systems/RegenSystem";
import * as CombatSystemStates from "@Systems/CombatSystemStates";
import * as Encounter from "@Systems/Encounter";
import { saveGameData } from "@Game/effects/saveGameData";
import { cloudsBackground } from "@Systems/Setup";
import { colorPresets } from "@Constants/colorPresets";
import { getServerAdapter } from "@Core/ServerFactory";
export { getServerAdapter }; // Re-export for convenience
import { isMultiplayer } from "@Multiplayer/MultiplayerManager";
import { EventEmitter } from "@Systems/Events";
import { ActionPayload, PhaseOptions, PhaseOption } from "@Core/Types";
import { openOrbShop } from "@Systems/Shop/OrbShop";
import * as Board from "@Models/Board";
import { renderTavernCharas } from "@Systems/Shop/CharaShop";
import * as ShopPanel from "@Systems/Shop/ShopPanel";
import { updateRoundDisplay } from "@UI/components/roundDisplay";
import { getGameController } from "@Core/GameControllerFactory";
import { getCardDefinition } from "@Models/Entities/Card";
import { handleMultiplayerPhase } from "@Scenes/Battleground/MultiplayerPhaseManager";
import type { PhaseTransport } from "@Scenes/Battleground/MultiplayerPhaseManager";
import { createLogger } from "@Utils/Logger";

const logger = createLogger("PhaseManager");

function getColorPresetForPhase(phase: string): keyof typeof colorPresets {
	const colorMap: Record<string, keyof typeof colorPresets> = {
		shop: "sea",
		encounter: "nebula",
		combat: "forest",
		upgrade_core: "aurora",
		add_reaction_core: "sunset",
	};

	return colorMap[phase] || "forest";
}

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
	// Multiplayer keeps using the remote transport.
	if (isMultiplayer) {
		await handleMultiplayerPhase(state);
		return;
	}

	// Single-player uses the same phase UI handler with a local server transport.
	try {
		await handleMultiplayerPhase(state, createLocalPhaseTransport());
		return;
	} catch (error) {
		logger.warn("Shared phase handler failed in local mode, falling back to legacy renderer", {
			error,
		});
	}

	// Legacy single-player fallback path.
	const server = getServerAdapter();
	const playerId = getPlayerId();

	try {
		const phaseOptions = await server.getPhaseOptions(playerId);
		await renderPhase(state, phaseOptions, eventEmitter);
	} catch (error) {
		logger.error("Failed to get phase options:", error);
	}
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

// Render phase based on server response
async function renderPhase(state: State, options: PhaseOptions, _eventEmitter?: EventEmitter) {
	state.session.phase = options.phase;
	const previousRound = state.session.round;
	state.session.round = options.round ?? state.session.round;
	if (state.session.round !== previousRound) {
		updateRoundDisplay(state.session.round);
	}
	state.session.current_options = {
		options: options.options || [],
		combatState: options.combatState,
	};
	if (options.wins !== undefined) {
		state.session.wins = options.wins;
	}
	if (options.losses !== undefined) {
		state.session.losses = options.losses;
	}

	if (cloudsBackground) {
		const preset = getColorPresetForPhase(options.phase);
		cloudsBackground.tweenToPreset(preset, 2000, "Sine.InOut");
	}

	// Sync team from server if provided (important for combat phase to have correct units)
	if (options.team && options.team.units) {
		logger.debug("Syncing team from server...", options.team.units.length);
		state.session.team.units = options.team.units;

		// Re-render units if not in combat (combat handles its own rendering)
		if (options.phase !== "combat") {
			Chara.clearAll();

			await Promise.all(
				state.session.team.units.map(async (u) => {
					const c = await Chara.create(u);
					Chara.enableTooltip(c);
				})
			);
		}
	}

	// Sync run stats if provided
	if (options.runStats) {
		state.session.runStats = options.runStats;
	} else if (!state.session.runStats) {
		// Initialize empty stats if missing
		state.session.runStats = {
			damageDealt: 0,
			poisonDealt: 0,
			shieldDealt: 0,
			regenDealt: 0,
			healDealt: 0,
			mostPowerfulUnit: null,
			totalUnitsRecruited: 0,
			unitUsage: {},
		};
	}

	switch (options.phase) {
		case "encounter":
			await Encounter.open(
				state,
				options.options.map((o: PhaseOption) => o.id)
			);
			break;
		case "shop":
			{
				const shopCardIds = options.options.map((o: PhaseOption) => o.id);
				const cardDefs = shopCardIds.map((id: string) => getCardDefinition(id)).filter(Boolean);
				const controller = getGameController();
				ShopPanel.create(async () => {
					await ShopPanel.slideOut();
					await controller.skipPhase();
				});
				renderTavernCharas(cardDefs);
				await ShopPanel.slideIn();
			}
			break;
		case "combat":
			await CombatPhase.transitionToCombatPhase(state, options.combatState);
			break;
		case "orb_shop":
			await openOrbShop(
				state,
				options.options.map((o: PhaseOption) => o.id),
				async (orbId: string, targetId: string) => {
					// Notify server when orb is applied
					const server = getServerAdapter();
					const playerId = getPlayerId();
					await server.handleAction(playerId, "apply_orb", { orbId, targetUnitId: targetId });
				}
			);
			// After orb shop completes, notify server and get next phase
			{
				const server = getServerAdapter();
				const playerId = getPlayerId();
				await server.handleAction(playerId, "orb_shop_done");
				await startPhase(state, currentEventEmitter);
			}
			break;
		case "upgrade_core":
			await EffectCardShop.openUpgradeCorePhase(
				"upgradeCrystal.title",
				options.options.map((o: PhaseOption) => o.id)
			);
			// After upgrade completes, notify server and get next phase
			{
				const server = getServerAdapter();
				const playerId = getPlayerId();
				await server.handleAction(playerId, "upgrade_core_done");
				await startPhase(state, currentEventEmitter);
			}
			break;
		case "add_reaction_core":
			await EffectCardShop.openUpgradeCorePhase(
				"effectCardShop.title",
				options.options.map((o: PhaseOption) => o.id)
			);
			// After reaction card completes, notify server and get next phase
			{
				const server = getServerAdapter();
				const playerId = getPlayerId();
				await server.handleAction(playerId, "add_reaction_core_done");
				await startPhase(state, currentEventEmitter);
			}
			break;
		default:
			logger.warn(`Unknown phase: ${options.phase}`);
			break;
	}
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
