// traits are a way to add special abilities or characteristics to cards
// feature like "taunt", "flying", "trample", etc.

import { popText } from "../Systems/Chara/Animations/popText";
import { pickRandom } from "../utils";
import { FORCE_ID_CPU, FORCE_ID_PLAYER } from "../Scenes/Battleground/constants";
import { getState, State } from "./State";
import { Unit } from "./Unit";
import { makeAttackEvent, makeUnitEvent, UNIT_EVENTS, UnitEvents } from "./UnitEvents";
import { getChara } from "../Scenes/Battleground/Systems/CharaManager";
import { slash } from "../Systems/Chara/Skills/slash";
import BattlegroundScene from "../Scenes/Battleground/BattlegroundScene"; // Ensure BattlegroundSceneType for type annotation
import { shoot } from "../Systems/Chara/Skills/shoot"; // Assuming this import is correct
import { healing } from "../Systems/Chara/Skills/healing";
import { healingWave } from "../Systems/Chara/Skills/healingWave";
import { arcaneMissiles } from "../Systems/Chara/Skills/arcaneMissiles";
import { haste } from "../Systems/Chara/Skills/haste";
import { slow } from "../Systems/Chara/Skills/slow";
import { updatePlayerGoldIO } from "./Force";
import * as UnitEvents_ from "./UnitEvents"; // Adjusted imports
import { summon } from "../Systems/Chara/Skills/summon";

let state: State;
let scene: BattlegroundScene;

export const init = (sceneRef: BattlegroundScene, stateRef: State) => {
	state = stateRef;
	scene = sceneRef;
}

export type TraitId = string & { __traitId: never };
export type TraitCategory = string & { __traitCategory: never };

export const LINES: {
	[force: string]: {
		FRONT: number;
		MIDDLE: number;
		BACK: number;
	}
} = {
	[FORCE_ID_PLAYER]: {
		FRONT: 4,
		MIDDLE: 5,
		BACK: 6,
	},
	[FORCE_ID_CPU]: {
		FRONT: 1,
		MIDDLE: 2,
		BACK: 3,
	}
}

export const isInFrontline = (unit: Unit): boolean => {
	const frontline = LINES[unit.force].FRONT;
	return unit.position.y === frontline;
}
export const isInMiddleline = (unit: Unit): boolean => {
	const middleline = LINES[unit.force].MIDDLE;
	return unit.position.y === middleline;
}
export const isInBackline = (unit: Unit): boolean => {
	const backline = LINES[unit.force].BACK;
	return unit.position.y === backline;
}

export type Trait = {
	id: TraitId;
	[key: string]: any;
}

export const TRAIT_CATEGORY_PERSONALITY = "personality" as TraitCategory;
export const TRAIT_CATEGORY_OFFENSIVE = "offensive" as TraitCategory;
export const TRAIT_CATEGORY_DEFENSIVE = "defensive" as TraitCategory;
export const TRAIT_CATEGORY_ECONOMY = "economy" as TraitCategory;
export const TRAIT_CATEGORY_TRIBE = "tribe" as TraitCategory;
export const TRAIT_CATEGORY_COMPANION = "companion" as TraitCategory;
export const TRAIT_CATEGORY_VISION = "vision" as TraitCategory;
export const TRAIT_CATEGORY_HP = "hp" as TraitCategory;
export const TRAIT_CATEGORY_ATTACK = "attack" as TraitCategory;

// --- Generic Relic Effect Types ---
export type RelicEffectType =
	| "updatePlayerGoldOnBattleStart"
	| "reduceAlliedCooldownsOnBattleStart"
	| "increaseAlliedMaxHpOnBattleStart";
// Add more generic relic effect types here as needed

export type TraitData = { // Moved TraitData definition higher for visibility with RelicEvents
	id: TraitId;
	[key: string]: any;
};

export type TraitSpec = { // Renamed from Trait to TraitSpec
	id: TraitId;
	name: string;
	description: string;
	categories: TraitCategory[];
	unitEvents: UnitEvents;     // For when this trait is on a Unit (relic-specific event handling will be external)
	relicEffect?: RelicEffectType; // Optional: specifies the generic relic effect type
};

const makeTraitSpec = ( // Renamed from makeTrait
	{
		id,
		name,
		description,
		categories,
		unitEvents = {},
		relicEffect
	}: {
		id: TraitId;
		name: string;
		description: string;
		categories: TraitCategory[];
		unitEvents?: Partial<UnitEvents>;
		relicEffect?: RelicEffectType;
	}): TraitSpec => ({
		id,
		name,
		description,
		categories,
		unitEvents: {
			... (UNIT_EVENTS.reduce((acc, event) => {
				acc[event] = [];
				return acc;
			}, {} as UnitEvents)),
			...unitEvents
		},
		relicEffect
	});

