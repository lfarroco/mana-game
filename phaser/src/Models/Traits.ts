// traits are a way to add special abilities or characteristics to cards
// feature like "taunt", "flying", "trample", etc.

import { popText } from "../Systems/Chara/Animations/popText";
import { damageUnit, healUnit, updateUnitAttribute } from "../Systems/Chara/Chara";
import { pickRandom } from "../utils";
import { FORCE_ID_CPU, FORCE_ID_PLAYER } from "../Scenes/Battleground/constants";
import { addStatus, endStatus, State } from "./State";
import { Unit } from "./Unit";
import { UNIT_EVENTS, UnitEvents } from "./UnitEvents";

let state: State;

export const init = (_sceneRef: Phaser.Scene, stateRef: State) => {
	state = stateRef;
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

// Handler type constants
export const HANDLER_ON_TURN_START = 'onTurnStart' as const;
export const HANDLER_ON_TURN_END = 'onTurnEnd' as const;
export const HANDLER_ON_BATTLE_START = 'onBattleStart' as const;
export const HANDLER_ON_BATTLE_END = 'onBattleEnd' as const;

// Target handler type constants
export const TARGET_HANDLER_ON_ATTACK_BY_ME = 'onAttackByMe' as const;
export const TARGET_HANDLER_ON_DEFEND_BY_ME = 'onDefendByMe' as const;
export const TARGET_HANDLER_ON_UNIT_KILL_BY_ME = 'onUnitKillByMe' as const;
export const TARGET_HANDLER_ON_UNIT_KILL = 'onUnitKill' as const;
export const TARGET_HANDLER_ON_ALLIED_KILLED = 'onAlliedKilled' as const;
export const TARGET_HANDLER_ON_ENEMY_KILLED = 'onEnemyKilled' as const;

export type Trait = {
	id: TraitId;
	name: string;
	description: string;
	categories: TraitCategory[];
	events: UnitEvents
};

export const TRAIT_CATEGORY_PERSONALITY = "personality" as TraitCategory;
export const TRAIT_CATEGORY_OFFENSIVE = "offensive" as TraitCategory;
export const TRAIT_CATEGORY_DEFENSIVE = "defensive" as TraitCategory;
export const TRAIT_CATEGORY_VISION = "vision" as TraitCategory;
export const TRAIT_CATEGORY_HP = "hp" as TraitCategory;
export const TRAIT_CATEGORY_ATTACK = "attack" as TraitCategory;

const makeTrait = (
	{
		id,
		name,
		description,
		categories,
		events = {}
	}: {
		id: TraitId;
		name: string;
		description: string;
		categories: TraitCategory[];
		events?: Partial<UnitEvents>;
	}): Trait => ({
		id,
		name,
		description,
		categories,
		events: {
			... (UNIT_EVENTS.reduce((acc, event) => {
				acc[event] = [];
				return acc;
			}, {} as UnitEvents)),
			...events
		},
	});

export const LONE_WOLF: Trait = makeTrait({
	id: "lone_wolf" as TraitId,
	name: "Lone Wolf",
	description: "+30 HP when alone in a row",
	categories: [TRAIT_CATEGORY_DEFENSIVE, TRAIT_CATEGORY_PERSONALITY, TRAIT_CATEGORY_HP],
	events: {
		onEnterPosition: [(unit) => async () => {
			const neighboringUnits = state.battleData.units
				.filter((u) => {
					u.position.x === unit.position.x && u.id !== unit.id
				});
			if (neighboringUnits.length === 0) {
				await popText({ text: "+Shy", targetId: unit.id, speed: 2 });
				updateUnitAttribute(unit, "maxHp", 30);
			}
		}],
		onLeavePosition: [(unit) => async () => {
			const neighboringUnits = state.battleData.units
				.filter((u) => {
					u.position.x === unit.position.x && u.id !== unit.id
				});
			if (neighboringUnits.length === 0) {
				await popText({ text: "-Shy", targetId: unit.id, speed: 2 });
				updateUnitAttribute(unit, "maxHp", -30);
			}
		}]
	}
})

export const BRAVE: Trait = makeTrait({
	id: "brave" as TraitId,
	name: "Brave",
	description: "+10 attack when in the front row",
	categories: [TRAIT_CATEGORY_ATTACK, TRAIT_CATEGORY_PERSONALITY, TRAIT_CATEGORY_OFFENSIVE],
	events: {
		onEnterPosition: [(unit) => async () => {
			const frontline = LINES[unit.force].FRONT;
			if (unit.position.x !== frontline) return;

			await popText({ text: "+Brave", targetId: unit.id });
			await updateUnitAttribute(unit, "attack", 5);
		}],
		onLeavePosition: [(unit) => async () => {
			const frontline = LINES[unit.force].FRONT;
			if (unit.position.x !== frontline) return;

			await popText({ text: "-Brave", targetId: unit.id });
			await updateUnitAttribute(unit, "attack", -5);
		}]
	}
});

export const BATTLE_HUNGER: Trait = makeTrait({
	id: "battle_hunger" as TraitId,
	name: "Battle Hunger",
	categories: [TRAIT_CATEGORY_ATTACK, TRAIT_CATEGORY_PERSONALITY, TRAIT_CATEGORY_OFFENSIVE],
	description: "+1 attack on each attack",
	events: {
		onAttackByMe: [(unit, _target) => async () => {
			await popText({ text: "On attack: Battle Hunger", targetId: unit.id, speed: 2 });
			await updateUnitAttribute(unit, "attack", 1);
		}]
	}
});

export const SHARP_EYES: Trait = makeTrait({
	id: "sharp_eyes" as TraitId,
	name: "Sharp Eyes",
	description: "Increases critical hit chance by 10%",
	categories: [TRAIT_CATEGORY_ATTACK, TRAIT_CATEGORY_OFFENSIVE, TRAIT_CATEGORY_VISION],
	events: {
		onEnterPosition: [(unit) => async () => {
			await popText({ text: "+Sharp Eyes", targetId: unit.id });
			updateUnitAttribute(unit, "crit", 10);
		}],
		onLeavePosition: [(unit) => async () => {
			await popText({ text: "-Sharp Eyes", targetId: unit.id });
			updateUnitAttribute(unit, "crit", -10);
		}]
	}
});

export const TAUNT: Trait = makeTrait({
	id: "taunt" as TraitId,
	name: "Taunt",
	description: "If in range, enemies will attackthis unit",
	categories: [TRAIT_CATEGORY_DEFENSIVE, TRAIT_CATEGORY_PERSONALITY],
	events: {}
});

export const PROTECTOR: Trait = makeTrait({
	id: "protector" as TraitId,
	name: "Protector",
	description: "Units in the same column have +5 defense",
	categories: [TRAIT_CATEGORY_DEFENSIVE, TRAIT_CATEGORY_PERSONALITY],
	events: {
		onEnterPosition: [(unit) => async () => {
			const neighboringUnits = state.battleData.units
				.filter(u => {
					u.position.x === unit.position.x
				})
			if (neighboringUnits.length > 0) {
				await popText({ text: "+Protector", targetId: unit.id, speed: 2 });
				updateUnitAttribute(unit, "defense", 5);
			}
		}],
		onLeavePosition: [(unit) => async () => {
			const neighboringUnits = state.battleData.units
				.filter(u => {
					u.position.x === unit.position.x
				})
			if (neighboringUnits.length > 0) {
				await popText({ text: "-Protector", targetId: unit.id, speed: 2 });
				updateUnitAttribute(unit, "defense", -5);
			}
		}]
	}
});

// Feature	Description
// Splash	40% of this unit’s Atk is dealt as damage to each adjacent enemy when you attack.
// Stealth	Cannot be targeted by enemy units or abilities until this unit makes its first attack.
// Assassin	First attack deals double damage, then this unit loses Stealth.
// Rally	At the start of combat, grants +5 Atk to all allied units in the same row.
// Heal	At the end of each turn, heals 20 HP to each adjacent allied unit.
// AoE	At the end of each turn, deals 15 damage to all enemy units.
// Guard	When attacked, reduces incoming damage by 10 (after all other modifiers).
// Flex	At the start of combat, may swap positions with any allied unit in an adjacent column.
// Last Stand	Upon death, deals 50% of this unit’s Atk as damage to all adjacent enemies.

export const SNIPER = makeTrait({
	id: "sniper" as TraitId,
	name: "Sniper",
	description: "When placed in the back row, this unit gains +10 attack",
	categories: [TRAIT_CATEGORY_OFFENSIVE],
	events: {
		onEnterPosition: [unit => async () => {
			if (!isInBackline(unit)) return;

			await popText({ text: "+Sniper", targetId: unit.id, speed: 2 });
			updateUnitAttribute(unit, "attack", 10);
		}],
		onLeavePosition: [unit => async () => {
			if (!isInBackline(unit)) return;

			await popText({ text: "-Sniper", targetId: unit.id, speed: 2 });
			updateUnitAttribute(unit, "attack", -10);
		}]
	}
});

export const BERSERK = makeTrait({
	id: "berserk" as TraitId,
	name: "Berserk",
	description: "When your health dropd below 50% HP for the first time, gain +15 Atk for the rest of combat",
	categories: [TRAIT_CATEGORY_OFFENSIVE],
	events: {
		onHalfHP: [(unit) => async () => {
			const hasBerserk = unit.statuses["berserk"];
			if (hasBerserk) return;
			await popText({ text: "On Half HP: Berserk", targetId: unit.id, speed: 2 });
			updateUnitAttribute(unit, "attack", 15);
			addStatus(unit, "berserk", Infinity);
		}]
	}
});

export const SPLASH = makeTrait({
	id: "splash" as TraitId,
	name: "Splash",
	description: "40% of this unit’s Atk is dealt as damage to each adjacent enemy when you attack.",
	categories: [TRAIT_CATEGORY_OFFENSIVE],
	events: {
		onAttackByMe: [(unit, target, damage, isCritical) => async () => {
			const neighboringUnits = state.battleData.units
				.filter(u => u.position.x === target.position.x && u.id !== unit.id);
			for (const neighboringUnit of neighboringUnits) {
				await damageUnit(neighboringUnit.id, damage * 0.4, isCritical);
			}
		}]
	}
});

export const STEALTH = makeTrait({
	id: "stealth" as TraitId,
	name: "Stealth",
	description: "Cannot be targeted by enemy units or abilities until this unit makes its first attack.",
	categories: [TRAIT_CATEGORY_OFFENSIVE],
	events: {
		onBattleStart: [(unit) => async () => {
			await popText({ text: "On Battle Start: Stealth", targetId: unit.id, speed: 2 });
		}],
		onAttackByMe: [(unit) => async () => {
			if (!unit.statuses["stealth"]) return;
			await popText({ text: "Remove Stealth", targetId: unit.id, speed: 2 });
			endStatus(unit.id, "stealth");
		}]
	}
});

export const ASSASSIN = makeTrait({
	id: "assassin" as TraitId,
	name: "Assassin",
	description: "First attack deals double damage",
	categories: [TRAIT_CATEGORY_OFFENSIVE],
	events: {
		onBattleStart: [(unit) => async () => {
			addStatus(unit, "double_damage", Infinity);
		}],
		onAfterAttackByMe: [(unit) => async () => {
			if (!unit.statuses["double_damage"]) return;
			endStatus(unit.id, "double_damage");
		}]
	}
});

export const RALLY = makeTrait({
	id: "rally" as TraitId,
	name: "Rally",
	description: "At the start of combat, grants +5 Atk to all allied units in the same column.",
	categories: [TRAIT_CATEGORY_OFFENSIVE],
	events: {
		onBattleStart: [(unit) => async () => {
			const neighboringUnits = getColumnNeighbors(unit);
			for (const neighboringUnit of neighboringUnits) {
				await popText({ text: "+Rally", targetId: neighboringUnit.id, speed: 2 });
				updateUnitAttribute(neighboringUnit, "attack", 5);
			}
		}]
	}
});

export const EVADE = makeTrait({
	id: "evade" as TraitId,
	name: "Evade",
	description: "Adds a 20% chance to dodge an attack",
	categories: [TRAIT_CATEGORY_DEFENSIVE],
	events: {
		onBattleStart: [(unit) => async () => {
			updateUnitAttribute(unit, "evade", 20);
		}]
	}
});

export const CURSE = makeTrait({
	id: "curse" as TraitId,
	name: "Curse",
	description: "Reduces the target's damage by 5 on each attack",
	categories: [TRAIT_CATEGORY_DEFENSIVE],
	events: {
		onAfterAttackByMe: [(_unit, target, _damage, _critical, evaded) => async () => {
			if (evaded) return;

			await popText({ text: "Curse", targetId: target.id, speed: 2 });
			updateUnitAttribute(target, "attack", -5);
		}]
	}
});

export const LIFESTEAL = makeTrait({
	id: "lifesteal" as TraitId,
	name: "Lifesteal",
	description: "Heals 50% of the damage dealt",
	categories: [TRAIT_CATEGORY_DEFENSIVE],
	events: {
		onAfterAttackByMe: [(unit, _target, damage, _critical, evaded) => async () => {
			if (evaded) return;
			await popText({ text: "Lifesteal", targetId: unit.id, speed: 2 });
			healUnit(unit, damage * 0.5);
		}]
	}
});

export const LACERATE = makeTrait({
	id: "lacerate" as TraitId,
	name: "Lacerate",
	description: "For 2 turns: deals 10 damage to the target at the end of each turn",
	categories: [TRAIT_CATEGORY_OFFENSIVE],
	events: {
		onAfterAttackByMe: [(_unit, target) => async () => {
			// TODO: implement status
			await popText({ text: "Lacerate", targetId: target.id, speed: 2 });
			addStatus(target, "lacerate", 2);
		}]
	}
});

export const REGENERATE = makeTrait({
	id: "regenerate" as TraitId,
	name: "Regenerate",
	description: "Heals 15 HP at the end of each turn",
	categories: [TRAIT_CATEGORY_DEFENSIVE],
	events: {
		onTurnEnd: [(unit) => async () => {
			await popText({ text: "Regenerate", targetId: unit.id, speed: 2 });
			healUnit(unit, 15);
		}]
	}
});

export const getTrait = () => (id: TraitId): Trait => {
	const trait = traits[id];
	if (!trait) {
		throw new Error(`Trait with id ${id} not found`);
	}
	return trait;
}

// Future traits: check docs/traits/md

export const traits: { [id: TraitId]: Trait } = {
	[LONE_WOLF.id]: LONE_WOLF,
	[BRAVE.id]: BRAVE,
	[BATTLE_HUNGER.id]: BATTLE_HUNGER,
	[SHARP_EYES.id]: SHARP_EYES,
	[TAUNT.id]: TAUNT,
	[PROTECTOR.id]: PROTECTOR,
	[SNIPER.id]: SNIPER,
	[BERSERK.id]: BERSERK,
	[SPLASH.id]: SPLASH,
	[STEALTH.id]: STEALTH,
	[ASSASSIN.id]: ASSASSIN,
};

export const randomCategoryTrait = (category: TraitCategory): Trait => {
	const traitsInCategory = Object.values(traits).filter(t => t.categories.includes(category));
	if (traitsInCategory.length === 0) {
		throw new Error(`No traits found for category ${category}`);
	}
	const [randomTrait] = pickRandom(traitsInCategory, 1)
	return randomTrait;
}

function getColumnNeighbors(unit: Unit) {
	return state.battleData.units
		.filter(u => u.position.x === unit.position.x && u.id !== unit.id);
}

export function addUnitTrait(trait: Trait, unit: Unit) {

	UNIT_EVENTS.forEach(event => {
		// the type system doesn't capture that the events are the same
		//@ts-ignore
		unit.events[event].push(...trait.events[event]);
	});

	unit.traits.push(trait);
}
