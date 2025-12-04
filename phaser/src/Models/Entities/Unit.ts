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
	bonusPower: number;

	lifesteal?: boolean;
	critical?: number;
	reflect?: number;

	// Core attributes
	life: number;
	maxLife: number;
	shield: number;
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
	const effects = structuredClone(cardDef.effects ?? []);
	const reactions = structuredClone(cardDef.reactions ?? []);

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
		bonusPower: 0,
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


export function calculateCritical(u: Unit): { isCritical: boolean; multiplier: number } {
	const critChance = u.critical || 0;
	const effectiveCritChance = Math.min(critChance, 100);
	const excessCrit = Math.max(critChance - 100, 0);

	const isCritical = critChance > 0 && Math.random() < effectiveCritChance / 100;

	if (isCritical) {
		// Base crit multiplier is 2x, plus any excess crit as bonus damage
		const multiplier = 2 + (excessCrit / 100);
		return { isCritical: true, multiplier };
	}

	return { isCritical: false, multiplier: 1 };
}

export function isCritical(u: Unit): boolean {
	return calculateCritical(u).isCritical;
}

function upgradeEffect(rank: number, eff: TriggerSystem.Effect) {
	if (["damage", "heal", "shield", "poison", "regen"].includes(eff.id)) return;

	if (["increase_power", "multiply_power", "increase_critical"].includes(eff.id)) {
		if ("amount" in eff) {
			eff.amount = eff.amount * rank;
		}
	}

	if ("targets" in eff) {
		if ("count" in eff.targets) {
			eff.targets.count = rank;
		}
	}

	if (["charge"].includes(eff.id)) {
		if ("duration" in eff) {
			eff.duration = eff.duration * rank;
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

export function resetUnitEffectsToCardDefinition(unit: Unit, cardDef: CardDefinition) {
	unit.effects = structuredClone(cardDef.effects ?? []);
	unit.reactions = structuredClone(cardDef.reactions ?? []);
}

export function upgradeUnitData(unit: Unit) {
	const source = getCardDefinition(unit.cardId);

	unit.rank += 1;

	if (source.power)
		unit.power = (source.power * unit.rank) + unit.bonusPower;

	resetUnitEffectsToCardDefinition(unit, source);
	upgradeUnitEffects(unit);
}
