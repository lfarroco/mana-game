import { Unit, } from "@Models/Entities/Unit";
import { increasePower } from "../../../../TriggerSystem/effects";
import { pickOne } from "../../../../utils";
import { upgradeUnit } from "@Systems/Chara/Chara";
import { distributePower } from "../../../../TriggerSystem/effects/distributePower";
import { absorbPower } from "../../../../TriggerSystem/effects/absorbPower";
import { sacrificeEffect } from "../../../../TriggerSystem/effects/sacrificeEffect";
import { resolveTargets } from "../../../../TriggerSystem/TriggerSystem";

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
	name: `Increase Power (${type})`,
	color: 0xff3333,
	tooltip: [
		"[color=#c0c0c0]Effect:[/color] [color=#ff8cc8]+power[/color] [color=#ffd93d]+10[/color]",
		`Drag to a unit of type [color=#e0e0e0] ${type}[/color] to apply`,
	].join("\n"),
	effect: (unit: Unit) => {
		if (!unit.effects.find(eff => eff.id === type)) return false;

		increasePower([unit], 10, false);
		console.log(`Increase Power (${type}) applied to ${unit.id}, new power: ${unit.power}`);
		return true;
	}
});

const increaseCriticalOnType = (type: string) => () => ({
	id: `increase_critical_on_${type}`,
	name: `Increase Critical (${type})`,
	color: 0xff3333,
	tooltip: [
		"[color=#c0c0c0]Effect:[/color] [color=#ff8cc8]+critical[/color] [color=#ffd93d]+10[/color]",
		`Drag to a unit of type [color=#e0e0e0] ${type}[/color] to apply`,
	].join("\n"),
	effect: (unit: Unit) => {
		if (!unit.effects.find(eff => eff.id === type)) return false;

		if (!unit.critical) {
			unit.critical = 0;
		}

		unit.critical = Math.min(100, unit.critical + 10);
		console.log(`Increase Critical (${type}) applied to ${unit.id}, new critical: ${unit.critical}`);
		return true;
	}
});

const decreaseCooldownOnType = (type: string) => () => ({
	id: `decrease_cooldown_on_${type}`,
	name: `Decrease Cooldown (${type})`,
	color: 0xff3333,
	tooltip: [
		"[color=#c0c0c0]Effect:[/color] [color=#ff8cc8]-cooldown[/color] [color=#ffd93d]10%[/color]",
		`Drag to a unit of type [color=#e0e0e0] ${type}[/color] to apply`,
	].join("\n"),
	effect: (unit: Unit) => {
		if (!unit.effects.find(eff => eff.id === type)) return false;

		unit.cooldown = Math.max(1000, unit.cooldown * 0.9);
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
		name: "Upgrade Orb",
		color: 0x3399ff,
		tooltip: "Upgrade a unit\nDrag to the unit to apply",
		effect: (unit: Unit) => {
			upgradeUnit(unit);
			return true;
		},
	}),
	add_haste: () => ({
		id: "add_haste_self",
		name: "Add Haste (self)",
		color: 0x3399ff,
		tooltip: "Add haste (self) to a unit\nDrag to the unit to apply",
		effect: (unit: Unit) => {
			unit.effects.push({
				id: "haste",
				duration: 1000,
				targets: {
					id: "self",
				},
			})
			return true;
		},
	}),
	add_slow: () => ({
		id: "add_slow",
		name: "Add Slow",
		color: 0x3399ff,
		tooltip: "Add slow to a unit\nDrag to the unit to apply",
		effect: (unit: Unit) => {
			unit.effects.push({
				id: "slow",
				duration: 1000,
				targets: {
					id: "random_enemy",
					count: 1
				},
			})
			return true;
		},
	}),
	increase_core_max_life: () => ({
		id: "increase_core_max_life",
		name: "Increase Max Life",
		color: 0x3399ff,
		tooltip: "Increase the crystal's max life by 100\nDrag to the crystal to apply",
		effect: (unit: Unit) => {
			if (!unit.isCore) return false;
			unit.maxLife = unit.maxLife + 100;
			unit.life = unit.maxLife;
			return true;
		},
	}),
	decrease_core_cooldown: () => ({
		id: "decrease_core_cooldown",
		name: "Decrease Cooldown",
		color: 0x3399ff,
		tooltip: "Decrease the core's cooldown by 10% (min: 1s)\nDrag to the crystal to apply",
		effect: (unit: Unit) => {
			if (!unit.isCore) return false;
			const reduction = unit.cooldown * 0.1;
			unit.cooldown = Math.max(1000, unit.cooldown - reduction);
			return true;
		},
	}),
	add_core_random_reaction: () => ({
		id: "add_core_random_reaction",
		name: "Add Random Reaction",
		color: 0x3399ff,
		tooltip: "Add a random reaction to the crystal\nDrag to the crystal to apply",
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
		name: "Power Distributor",
		color: 0xffaa00,
		tooltip: "Distribute 50% of this unit's power to row allies",
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
		name: "Power Absorber",
		color: 0xaa00ff,
		tooltip: "Absorb 25% power from row allies",
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
		name: "Dark Ritual",
		color: 0x550000,
		tooltip: "Sacrifice a random effect/reaction to gain 10 Power",
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

