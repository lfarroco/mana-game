import { getState, State } from "@Models/State";
import * as CombatPhase from "./Systems/CombatPhase";
import * as HeroShop from "./Systems/Shop/HeroShop";
import * as EffectCardShop from "./Systems/Shop/EffectCardShop";
import * as c from "@Constants/constants";
import { clearAll, summon } from "@Systems/Chara/Chara";
import { delay } from "@Utils/animation";
import * as PoisonSystem from "./Systems/PoisonDamageSystem";
import * as RegenSystem from "./Systems/RegenSystem";
import * as CombatSystemStates from "./Systems/CombatSystemStates";
import * as Encounter from "./Systems/Encounter";
import { saveGameData } from "../../Game/effects/saveGameData";
import { cloudsBackground } from "./Systems/Setup";
import { colorPresets } from "@Constants/colorPresets";
import { getServerAdapter } from "@Core/ServerFactory";
import { MultiplayerManager } from "@Multiplayer/MultiplayerManager";
import { handleMultiplayerPhase } from "./MultiplayerPhaseManager";
import { openOrbShop } from "./Systems/Shop/OrbShop";

export const loopPhases: string[] = [
	"encounter",
	"encounter",
	"encounter",
	"combat",
	"upgrade_core"
];

// This will repeat the loop logic for the first 15 turns for now,
// but can be customized with specific phases.
export const predefinedPhases: string[] = [
	"encounter", "encounter", "encounter", "combat", "upgrade_core",
	"encounter", "encounter", "encounter", "combat", "add_reaction_core",
	"encounter", "encounter", "encounter", "combat", "upgrade_core",
	"encounter", "encounter", "encounter", "combat", "upgrade_core",
	"encounter", "encounter", "encounter", "combat", "upgrade_core",
	"encounter", "encounter", "encounter", "combat", "add_reaction_core",
	"encounter", "encounter", "encounter", "combat", "upgrade_core",
	"encounter", "encounter", "encounter", "combat", "upgrade_core",
	"encounter", "encounter", "encounter", "combat", "upgrade_core",
	"encounter", "encounter", "encounter", "combat", "add_reaction_core",
];


export const hourAction = loopPhases; // Alias for backward compatibility if needed temporarily

export function getPhaseForHour(hour: number): string {
	if (hour < predefinedPhases.length) {
		return predefinedPhases[hour];
	}

	// For hours beyond the predefined list, use the loop
	// We subtract the predefined length so the loop starts from index 0
	const loopIndex = (hour - predefinedPhases.length) % loopPhases.length;
	return loopPhases[loopIndex];
}

function getColorPresetForPhase(phase: string): keyof typeof colorPresets {
	const colorMap: Record<string, keyof typeof colorPresets> = {
		"shop": "sea",
		"encounter": "nebula",
		"combat": "forest",
		"upgrade_core": "aurora",
		"add_reaction_core": "sunset"
	};

	return colorMap[phase] || "forest";
}

export async function startPhase(state: State, phase?: string) {
	// For multiplayer, continue using the existing system (for now during migration)
	if (MultiplayerManager.getInstance().isMultiplayer) {
		await handleMultiplayerPhase(state);
		return;
	}

	// For single-player, use the unified server interface
	const server = getServerAdapter();
	const playerId = getPlayerId();

	try {
		const phaseOptions = await server.getPhaseOptions(playerId);
		await renderPhase(state, phaseOptions);
	} catch (error) {
		console.error("Failed to get phase options:", error);
		// Fallback to legacy behavior if server fails
		if (phase) {
			await renderPhaseByName(state, phase);
		}
	}
}

// Helper to get player ID (from state or generate one)
function getPlayerId(): string {
	const state = getState();
	// Use a consistent player ID for single-player
	if (!state.gameData.playerId) {
		state.gameData.playerId = "sp_player_" + Date.now();
	}
	return state.gameData.playerId;
}

// Render phase based on server response
async function renderPhase(state: State, options: any) {
	if (cloudsBackground) {
		const preset = getColorPresetForPhase(options.phase);
		cloudsBackground.tweenToPreset(preset, 2000, "Sine.InOut");
	}

	switch (options.phase) {
		case "encounter":
			await Encounter.open(state, options.options.map((o: any) => o.id));
			break;
		case "shop":
			await HeroShop.openHeroShop(undefined, undefined, options.options.map((o: any) => o.id));
			break;
		case "combat":
			await CombatPhase.transitionToCombatPhase(state, options.combatState);
			break;
		case "orb_shop":
			await openOrbShop(state, options.options.map((o: any) => o.id));
			break;
		case "upgrade_core":
			await EffectCardShop.openUpgradeCorePhase(
				"upgradeCrystal.title",
				options.options.map((o: any) => o.id)
			);
			break;
		case "add_reaction_core":
			await EffectCardShop.openUpgradeCorePhase(
				"effectCardShop.title",
				options.options.map((o: any) => o.id)
			);
			break;
		default:
			console.warn(`Unknown phase: ${options.phase}`);
			break;
	}
}

// Legacy rendering by phase name (fallback)
async function renderPhaseByName(state: State, phase: string) {
	if (cloudsBackground) {
		const preset = getColorPresetForPhase(phase);
		cloudsBackground.tweenToPreset(preset, 2000, "Sine.InOut");
	}

	// NOTE: This is legacy code, kept for fallback during migration
	// Will be removed once all phases use server interface
	switch (phase) {
		case "shop":
			await HeroShop.openHeroShop();
			break;
		case "combat":
			await CombatPhase.transitionToCombatPhase(state);
			break;
		case "encounter":
			await Encounter.open(state);
			break;
		case "add_reaction_core":
		case "upgrade_core":
			// These require server-provided options, skip for now
			console.warn(`Phase ${phase} requires server integration`);
			break;
		default:
			break;
	}
}

export function handlePhaseEnded(state: State): void {
	state.gameData.hour++;

	const phase = getPhaseForHour(state.gameData.hour);

	saveGameData();

	// Use server-based phase transition for single-player
	if (!MultiplayerManager.getInstance().isMultiplayer) {
		const server = getServerAdapter();
		const playerId = getPlayerId();

		// Notify server of phase completion and get next phase
		server.handleAction(playerId, "phase_complete").then(() => {
			startPhase(state);
		}).catch(error => {
			console.error("Failed to complete phase:", error);
			// Fallback to legacy phase progression
			startPhase(state, phase);
		});
	} else {
		startPhase(state, phase);
	}
}

export async function resetBoard(shouldResummonUnits: boolean = true): Promise<void> {
	const state = getState();
	if (shouldResummonUnits) {
		clearAll();
		state.battleData.units = [];
	}

	if (CombatSystemStates.isInitialized()) {
		const combatStates = CombatSystemStates.getCombatSystemStates();
		let newRegenState = RegenSystem.clearRegen(combatStates.regenSystemState, c.FORCE_ID_PLAYER);
		newRegenState = RegenSystem.clearRegen(newRegenState, c.FORCE_ID_CPU);
		CombatSystemStates.updateRegenSystemState(newRegenState);

		let newPoisonState = PoisonSystem.clearPoison(combatStates.poisonSystemState, c.FORCE_ID_PLAYER);
		newPoisonState = PoisonSystem.clearPoison(newPoisonState, c.FORCE_ID_CPU);
		CombatSystemStates.updatePoisonSystemState(newPoisonState);
	}

	if (shouldResummonUnits) {
		const summonPromises = state.gameData.player.units.map(async (unit, index) => {
			await delay(index * 200);
			await summon(unit, true);
		});
		await Promise.all(summonPromises);
	}
}
