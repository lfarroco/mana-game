import { Unit } from "@Models/Entities/Unit";
import { increasePower } from "@TriggerSystem/effects";
import { pickOne } from "@utils";
import { upgradeUnit } from "@Systems/Chara/Chara";
import { distributePower } from "@TriggerSystem/effects/distributePower";
import { absorbPower } from "@TriggerSystem/effects/absorbPower";
import { sacrificeEffect } from "@TriggerSystem/effects/sacrificeEffect";
import {
	Effect,
	EffectReaction,
	processEffectsIO,
	resolveTargets,
	processReactions,
} from "@TriggerSystem/TriggerSystem";
import { FORCE_ID_PLAYER } from "@Constants/constants";
import { getState, State } from "@Models/State";
import { t } from "@i18n/i18n";
import { getReactionDescription } from "@Systems/Chara/CharaTooltip";
import { getPlayerPersistentCore } from "@Models/Entities/Card";
import { arcaneMissileTargeted } from "@Effects/index";
import { updatePowerDisplay } from "@Systems/Chara/PowerDisplay";
import { getCharaById, hasCharaById } from "@Systems/Chara/Chara";
import { CombatEnvironment } from "@Core/Combat/CombatTypes";
import * as Poison from "@Systems/PoisonDamageSystem";
import * as Regen from "@Systems/RegenSystem";
import * as CombatStatsTracker from "@Systems/CombatStatsTracker";
import { createLogger } from "@Utils/Logger";
import { initializeForceStatsState } from "@Core/Combat/ForceStatsState";

const logger = createLogger("Orbs");

const MIN_COOLDOWN_MS = 1000;
const COOLDOWN_REDUCTION_FACTOR = 0.1;
const HASTE_DURATION_MS = 1000;
const SLOW_DURATION_MS = 1000;
const CHARGE_DURATION_MS = 500;

const playPowerTransferEffect = (
	sourceId: string | undefined,
	targetId: string,
	colors: number[],
	impactColors: number[],
	onHit: () => void,
	affectedUnitId?: string
) => {
	const refreshPowerDisplay = (unitId: string | undefined) => {
		if (!unitId || !hasCharaById(unitId)) {
			return;
		}

		updatePowerDisplay(unitId);
	};

	const effect = async () => {
		onHit();
		refreshPowerDisplay(sourceId);
		refreshPowerDisplay(targetId);
		refreshPowerDisplay(affectedUnitId);
	};

	if (
		!sourceId ||
		sourceId === targetId ||
		!hasCharaById(sourceId) ||
		!hasCharaById(targetId)
	) {
		effect();
		return;
	}

	arcaneMissileTargeted(getCharaById(sourceId), getCharaById(targetId), {
		colors,
		amplitudeMin: 5,
		amplitudeMax: 15,
		particleScale: 1.5,
		impact: {
			colors: impactColors,
			scale: 2,
			speed: 200,
			lifespan: 300,
			alpha: 0.4,
		},
		onHit: effect,
	});
};

export type OrbSpec = {
	id: string;
	name: string;
	color: number;
	tooltip: string;
	icon: string;
	// return false to indicate the effect was not applied and the orb should return
	effect: (unit: Unit) => boolean;
};

const getShopEnvironment = (state: State): CombatEnvironment => {
	return {
		state,
		combatStates: {
			poisonSystemState: Poison.initializePoisonSystem(),
			regenSystemState: Regen.initializeRegenSystem(),
			combatStatsTrackerState: CombatStatsTracker.initialize(state),
			forceStatsState: initializeForceStatsState(),
		},
		effects: {
			onUnitPop: () => { },
			onChargeBarUpdate: () => { },
			onCombatEnd: async () => { },
			getTimeScale: () => 1,
			getScene: () => null,
			updateLifeDisplay: () => { },
			updateShieldDisplay: () => { },
			updateRegenDisplay: () => { },
			updatePoisonDisplay: () => { },
			onPowerUpdate: (unitId: string) => updatePowerDisplay(unitId),
			onIncreasePower: (sourceId, targetId, _amount, _permanent, onHit) => {
				playPowerTransferEffect(
					sourceId,
					targetId,
					[0xffa500, 0xff8c00, 0xff4500],
					[0xffa500, 0xff8c00],
					onHit
				);
			},
			onDecreasePower: (sourceId, targetId, _amount, _permanent, onHit, _delay, affectedUnitId) => {
				playPowerTransferEffect(
					sourceId,
					targetId,
					[0x8a2be2, 0x9400d3, 0x9932cc],
					[0x8a2be2, 0x9400d3],
					onHit,
					affectedUnitId
				);
			},
			onIncreaseCritical: (_s, _t, onHit) => onHit(),
		},
		processReactions,
	};
};

