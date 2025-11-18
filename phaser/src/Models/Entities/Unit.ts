import * as uuid from "uuid";
import { CardDefinition, getCardDefinition } from "./Card";
import * as TriggerSystem from "../../TriggerSystem/TriggerSystem";

export type Unit = {
	id: string;
	cardId: string;
	name: string;
	pic: string;
	force: string;
	position: Vec2;

	rank: number;

	power: number;

	lifesteal?: boolean;
	critical?: number;
	reflect?: number;

	// Core attributes
	life: number;
	maxLife: number;
	shield: number;
	poison: number;
	regen: number;

	cooldown: number;
	evade: number;

	effects: TriggerSystem.Effect[];
	reactions: TriggerSystem.EffectReaction[];

	charge: number; // each tick the job's agi is added here. when it reaches 100, the job can act
	refresh: number; // the time it takes for the job to act again. Even if charged, this must be 0

	hasted: number;
	slowed: number;

	isCore: boolean;
};

export const makeUnit = (force: string, cardId: string, position = { x: 0, y: 0 }): Unit => {
	const card = getCardDefinition(cardId);

	return createUnitFromCardSpec(force, card, position, uuid.v4()) as Unit;
};

export function createUnitFromCardSpec(
	force: string,
	cardDef: CardDefinition,
	position: Vec2 = { x: 0, y: 0 },
	id: string
): Unit {
	const effects = cardDef.effects ?? [];

	const reactions = cardDef.reactions ?? [];

	return {
		id,
		cardId: cardDef.id,
		name: cardDef.name,
		pic: cardDef.pic,
		force,
		position,
		power: cardDef.power || 0,
		cooldown: cardDef.cooldown,
		evade: 0,
		rank: 1,
		effects,
		reactions,
		charge: 0,
		refresh: 0,
		hasted: 0,
		slowed: 0,
		isCore: cardDef.isCore || false,
		life: cardDef.life || 0,
		maxLife: cardDef.life || 0,
		critical: cardDef.critical || 0,
		shield: 0,
		regen: 0,
		poison: 0,
	};
}

export const testCardDefinitions = {
	basicWarrior: {
		id: "basic-warrior",
		name: "Basic Warrior",
		pic: "warrior.png",
		power: 30,
		cooldown: 100,
	},
	basicHealer: {
		id: "basic-healer",
		name: "Basic Healer",
		pic: "healer.png",
		power: 20,
		cooldown: 120,
	},
	basicTank: {
		id: "basic-tank",
		name: "Basic Tank",
		pic: "tank.png",
		power: 15,
		cooldown: 80,
	},
} as const;

export function isCritical(u: Unit) {
	return !!u.critical && Math.random() * 100 < u.critical;
}

function upgradeEffect(rank: number, eff: TriggerSystem.Effect) {
	if (["damage", "heal", "shield", "poison", "regen"].includes(eff.id)) return;

	if (["increase_power", "multiply_power", "increase_critical"].includes(eff.id)) {
		if ("amount" in eff) {
			if (rank === 2) eff.amount = eff.amount * 2;
			else if (rank === 3) eff.amount = eff.amount + eff.amount / 2;
			else if (rank === 4) eff.amount = eff.amount + eff.amount / 2;
		}
	}

	// For now, only increase durationi (also evaluate increasing targets)
	if (["haste", "slow", "charge"].includes(eff.id)) {
		if ("duration" in eff) {
			if (rank === 2) eff.duration = eff.duration * 2;
			else if (rank === 3) eff.duration = eff.duration + eff.duration / 2;
			else if (rank === 4) eff.duration = eff.duration + eff.duration / 2;
		}
	}
}

export function upgradeUnitEffects(unit: Unit) {
	unit.effects.forEach((eff) => {
		upgradeEffect(unit.rank, eff);
	});

	unit.reactions.forEach((r) => {
		r.effects.forEach((eff) => {
			upgradeEffect(unit.rank, eff);
		});
	});
}
