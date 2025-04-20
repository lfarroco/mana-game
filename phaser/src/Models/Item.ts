import { v4 } from "uuid";
import { healUnit } from "../Systems/Chara/Chara";
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
	type: {
		key: "instant",
		onUse: (u: Unit) => void;

	} | Equipment | {
		key: "material",
	}
}

export const instantItem = (name: string, icon: string, onUse: (u: Unit) => void): Item => ({
	id: v4(),
	name,
	icon,
	type: {
		key: "instant",
		onUse
	}
});

export const equipmentItem = (name: string, icon: string, events: Partial<Equipment>): Item => ({
	id: v4(),
	name,
	icon,
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
	RED_POTION: () => equipmentItem('Red Potion', 'items/red_potion', {
		onHalfHP: (u) => {
			healUnit(u, 30);
			burnConsumableInBattle(u.id);
		}
	}),
	IRON_SWORD: () => equipmentItem('Iron Sword', 'items/iron_sword', {
		onEquip: (u) => {
			u.attack += 5;
		},
		onUnequip: (u) => {
			u.attack -= 5;
		}
	})
}