const increasePowerOnType = (type: string) => () => ({
	id: `increase_power_on_${type}`,
	name: t("shop.orbs.increasePower.name", { type }),
	color: 0xff3333,
	tooltip: t("shop.orbs.increasePower.tooltip", { type }),
	icon: "ui/commander",
	effect: (unit: Unit) => {
		if (!unit.effects.find((eff) => eff.id === type)) return false;

		const pct = Math.floor(unit.power * 0.1);

		const env = getShopEnvironment(getState());
		increasePower(env, [unit], pct, false);

		if (unit.force === FORCE_ID_PLAYER) {
			getState().session.team.units.find((u) => u.id === unit.id)!.power = unit.power;
		}
		logger.debug(`Increase Power (${type}) applied to ${unit.id}, new power: ${unit.power}`);
		return true;
	},
});

const increaseCriticalOnType = (type: string) => () => ({
	id: `increase_critical_on_${type}`,
	name: t("shop.orbs.increaseCritical.name", { type }),
	color: 0xff3333,
	tooltip: t("shop.orbs.increaseCritical.tooltip", { type }),
	icon: "ui/assassin",
	effect: (unit: Unit) => {
		if (!unit.effects.find((eff) => eff.id === type)) return false;

		// Use processEffectsIO with permanent=true for shop orbs
		processEffectsIO(
			getShopEnvironment(getState()),
			unit,
			[
				{
					id: "increase_critical",
					amount: 10,
					targets: { id: "self" },
					permanent: true,
				},
			],
			false
		);

		logger.debug(
			`Increase Critical (${type}) applied to ${unit.id}, new critical: ${unit.critical}`
		);
		return true;
	},
});

const decreaseCooldownOnType = (type: string) => () => ({
	id: `decrease_cooldown_on_${type}`,
	name: t("shop.orbs.decreaseCooldown.name", { type }),
	color: 0xff3333,
	tooltip: t("shop.orbs.decreaseCooldown.tooltip", { type }),
	icon: "ui/trial_circuit",
	effect: (unit: Unit) => {
		if (!unit.effects.find((eff) => eff.id === type)) return false;

		unit.cooldown = Math.max(MIN_COOLDOWN_MS, unit.cooldown * (1 - COOLDOWN_REDUCTION_FACTOR));

		if (unit.force === FORCE_ID_PLAYER) {
			getState().session.team.units.find((u) => u.id === unit.id)!.cooldown = unit.cooldown;
		}

		logger.debug(
			`Decrease Cooldown (${type}) applied to ${unit.id}, new cooldown: ${unit.cooldown}`
		);
		return true;
	},
});

//re-haste: target triggering
const increasePowerOnTypeEffect = (
	type: "damage" | "heal" | "shield" | "poison" | "regen"
): Effect => ({
	id: "increase_power",
	amount: 2,
	targets: {
		id: "all_allies",
		ofType: type,
	},
});
const increaseCriticalEffect: Effect = {
	id: "increase_critical",
	amount: 5,
	targets: { id: "random_ally", count: 1 },
};
const increasePowerOnWeakest: Effect = {
	id: "increase_power",
	amount: 10,
	targets: { id: "weakest_ally" },
};
const decreaseRandomEnemyPowerEffect: Effect = {
	id: "decrease_power",
	amount: 10,
	targets: { id: "random_enemy", count: 1 },
};
const decreaseStrongestEnemyPowerEffect: Effect = {
	id: "decrease_power",
	amount: 10,
	targets: { id: "random_enemy", count: 1 },
};
//multiply power on spammable effects is extremelly OP
//const multiplyAllyPowerEffect: Effect = { id: "multiply_power", multiplier: 1.1, targets: { id: "random_ally", count: 1 } }
const hasteEffect: Effect = {
	id: "haste",
	duration: HASTE_DURATION_MS,
	targets: { id: "random_ally", count: 2 },
};
const slowEffect: Effect = {
	id: "slow",
	duration: SLOW_DURATION_MS,
	targets: { id: "random_enemy", count: 2 },
};
const chargeEffect: Effect = {
	id: "charge",
	duration: CHARGE_DURATION_MS,
	targets: { id: "random_ally", count: 2 },
};

