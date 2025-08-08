/**
 * @file Contains the actual implementations for various trait effects.
 * Each function defined here corresponds to an `effectId` that can be used
 * in `TraitDefinition`s. These functions are registered with the `TraitEffectSystem`.
 */
import { registerTraitEffectImplementation } from "../TraitEffectSystem";
import * as implementations from "./implementations/index";

export function registerAllTraitEffects() {
	//unused
	registerTraitEffectImplementation("grant_gold_to_player", implementations.grantGoldLogic);

	// basic effects
	// registerTraitEffectImplementation("deal_damage", implementations.dealDamageLogicIO);
	// registerTraitEffectImplementation("restore_morale", implementations.restoreMoraleLogicIO);
	//registerTraitEffectImplementation("add_shield", implementations.addShieldLogicIO);

	// Power-increasing effects
	registerTraitEffectImplementation("modify_stat_passive", implementations.modifyStatPassiveLogic);

	// Status effect applications
	//registerTraitEffectImplementation("apply_haste", implementations.applyHasteLogicIO);
	//registerTraitEffectImplementation("apply_slow", implementations.applySlowLogicIO);
	//registerTraitEffectImplementation("apply_charge", implementations.applyChargeLogicIO);
	//registerTraitEffectImplementation("apply_poison", implementations.applyPoisonLogicIO);

	// Dynamic effect dispatcher
	registerTraitEffectImplementation("DYNAMIC", implementations.dynamicEffectLogic);

}
