import { Unit, } from "@Models/Entities/Unit";
import { increasePower } from "../../../../TriggerSystem/effects";
import { pickOne } from "../../../../utils";
import { upgradeUnit } from "@Systems/Chara/Chara";
import { distributePower } from "../../../../TriggerSystem/effects/distributePower";
import { absorbPower } from "../../../../TriggerSystem/effects/absorbPower";
import { sacrificeEffect } from "../../../../TriggerSystem/effects/sacrificeEffect";
import { resolveTargets } from "../../../../TriggerSystem/TriggerSystem";
import { FORCE_ID_PLAYER } from "@Constants/constants";
import { getState } from "@Models/State";
import { t } from "@i18n/i18n";

export type OrbSpec = {
	id: string;
	name: string;
	color: number;
	tooltip: string;
	// return false to indicate the effect was not applied and the orb should return
	effect: (unit: Unit) => boolean;
};

const increasePowerOnType = (type: string) => () => ({
	id: `increase_power_on_${type}`,
	name: t("shop.orbs.increasePower.name", { type }),
	color: 0xff3333,
	tooltip: t("shop.orbs.increasePower.tooltip", { type }),
	effect: (unit: Unit) => {
		if (!unit.effects.find(eff => eff.id === type)) return false;

		const pct = Math.floor(unit.power * 0.1);

		increasePower([unit], pct, false);

		if (unit.force === FORCE_ID_PLAYER) {
			getState().gameData.player.units.find(u => u.id === unit.id)!.power = unit.power;
		}
		console.log(`Increase Power (${type}) applied to ${unit.id}, new power: ${unit.power}`);
		return true;
	}
});

const increaseCriticalOnType = (type: string) => () => ({
	id: `increase_critical_on_${type}`,
	name: t("shop.orbs.increaseCritical.name", { type }),
	color: 0xff3333,
	tooltip: t("shop.orbs.increaseCritical.tooltip", { type }),
	effect: (unit: Unit) => {
		if (!unit.effects.find(eff => eff.id === type)) return false;

		if (!unit.critical) {
			unit.critical = 0;
		}

		unit.critical = unit.critical + 10;

		if (unit.force === FORCE_ID_PLAYER) {
			getState().gameData.player.units.find(u => u.id === unit.id)!.critical = unit.critical;
		}

		console.log(`Increase Critical (${type}) applied to ${unit.id}, new critical: ${unit.critical}`);
		return true;
	}
});

const decreaseCooldownOnType = (type: string) => () => ({
	id: `decrease_cooldown_on_${type}`,
	name: t("shop.orbs.decreaseCooldown.name", { type }),
	color: 0xff3333,
	tooltip: t("shop.orbs.decreaseCooldown.tooltip", { type }),
	effect: (unit: Unit) => {
		if (!unit.effects.find(eff => eff.id === type)) return false;

		unit.cooldown = Math.max(1000, unit.cooldown * 0.9);

		if (unit.force === FORCE_ID_PLAYER) {
			getState().gameData.player.units.find(u => u.id === unit.id)!.cooldown = unit.cooldown;
		}

		console.log(`Decrease Cooldown (${type}) applied to ${unit.id}, new cooldown: ${unit.cooldown}`);
		return true;
	}
});



export const orbsIndex: Record<
	string,
	() => OrbSpec
> = {
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
		effect: (unit: Unit) => {
			upgradeUnit(unit);
			return true;
		},
	}),
	increase_core_max_life: () => ({
		id: "increase_core_max_life",
		name: t("shop.orbs.increaseMaxLife.name"),
		color: 0x3399ff,
		tooltip: t("shop.orbs.increaseMaxLife.tooltip"),
		effect: (unit: Unit) => {
			if (!unit.isCore) return false;
			unit.maxLife = unit.maxLife + 100;
			unit.life = unit.maxLife;
			return true;
		},
	}),
	decrease_core_cooldown: () => ({
		id: "decrease_core_cooldown",
		name: t("shop.orbs.decreaseCoreCooldown.name"),
		color: 0x3399ff,
		tooltip: t("shop.orbs.decreaseCoreCooldown.tooltip"),
		effect: (unit: Unit) => {
			if (!unit.isCore) return false;
			const reduction = unit.cooldown * 0.1;
			unit.cooldown = Math.max(1000, unit.cooldown - reduction);
			return true;
		},
	}),
	add_core_random_reaction: () => ({
		id: "add_core_random_reaction",
		name: t("shop.orbs.addRandomReaction.name"),
		color: 0x3399ff,
		tooltip: t("shop.orbs.addRandomReaction.tooltip"),
		effect: (unit: Unit) => {
			if (!unit.isCore) return false;
			unit.reactions.push({
				position: pickOne(["row_allies", "column_allies"]),
				effectId: pickOne([
					"damage",
					"shield",
					"poison",
					"heal",
					"regen"
				]),
				effects: [
					{
						"id": pickOne([
							"heal",
							"regen",
							"shield",
							"poison",
							"damage"
						])
					}
				]
			})
			return true;
		},
	}),
	distribute_power_orb: () => ({
		id: "distribute_power_orb",
		name: t("shop.orbs.distributePower.name"),
		color: 0xffaa00,
		tooltip: t("shop.orbs.distributePower.tooltip"),
		effect: (unit: Unit) => {
			const targets = resolveTargets(unit, {
				id: "distribute_power",
				targets: {
					id: "row_allies"
				}
			});
			distributePower(unit, targets);
			return true;
		}
	}),
	absorb_power_orb: () => ({
		id: "absorb_power_orb",
		name: t("shop.orbs.absorbPower.name"),
		color: 0xaa00ff,
		tooltip: t("shop.orbs.absorbPower.tooltip"),
		effect: (unit: Unit) => {
			const targets = resolveTargets(unit, {
				id: "absorb_power",
				targets: {
					id: "row_allies"
				}
			});
			absorbPower(unit, targets);
			return true;
		}
	}),
	sacrifice_effect_orb: () => ({
		id: "sacrifice_effect_orb",
		name: t("shop.orbs.darkRitual.name"),
		color: 0x550000,
		tooltip: t("shop.orbs.darkRitual.tooltip"),
		effect: (unit: Unit) => {
			sacrificeEffect(unit);
			return true;
		}
	}),
	increase_power_on_haste: increasePowerOnType("haste"),
	decrease_cooldown_on_haste: decreaseCooldownOnType("haste"),
	increase_power_on_slow: increasePowerOnType("slow"),
	decrease_cooldown_on_slow: decreaseCooldownOnType("slow"),
	increase_power_on_charge: increasePowerOnType("charge"),
	decrease_cooldown_on_charge: decreaseCooldownOnType("charge"),
};
