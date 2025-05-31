import { v4 } from "uuid";
import { healUnit, updateUnitAttribute } from "../Systems/Chara/Chara";
import { Unit } from "./Unit";
import { UnitEvent } from "./UnitEvents";
import { images } from "../assets";

type Equipment = {
	key: "equipment",
	onEquip?: UnitEvent;
	onUnequip?: UnitEvent;
	onHalfHP?: UnitEvent;
	onDeath?: UnitEvent;
	onCombatStart?: UnitEvent;
}


export type Item = {
	id: string;
	name: string;
	cost: number;
	icon: string;
	description: string,
	type: {
		key: "instant",
		onUse: (u: Unit) => void;

	} | Equipment | {
		key: "material",
	}
}

export const instantItem = (name: string, icon: string, cost: number, description: string, onUse: (u: Unit) => void): Item => ({
	id: v4(),
	name,
	icon,
	cost,
	description,
	type: {
		key: "instant",
		onUse
	}
});

export const equipmentItem = (name: string, icon: string, cost: number, description: string, events: Partial<Equipment>): Item => ({
	id: v4(),
	name,
	icon,
	cost,
	description,
	type: {
		key: "equipment",
		...events
	}
});


export const ITEMS: { [id: string]: () => Item } = {
	RED_POTION: () => equipmentItem(
		'Red Potion',
		images.red_potion.key,
		4,
		'Heals 30 HP when below 50% HP', {
		onHalfHP: (u) => async () => {
			healUnit(u, 30);
		}
	}),
	TOXIC_POTION: () => equipmentItem(
		'Toxic Potion',
		images.toxic_potion.key,
		4,
		'Increases attack by 5 until the end of the battle', {
		onCombatStart: (u) => async () => {
			updateUnitAttribute(u, 'attackPower', 5);
		}
	}),
	IRON_SWORD: () => equipmentItem(
		'Iron Sword',
		images.iron_sword.key,
		10,
		'Increases attack by 5',
		attributeModifier('attackPower', 5),
	),
	GOLD_RING: () => equipmentItem(
		'Gold Ring',
		images.gold_ring.key,
		10,
		'Increases def by 5',
		attributeModifier('defense', 5),
	),
}

const attributeModifier = (attribute: keyof Unit, value: number) => (
	{
		onEquip: (u: Unit) => async () => {
			updateUnitAttribute(u, attribute, value)
		},
		onUnequip: (u: Unit) => async () => {
			updateUnitAttribute(u, attribute, value * -1)
		}
	}
)

export const getItem = (itemId: string): Item => {
	const item = ITEMS[itemId];

	if (!item) {
		throw new Error(`Invalid item id ${itemId}`)
	}

	return item()

}