export const TAUNT: TraitSpec = makeTraitSpec({
	id: "taunt" as TraitId,
	name: "Taunt",
	description: "If in range, enemies will attack this unit",
	categories: [TRAIT_CATEGORY_DEFENSIVE, TRAIT_CATEGORY_PERSONALITY],
	unitEvents: {}
});

export const SUPPORT = makeTraitSpec({
	id: "support" as TraitId,
	name: "Support",
	description: "This unit helps other units",
	categories: [],
	unitEvents: {}
});

export const RANGED = makeTraitSpec({
	id: "ranged" as TraitId,
	name: "Ranged",
	description: "This unit has a ranged attack",
	categories: [],
	unitEvents: {
		onAction: [makeUnitEvent(unit => async () => {
			shoot(scene)(unit)
		})]
	}
});

export const MELEE = makeTraitSpec({
	id: "melee" as TraitId,
	name: "Melee",
	description: "This unit has a melee attack",
	categories: [],
	unitEvents: {
		onAction: [makeUnitEvent(unit => async () => {
			slash(scene, unit)
		})]
	}
});

export const HEAL = makeTraitSpec({
	id: "heal" as TraitId,
	name: "Heal",
	description: "This can heal an ally",
	categories: [],
	unitEvents: {
		onAction: [makeUnitEvent(unit => async () => {
			healing(scene)(unit)
		})]
	}
});
export const HEALING_WAVE = makeTraitSpec({
	id: "healing_wave" as TraitId,
	name: "Healing",
	description: "Heals 3 allies",
	categories: [],
	unitEvents: {
		onAction: [makeUnitEvent(unit => async () => {
			healingWave(scene, unit)
		})]
	}
});

export const ARCANE_MISSILES = makeTraitSpec({
	id: "arcane_missiles" as TraitId,
	name: "Arcane Missiles",
	description: "Shoots 3 missiles that deal 5 damage each",
	categories: [],
	unitEvents: {
		onAction: [makeUnitEvent((unit, data) => async () => {
			arcaneMissiles(scene)(unit, data!)
		})]
	}
});

export const HASTE = makeTraitSpec({
	id: "haste" as TraitId,
	name: "Haste",
	description: "Hastes surrounding allies",
	categories: [],
	unitEvents: {
		onAction: [makeUnitEvent(unit => async () => {
			haste(scene, unit); // TODO: create standard interface for skills (scene)(unit)
		})]
	}
});

export const SLOW = makeTraitSpec({
	id: "slow" as TraitId,
	name: "Slow",
	description: "Slows an enemy for 2s",
	categories: [],
	unitEvents: {
		onAction: [makeUnitEvent(unit => async () => {
			slow(scene, unit);
		})]
	}
});


export const PLUNDER = makeTraitSpec({
	id: "plunder" as TraitId,
	name: "Plunder",
	description: "When this unit attacks, gain 1 gold",
	categories: [TRAIT_CATEGORY_ECONOMY],
	unitEvents: {
		onAttackByMe: [
			makeAttackEvent(
				(unit) => async () => {
					if (unit.force === FORCE_ID_PLAYER) {
						await popText({ text: "Plunder: +1 gold", targetId: unit.id, speed: 2 });
						updatePlayerGoldIO(scene, 1);
					}
				})]
	}
});

export const SUMMON = makeTraitSpec({
	id: "summon" as TraitId,
	name: "Summon", // TODO: change based on summon data
	description: "Summons a unit to fight on your side", // TODO: change based on summon data
	categories: [TRAIT_CATEGORY_COMPANION],
	unitEvents: {
		onAction: [makeUnitEvent((unit, data) => async () => {
			if (!data) {
				throw new Error(`Invalid summon data: ${JSON.stringify(data)} `)
			}
			const chara = getChara(unit.id);
			const slot = chara.parent.playerBoard.getEmptySlot(
				state.battleData.units.filter(u => u.force === unit.force),
				unit.force
			);
			if (!slot) return;

			summon(chara, data.summonId)

		})]
	}
});

export const REDUCE_CD = makeTraitSpec({
	id: "reduce_cd" as TraitId,
	name: "Reduce Cooldown",
	description: "Reduces all heroes' cooldowns",
	categories: [TRAIT_CATEGORY_COMPANION],
	relicEffect: "reduceAlliedCooldownsOnBattleStart"
});

export const INCREASE_MAX_HP = makeTraitSpec({
	id: "increase_max_hp" as TraitId,
	name: "Increase Max HP",
	description: "Increases all heroes' max HP",
	categories: [TRAIT_CATEGORY_COMPANION],
	relicEffect: "increaseAlliedMaxHpOnBattleStart"
});

export const GOLDEN_TOUCH = makeTraitSpec({
	id: "golden_touch" as TraitId,
	name: "Golden Touch",
	description: "Grants 5 gold at the start of battle.",
	categories: [TRAIT_CATEGORY_ECONOMY],
	relicEffect: "updatePlayerGoldOnBattleStart"
});

