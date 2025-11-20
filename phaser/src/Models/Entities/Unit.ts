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

function cloneEffects(effects: TriggerSystem.Effect[]): TriggerSystem.Effect[] {
	return effects.map((e) => {
		const clone = { ...e };
		if ("targets" in e && typeof (e as any).targets === "object") {
			(clone as any).targets = { ...(e as any).targets };
		}
		return clone;
	});
}

function cloneReactions(reactions: TriggerSystem.EffectReaction[]): TriggerSystem.EffectReaction[] {
	return reactions.map((r) => ({
		...r,
		effects: cloneEffects(r.effects),
	}));
}

export function createUnitFromCardSpec(
	force: string,
	cardDef: CardDefinition,
	position: Vec2 = { x: 0, y: 0 },
	id: string
): Unit {
	const effects = cloneEffects(cardDef.effects ?? []);
	const reactions = cloneReactions(cardDef.reactions ?? []);

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
	unit.effects = cloneEffects(cardDef.effects ?? []);
	unit.reactions = cloneReactions(cardDef.reactions ?? []);
}