export const orbsIndex: Record<string, () => OrbSpec> = {
	increase_power_on_damage: increasePowerOnType("damage"),
	increase_power_on_heal: increasePowerOnType("heal"),
	increase_power_on_shield: increasePowerOnType("shield"),
	increase_power_on_poison: increasePowerOnType("poison"),
	increase_power_on_regen: increasePowerOnType("regen"),
	decrease_cooldown_on_damage: decreaseCooldownOnType("damage"),
	decrease_cooldown_on_heal: decreaseCooldownOnType("heal"),
	decrease_cooldown_on_shield: decreaseCooldownOnType("shield"),
	decrease_cooldown_on_poison: decreaseCooldownOnType("poison"),
	decrease_cooldown_on_regen: decreaseCooldownOnType("regen"),
	increase_critical_on_damage: increaseCriticalOnType("damage"),
	increase_critical_on_heal: increaseCriticalOnType("heal"),
	increase_critical_on_shield: increaseCriticalOnType("shield"),
	increase_critical_on_poison: increaseCriticalOnType("poison"),
	increase_critical_on_regen: increaseCriticalOnType("regen"),
	upgrade_orb: () => ({
		id: "upgrade_orb",
		name: t("shop.orbs.upgrade.name"),
		color: 0x3399ff,
		tooltip: t("shop.orbs.upgrade.tooltip"),
		icon: "ui/upgrade_unit",
		effect: (unit: Unit) => {
			upgradeUnit(unit);
			return true;
		},
	}),
	increase_core_max_life: () => {
		const state = getState();

		const core = getPlayerPersistentCore(state);

		const round = state.session.round;
		const lifeGain = Math.floor(core.maxLife * 0.1) + round * 10;

		return {
			id: "increase_core_max_life",
			name: t("shop.orbs.increaseMaxLife.name"),
			color: 0x32cd32,
			tooltip: t("shop.orbs.increaseMaxLife.tooltip", { amount: lifeGain.toString() }),
			icon: "ui/improve_heal",
			effect: (unit: Unit) => {
				if (!unit.isCore) return false;
				unit.maxLife = core.maxLife + lifeGain;
				unit.life = core.maxLife;
				return true;
			},
		};
	},
	upgrade_core_power: () => {
		const state = getState();

		const core = getPlayerPersistentCore(state);

		const round = state.session.round;
		const powerGain = Math.floor(core.power * 0.1) + round * 10;

		return {
			id: "upgrade_core_power",
			name: t("shop.orbs.upgradePower.name"),
			color: 0xee4b2b,
			tooltip: t("shop.orbs.upgradePower.tooltip", { amount: powerGain.toString() }),
			icon: "ui/upgrade_unit",
			effect: (unit: Unit) => {
				if (!unit.isCore) return false;
				unit.power = unit.power + powerGain;
				unit.bonusPower = (unit.bonusPower || 0) + powerGain;
				updatePowerDisplay(core.id);
				return true;
			},
		};
	},
	decrease_core_cooldown: () => ({
		id: "decrease_core_cooldown",
		name: t("shop.orbs.decreaseCoreCooldown.name"),
		color: 0x00eaff,
		tooltip: t("shop.orbs.decreaseCoreCooldown.tooltip"),
		icon: "ui/trial_circuit",
		effect: (unit: Unit) => {
			if (!unit.isCore) return false;
			const reduction = unit.cooldown * COOLDOWN_REDUCTION_FACTOR;
			unit.cooldown = Math.max(MIN_COOLDOWN_MS, unit.cooldown - reduction);
			return true;
		},
	}),
	on_100_damage_effect: () => {
		const reaction: EffectReaction = {
			position: "allies",
			effectId: "every_100_damage",
			effects: [
				pickOne([
					increasePowerOnTypeEffect("heal"),
					increasePowerOnTypeEffect("shield"),
					increasePowerOnTypeEffect("poison"),
					increasePowerOnTypeEffect("regen"),
				]),
			],
		};

		return {
			id: "on_100_damage_effect",
			name: t("tooltip.effects.every_100_damage"),
			color: 0x3399ff,
			tooltip: getReactionDescription(reaction, 0),
			icon: "ui/forest_pools",
			effect: (unit: Unit) => {
				unit.reactions.push(reaction);
				return true;
			},
		};
	},
	on_100_shield_effect: () => {
		const reaction: EffectReaction = {
			position: "allies",
			effectId: "every_100_shield",
			effects: [
				pickOne([
					increasePowerOnTypeEffect("heal"),
					increasePowerOnTypeEffect("damage"),
					increasePowerOnTypeEffect("poison"),
					increasePowerOnTypeEffect("regen"),
				]),
			],
		};

		return {
			id: "on_100_shield_effect",
			name: t("tooltip.effects.every_100_shield"),
			color: 0x3399ff,
			tooltip: getReactionDescription(reaction, 0),
			icon: "ui/forest_pools",
			effect: (unit: Unit) => {
				unit.reactions.push(reaction);
				return true;
			},
		};
	},
	on_100_heal_effect: () => {
		const reaction: EffectReaction = {
			position: "allies",
			effectId: "every_100_heal",
			effects: [
				pickOne([
					increasePowerOnWeakest,
					increasePowerOnTypeEffect("shield"),
					increasePowerOnTypeEffect("damage"),
					increasePowerOnTypeEffect("poison"),
					increasePowerOnTypeEffect("regen"),
				]),
			],
		};

		return {
			id: "on_100_heal_effect",
			name: t("tooltip.effects.every_100_heal"),
			color: 0x3399ff,
			tooltip: getReactionDescription(reaction, 0),
			icon: "ui/forest_pools",
			effect: (unit: Unit) => {
				unit.reactions.push(reaction);
				return true;
			},
		};
	},
	on_10_regen_effect: () => {
		const reaction: EffectReaction = {
			position: "allies",
			effectId: "every_10_regen",
			effects: [
				pickOne([
					increasePowerOnTypeEffect("shield"),
					increasePowerOnTypeEffect("damage"),
					increasePowerOnTypeEffect("poison"),
					increasePowerOnTypeEffect("heal"),
				]),
			],
		};

		return {
			id: "on_10_regen_effect",
			name: t("tooltip.effects.every_10_regen"),
			color: 0x3399ff,
			tooltip: getReactionDescription(reaction, 0),
			icon: "ui/forest_pools",
			effect: (unit: Unit) => {
				unit.reactions.push(reaction);
				return true;
			},
		};
	},
	on_10_poison_effect: () => {
		const reaction: EffectReaction = {
			position: "allies",
			effectId: "every_10_poison",
			effects: [
				pickOne([
					increasePowerOnTypeEffect("shield"),
					increasePowerOnTypeEffect("damage"),
					increasePowerOnTypeEffect("regen"),
					increasePowerOnTypeEffect("heal"),
				]),
			],
		};

		return {
			id: "on_10_poison_effect",
			name: t("tooltip.effects.every_10_poison"),
			color: 0x3399ff,
			tooltip: getReactionDescription(reaction, 0),
			icon: "ui/forest_pools",
			effect: (unit: Unit) => {
				unit.reactions.push(reaction);
				return true;
			},
		};
	},
	on_re_slow_effect: () => {
		const reaction: EffectReaction = {
			position: "allies",
			effectId: "re_slow",
			effects: [
				pickOne([
					decreaseRandomEnemyPowerEffect,
					decreaseStrongestEnemyPowerEffect,
					increasePowerOnTypeEffect("poison"),
					increasePowerOnTypeEffect("shield"),
				]),
			],
		};
		return {
			id: "on_re_slow_effect",
			name: t("tooltip.effects.re_slow"),
			color: 0x3399ff,
			tooltip: getReactionDescription(reaction, 0),
			icon: "ui/forest_pools",
			effect: (unit: Unit) => {
				unit.reactions.push(reaction);
				return true;
			},
		};
	},
	on_re_haste_effect: () => {
		const reaction: EffectReaction = {
			position: "allies",
			effectId: "re_hasted",
			effects: [
				pickOne([
					increaseCriticalEffect,
					increasePowerOnTypeEffect("damage"),
					increasePowerOnTypeEffect("shield"),
					increasePowerOnTypeEffect("heal"),
				]),
			],
		};
		return {
			id: "on_re_haste_effect",
			name: t("tooltip.effects.re_hasted"),
			color: 0x3399ff,
			tooltip: getReactionDescription(reaction, 0),
			icon: "ui/forest_pools",
			effect: (unit: Unit) => {
				unit.reactions.push(reaction);
				return true;
			},
		};
	},
	on_over_heal_effect: () => {
		const reaction: EffectReaction = {
			position: "allies",
			effectId: "on_over_heal",
			effects: [pickOne([increaseCriticalEffect, hasteEffect, increasePowerOnWeakest])],
		};
		return {
			id: "on_over_heal_effect",
			name: t("tooltip.effects.on_over_heal"),
			color: 0x3399ff,
			tooltip: getReactionDescription(reaction, 0),
			icon: "ui/forest_pools",
			effect: (unit: Unit) => {
				unit.reactions.push(reaction);
				return true;
			},
		};
	},
	on_crit_effect: () => {
		const reaction: EffectReaction = {
			position: "allies",
			effectId: "on_crit",
			effects: [
				pickOne([
					decreaseRandomEnemyPowerEffect,
					decreaseStrongestEnemyPowerEffect,
					increasePowerOnTypeEffect("damage"),
					increasePowerOnTypeEffect("shield"),
					increasePowerOnTypeEffect("heal"),
				]),
			],
		};
		return {
			id: "on_crit_effect",
			name: t("tooltip.effects.on_crit"),
			color: 0x3399ff,
			tooltip: getReactionDescription(reaction, 0),
			icon: "ui/forest_pools",
			effect: (unit: Unit) => {
				unit.reactions.push(reaction);
				return true;
			},
		};
	},
	on_battle_start_effect: () => {
		const reaction: EffectReaction = {
			position: "allies",
			effectId: "on_battle_start",
			effects: [pickOne([hasteEffect, slowEffect, chargeEffect])],
		};
		return {
			id: "on_battle_start_effect",
			name: t("tooltip.effects.on_battle_start"),
			color: 0x3399ff,
			tooltip: getReactionDescription(reaction, 0),
			icon: "ui/forest_pools",
			effect: (unit: Unit) => {
				unit.reactions.push(reaction);
				return true;
			},
		};
	},

	distribute_power_orb: () => ({
		id: "distribute_power_orb",
		name: t("shop.orbs.distributePower.name"),
		color: 0xffaa00,
		tooltip: t("shop.orbs.distributePower.tooltip"),
		icon: "ui/power_distributor",
		effect: (unit: Unit) => {
			const targets = resolveTargets(getState(), unit, {
				id: "distribute_power",
				targets: {
					id: "row_allies",
				},
			});
			const env = getShopEnvironment(getState());
			distributePower(env, unit, targets, true); // permanent=true in shop
			return true;
		},
	}),
	absorb_power_orb: () => ({
		id: "absorb_power_orb",
		name: t("shop.orbs.absorbPower.name"),
		color: 0xaa00ff,
		tooltip: t("shop.orbs.absorbPower.tooltip"),
		icon: "ui/power_absorber",
		effect: (unit: Unit) => {
			const targets = resolveTargets(getState(), unit, {
				id: "absorb_power",
				targets: {
					id: "row_allies",
				},
			});

			const env = getShopEnvironment(getState());
			absorbPower(env, unit, targets, true);
			return true;
		},
	}),
	sacrifice_effect_orb: () => ({
		id: "sacrifice_effect_orb",
		name: t("shop.orbs.darkRitual.name"),
		color: 0x550000,
		tooltip: t("shop.orbs.darkRitual.tooltip"),
		icon: "ui/dark_ritual",
		effect: (unit: Unit) => {
			const env = getShopEnvironment(getState());
			sacrificeEffect(env, unit);
			return true;
		},
	}),
	increase_power_on_haste: increasePowerOnType("haste"),
	decrease_cooldown_on_haste: decreaseCooldownOnType("haste"),
	increase_power_on_slow: increasePowerOnType("slow"),
	decrease_cooldown_on_slow: decreaseCooldownOnType("slow"),
	increase_power_on_charge: increasePowerOnType("charge"),
	decrease_cooldown_on_charge: decreaseCooldownOnType("charge"),
};
