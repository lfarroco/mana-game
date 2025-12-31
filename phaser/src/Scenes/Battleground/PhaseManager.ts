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
import { pickRandom } from "utils";
import { cloudsBackground } from "./Systems/Setup";
import { colorPresets } from "@Constants/colorPresets";
import { MultiplayerManager } from "../../Multiplayer/MultiplayerManager";
import { handleMultiplayerPhase } from "./MultiplayerPhaseManager";

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

export async function startPhase(state: State, phase: string) {
	if (MultiplayerManager.getInstance().isMultiplayer) {
		await handleMultiplayerPhase(state);
		return;
	}

	if (cloudsBackground) {
		const preset = getColorPresetForPhase(phase);
		cloudsBackground.tweenToPreset(preset, 2000, "Sine.InOut");
	}

	switch (phase) {
		case "shop":
			await HeroShop.openHeroShop();
			handlePhaseEnded(state);
			break;
		case "combat":
			CombatPhase.transitionToCombatPhase(state);
			break;
		case "encounter":
			Encounter.open(state);
			break;
		case "add_reaction_core":
			await EffectCardShop.openUpgradeCorePhase(
				"effectCardShop.title",
				pickRandom([
					"on_100_damage_effect",
					"on_100_heal_effect",
					"on_100_shield_effect",
					"on_10_poison_effect",
					"on_10_regen_effect",
					"on_re_slow_effect",
					"on_re_haste_effect",
					"on_crit_effect",
					"on_over_heal_effect",
					"on_battle_start_effect",
				], 3)
			);
			handlePhaseEnded(state);
			break;
		case "upgrade_core":
			await EffectCardShop.openUpgradeCorePhase(
				"upgradeCrystal.title",
				[
					"increase_core_max_life",
					"decrease_core_cooldown",
					"upgrade_core_power"
				])
			handlePhaseEnded(state);
			break;
		default:
			break;
	}
}

export function handlePhaseEnded(state: State): void {

	state.gameData.hour++;

	const phase = getPhaseForHour(state.gameData.hour);

	saveGameData();

	startPhase(state, phase);
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