// --- Relic Trait Effect Functions ---
// These functions will be called by event listeners when a relic with the corresponding trait is active.

export function updatePlayerGoldEffect(scene: BattlegroundScene, traitData: TraitData) {
	const amountToGrant = traitData.amount;
	if (typeof amountToGrant !== 'number' || amountToGrant === 0) { // Allow negative for costs, though unlikely for battle start
		console.warn(`Relic Effect (PlayerGoldUpdate): Invalid or missing 'amount' in traitData for trait ID ${traitData.id}. Expected a non-zero number.`, traitData);
		return;
	}
	updatePlayerGoldIO(scene, amountToGrant);
}

export function alliedCooldownReductionEffect(_scene: BattlegroundScene, forceId: string, traitData: TraitData) {
	const percentReduction = traitData.percent;
	if (typeof percentReduction !== 'number' || percentReduction <= 0 || percentReduction >= 100) {
		console.warn(`Relic Effect (AlliedCooldownReduction): Invalid or missing 'percent' in traitData for trait ID ${traitData.id}. Expected a number > 0 and < 100.`, traitData);
		return;
	}
	const multiplier = 1 - (percentReduction / 100);
	// TODO: only allies
	getState().battleData.units
		.filter(u => u.force === forceId)
		.forEach(u => { // Assuming this should affect all units in battle
			u.cooldown = Math.max(100, Math.round(u.cooldown * multiplier));
			// If a visual update for cooldown is needed (e.g., on a Chara bar), trigger it here.
		});
}

export function alliedMaxHpIncreaseEffect(_scene: BattlegroundScene, forceId: string, traitData: TraitData) {
	const percentIncrease = traitData.percent;
	if (typeof percentIncrease !== 'number' || percentIncrease <= 0) {
		console.warn(`Relic Effect (AlliedMaxHpIncrease): Invalid or missing 'percent' in traitData for trait ID ${traitData.id}. Expected a positive number.`, traitData);
		return;
	}
	const multiplier = 1 + (percentIncrease / 100);
	// TODO: only allies
	getState().battleData.units
		.filter(u => u.force === forceId)
		.forEach(u => { // Assuming this should affect all units in battle
			u.maxHp = Math.round(u.maxHp * multiplier);
			u.hp = u.maxHp; // Also refill HP to new max
			const chara = getChara(u.id);
			if (chara) {
				chara.updateHpDisplay();
			}
		});
}

// TODO: remove this, use module import
export const traitSpecs: { [id: TraitId]: TraitSpec } = {
	[TAUNT.id]: TAUNT,
	[SUMMON.id]: SUMMON,
	[MELEE.id]: MELEE,
	[RANGED.id]: RANGED,
	[HEAL.id]: HEAL,
	[HEALING_WAVE.id]: HEALING_WAVE,
	[ARCANE_MISSILES.id]: ARCANE_MISSILES,
	[HASTE.id]: HASTE,
	[SUPPORT.id]: SUPPORT,
	[SLOW.id]: SLOW,
	[PLUNDER.id]: PLUNDER,
	[REDUCE_CD.id]: REDUCE_CD,
	[INCREASE_MAX_HP.id]: INCREASE_MAX_HP,
	[GOLDEN_TOUCH.id]: GOLDEN_TOUCH,
};

export const randomCategoryTrait = (category: TraitCategory): TraitSpec => {
	const traitsInCategory = Object.values(traitSpecs).filter(t => t.categories.includes(category));
	if (traitsInCategory.length === 0) {
		throw new Error(`No traits found for category ${category}`);
	}
	const [randomTrait] = pickRandom(traitsInCategory, 1)
	return randomTrait;
};

export const runUnitEventTraits = (id: UnitEvents_.UnitEventKeys) => (u: Unit) => {
	u.traits.forEach(t => {
		const spec = traitSpecs[t.id];
		const events: UnitEvents_.UnitEvent[] = spec.unitEvents[id];
		events.forEach(ev => {
			ev.fn(u, t)();
		});
	});
};

export const runAttackEventTraits = (id: UnitEvents_.AttackEventKeys, target: Unit, damage: number, isCritical: boolean, evaded: boolean) => (u: Unit) => {
	u.traits.forEach(t => {
		const spec = traitSpecs[t.id];
		const events: UnitEvents_.AttackEvent[] = spec.unitEvents[id];
		events.forEach(ev => {
			ev.fn(u, target, damage, isCritical, evaded)();
		});
	});
};

export const runUnitEventWithTargetTraits = (id: UnitEvents_.UnitEventWithTargetKeys, target: Unit) => (u: Unit) => {
	u.traits.forEach(t => {
		const spec = traitSpecs[t.id];
		const events: UnitEvents_.UnitEventWithTarget[] = spec.unitEvents[id];
		events.forEach(ev => {
			ev.fn(u, target)();
		});
	});
};
