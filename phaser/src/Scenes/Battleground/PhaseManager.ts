import { getState } from "@Models/State";
import { resetUnitStats } from "@Models/Entities/Unit";
import * as CombatPhase from "./Systems/CombatPhase";
import * as HeroShop from "./Systems/Shop/HeroShop";
import * as EffectCardShop from "./Systems/Shop/EffectCardShop";
import * as c from "@Constants/constants";
import { clearAll, summon } from "@Systems/Chara/Chara";
import { delay } from "@Utils/animation";
import { clearPoison } from "./Systems/PoisonDamageSystem";
import { clearRegen } from "./Systems/RegenSystem";
import { destroyForceStats } from "./ForceStats";
import * as Encounter from "./Systems/Encounter";
import { saveGameData } from "../../Game/effects/saveGameData";
import { pickRandom } from "utils";

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

export async function startPhase(phase: string) {

	switch (phase) {
		case "shop-core":
			HeroShop.openCoreShop();
			break;
		case "shop":
			await HeroShop.openHeroShop();
			handlePhaseEnded();
			break;
		case "combat":
			CombatPhase.transitionToCombatPhase();
			break;
		case "encounter":
			Encounter.open();
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
			handlePhaseEnded();
			break;
		case "upgrade_core":
			await EffectCardShop.openUpgradeCorePhase(
				"upgradeCrystal.title",
				[
					"increase_core_max_life",
					"decrease_core_cooldown",
					"upgrade_core_power"
				])
			handlePhaseEnded();
			break;
		default:
			break;
	}
}

export function handlePhaseEnded(): void {
	const currentPhase = getPhaseForHour(getState().gameData.hour);

	// TODO: the combat phase itself should do this, when it ends
	if (currentPhase === "combat") {
		destroyForceStats(c.FORCE_ID_CPU);
		destroyForceStats(c.FORCE_ID_PLAYER);
		getState().gameData.player.units.forEach(resetUnitStats);
	}

	getState().gameData.hour++;

	const phase = getPhaseForHour(getState().gameData.hour);

	saveGameData();

	startPhase(phase);
}

export async function resetBoard(shouldResummonUnits: boolean = true): Promise<void> {
	const state = getState();
	if (shouldResummonUnits) {
		clearAll();
		state.battleData.units = [];
	}

	clearRegen(c.FORCE_ID_PLAYER);
	clearRegen(c.FORCE_ID_CPU);
	clearPoison(c.FORCE_ID_PLAYER);
	clearPoison(c.FORCE_ID_CPU);

	if (shouldResummonUnits) {
		const summonPromises = state.gameData.player.units.map(async (unit, index) => {
			await delay(index * 200);
			await summon(unit, true);
		});
		await Promise.all(summonPromises);
	}
}
