// traits are a way to add special abilities or characteristics to cards
// feature like "taunt", "flying", "trample", etc.

import { popText } from "../Systems/Chara/Animations/popText";
import { damageUnit, healUnit, updateUnitAttribute } from "../Systems/Chara/Chara";
import { pickRandom } from "../utils";
import { FORCE_ID_CPU, FORCE_ID_PLAYER } from "../Scenes/Battleground/constants";
import { addStatus, endStatus, State } from "./State";
import { makeUnit, Unit } from "./Unit";
import { UNIT_EVENTS, UnitEvents } from "./UnitEvents";
import { summonChara } from "../Scenes/Battleground/Systems/UnitManager";
import { TINY_BLOB } from "./Card";
import { asVec2 } from "./Geometry";
import { getColumnNeighbors } from "./Board";
import { slash } from "../Systems/Chara/Skills/slash";
import BattlegroundScene from "../Scenes/Battleground/BattlegroundScene";
import { shoot } from "../Systems/Chara/Skills/shoot";

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
export const TRAIT_CATEGORY_TRIBE = "tribe" as TraitCategory;
export const TRAIT_CATEGORY_COMPANION = "companion" as TraitCategory;
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

export const VANGUARD: Trait = makeTrait({
	id: "vanguard" as TraitId,
	name: "Vanguard",
	description: "+10 attack when in the front row",
	categories: [TRAIT_CATEGORY_ATTACK, TRAIT_CATEGORY_PERSONALITY, TRAIT_CATEGORY_OFFENSIVE],
	events: {
		onEnterPosition: [(unit) => async () => {
			const frontline = LINES[unit.force].FRONT;
			if (unit.position.x !== frontline) return;

			await popText({ text: "+Vanguard", targetId: unit.id });
			await updateUnitAttribute(unit, "attackPower", 5);
		}],
		onLeavePosition: [(unit) => async () => {
			const frontline = LINES[unit.force].FRONT;
			if (unit.position.x !== frontline) return;

			await popText({ text: "-Vanguard", targetId: unit.id });
			await updateUnitAttribute(unit, "attackPower", -5);
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
			await updateUnitAttribute(unit, "attackPower", 1);
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

export const SNIPER = makeTrait({
	id: "sniper" as TraitId,
	name: "Sniper",
	description: "When placed in the back row, this unit gains +10 attack",
	categories: [TRAIT_CATEGORY_OFFENSIVE],
	events: {
		onEnterPosition: [unit => async () => {
			if (!isInBackline(unit)) return;

			await popText({ text: "+Sniper", targetId: unit.id, speed: 2 });
			updateUnitAttribute(unit, "attackPower", 10);
		}],
		onLeavePosition: [unit => async () => {
			if (!isInBackline(unit)) return;

			await popText({ text: "-Sniper", targetId: unit.id, speed: 2 });
			updateUnitAttribute(unit, "attackPower", -10);
		}]
	}
});

export const RANGED = makeTrait({
	id: "ranged" as TraitId,
	name: "Ranged",
	description: "This unit has a ranged attack",
	categories: [],
	events: {
		onAction: [unit => async () => {
			shoot(scene)(unit)
		}]
	}
});

export const MELEE = makeTrait({
	id: "melee" as TraitId,
	name: "Melee",
	description: "This unit has a melee attack",
	categories: [],
	events: {
		onAction: [unit => async () => {
			slash(scene, unit)
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
			updateUnitAttribute(unit, "attackPower", 15);
			addStatus(unit, "berserk");
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
	description: "After attacking, become untargetable for 1s",
	categories: [TRAIT_CATEGORY_OFFENSIVE],
	events: {
		onAttackByMe: [(_unit) => async () => {
			// TODO: implement
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
			addStatus(unit, "double_damage");
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
			const neighboringUnits = getColumnNeighbors(state, unit)
			for (const neighboringUnit of neighboringUnits) {
				await popText({ text: "+Rally", targetId: neighboringUnit.id, speed: 2 });
				updateUnitAttribute(neighboringUnit, "attackPower", 5);
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
			updateUnitAttribute(target, "attackPower", -5);
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
			addStatus(target, "lacerate", 2, u => async () => {
				await popText({ text: "Lacerate", targetId: u.id, speed: 2 });
				damageUnit(u.id, 10);
			});
		}]
	}
});

export const BURN = makeTrait({
	id: "burn" as TraitId,
	name: "Burn",
	description: "For 2 turns: deals 5 damage to the target at the end of each turn",
	categories: [TRAIT_CATEGORY_OFFENSIVE],
	events: {
		onAfterAttackByMe: [(_unit, target) => async () => {
			// TODO: implement status
			await popText({ text: "Burn", targetId: target.id, speed: 2 });
			addStatus(target, "burn", 2, u => async () => {
				await popText({ text: "Burn", targetId: u.id, speed: 2 });
				damageUnit(u.id, 5);
			});
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

export const SPLIT_BLOB = makeTrait({
	id: "split_blob" as TraitId,
	name: "Split Blob",
	description: "When this unit dies, it splits into 2 Tiny Blobs",
	categories: [TRAIT_CATEGORY_DEFENSIVE],
	events: {
		onDeath: [(unit) => async () => {

			console.log("SPLIT_BLOB:: unit", unit.id);

			// get 2 close empty slots
			let slots = []
			for (let x = 1; x <= 3; x++) {
				for (let y = 1; y <= 3; y++) {
					slots.push({ x, y });
				}
			}

			const allies = state.battleData.units.filter(u => u.force === unit.force && u.id !== unit.id);

			if (unit.force === FORCE_ID_PLAYER) {
				for (const slot of slots) {
					slot.x += 3;
				}
			}

			const emptySlots = slots.filter(slot => {
				const unitAtSlot = allies.find(u => u.position.x === slot.x && u.position.y === slot.y);
				return !unitAtSlot;
			});

			const targetSlots = emptySlots.slice(0, 2);

			for (const slot of targetSlots) {

				const newUnit = makeUnit(unit.force, TINY_BLOB, asVec2(slot))

				console.log("SPLIT_BLOB:: newUnit", newUnit.id);
				state.battleData.units.push(newUnit);
				await summonChara(newUnit)
			}

		}]
	}
});

export const REBORN = makeTrait({
	id: "reborn" as TraitId,
	name: "Reborn",
	description: "When this unit dies, it is revived with 1 HP",
	categories: [TRAIT_CATEGORY_DEFENSIVE],
	events: {
		onDeath: [(unit) => async () => {

			if (unit.statuses["reborn"]) return; // already reborn

			// create a new unit with the same id and position
			const newUnit = makeUnit(unit.force, unit.job, unit.position);
			newUnit.hp = 1;
			addStatus(newUnit, "reborn");

			state.battleData.units.push(newUnit);

			popText({ text: "Reborn", targetId: unit.id, speed: 2 });

			summonChara(newUnit, false, false);

		}]
	}
});

export const UNDEAD = makeTrait({
	id: "undead" as TraitId,
	name: "Undead",
	description: "This unit cannot be healed, but can be revived. It also immune to mind control and death effects.",
	categories: [TRAIT_CATEGORY_TRIBE],
	events: {}
});

export const UNDEAD_STRENGTH = makeTrait({
	id: "undead_strength" as TraitId,
	name: "Undead Strength",
	description: "Allied undead units gain +20 attack and HP",
	categories: [TRAIT_CATEGORY_OFFENSIVE, TRAIT_CATEGORY_DEFENSIVE],
	events: {
		onBattleStart: [(unit) => async () => {
			const allies = state.battleData.units.filter(u => u.force === unit.force && u.id !== unit.id);
			const undeadAllies = allies.filter(u => u.traits.some(t => t.id === UNDEAD.id));
			for (const undead of undeadAllies) {
				await popText({ text: "+Undead Strength", targetId: undead.id, speed: 2 });
				updateUnitAttribute(undead, "attackPower", 20);
				updateUnitAttribute(undead, "maxHp", 20);
			}
		}]
	}
});

// TODO: implement
export const SKELETON_WARRIOR = makeTrait({
	id: "skeleton_warrior" as TraitId,
	name: "Skeleton Warrior",
	description: "When recruited, this unit adds a Skeleton Warrior to your deck",
	categories: [TRAIT_CATEGORY_COMPANION],
	events: {}
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
	[VANGUARD.id]: VANGUARD,
	[BATTLE_HUNGER.id]: BATTLE_HUNGER,
	[SHARP_EYES.id]: SHARP_EYES,
	[TAUNT.id]: TAUNT,
	[PROTECTOR.id]: PROTECTOR,
	[SNIPER.id]: SNIPER,
	[BERSERK.id]: BERSERK,
	[SPLASH.id]: SPLASH,
	[STEALTH.id]: STEALTH,
	[ASSASSIN.id]: ASSASSIN,
	[RALLY.id]: RALLY,
	[EVADE.id]: EVADE,
	[CURSE.id]: CURSE,
	[LIFESTEAL.id]: LIFESTEAL,
	[LACERATE.id]: LACERATE,
	[BURN.id]: BURN,
	[REGENERATE.id]: REGENERATE,
	[SPLIT_BLOB.id]: SPLIT_BLOB,
	[REBORN.id]: REBORN,
	[SKELETON_WARRIOR.id]: SKELETON_WARRIOR,
	[UNDEAD.id]: UNDEAD,
	[UNDEAD_STRENGTH.id]: UNDEAD_STRENGTH,
	[MELEE.id]: MELEE,
	[RANGED.id]: RANGED,
};

export const randomCategoryTrait = (category: TraitCategory): Trait => {
	const traitsInCategory = Object.values(traits).filter(t => t.categories.includes(category));
	if (traitsInCategory.length === 0) {
		throw new Error(`No traits found for category ${category}`);
	}
	const [randomTrait] = pickRandom(traitsInCategory, 1)
	return randomTrait;
}

export function addUnitTrait(trait: Trait, unit: Unit) {

	UNIT_EVENTS.forEach(event => {
		// the type system doesn't capture that the events are the same
		//@ts-ignore
		unit.events[event].push(...trait.events[event]);
	});

	unit.traits.push(trait);
}
