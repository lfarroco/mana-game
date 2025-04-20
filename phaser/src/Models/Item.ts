import { v4 } from "uuid";
import { healUnit, updateUnitAttribute } from "../Systems/Chara/Chara";
import { burnConsumableInBattle } from "../Systems/Item/EquipItem";
import { Unit } from "./Unit";

type Equipment = {
	key: "equipment",
	onEquip: (u: Unit) => void;
	onUnequip: (u: Unit) => void;
	onHalfHP: (u: Unit) => void;
	onDeath: (u: Unit) => void;
}

export type Item = {
	id: string;
	name: string;
	icon: string;
	description: string,
	type: {
		key: "instant",
		onUse: (u: Unit) => void;

	} | Equipment | {
		key: "material",
	}
}

export const instantItem = (name: string, icon: string, description: string, onUse: (u: Unit) => void): Item => ({
	id: v4(),
	name,
	icon,
	description,
	type: {
		key: "instant",
		onUse
	}
});

export const equipmentItem = (name: string, icon: string, description: string, events: Partial<Equipment>): Item => ({
	id: v4(),
	name,
	icon,
	description,
	type: {
		key: "equipment",
		onEquip: () => { },
		onUnequip: () => { },
		onHalfHP: () => { },
		onDeath: () => { },
		...events
	}
});

export const ITEMS = {
	RED_POTION: () => equipmentItem('Red Potion', 'items/red_potion', 'Heals 30 HP when below 50% HP', {
		onHalfHP: (u) => {
			healUnit(u, 30);
			burnConsumableInBattle(u.id);
		}
	}),
	IRON_SWORD: () => equipmentItem('Iron Sword', 'items/iron_sword', 'Increases attack by 5', attributeModifier('attack', 5)),
}

const attributeModifier = (attribute: keyof Unit, value: number) => (
	{
		onEquip: (u: Unit) => {
			updateUnitAttribute(u, attribute, value)
		},
		onUnequip: (u: Unit) => {
			updateUnitAttribute(u, attribute, value * -1)
		}
	}
)