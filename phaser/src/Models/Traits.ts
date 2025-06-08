// traits are a way to add special abilities or characteristics to cards
// feature like "taunt", "flying", "trample", etc.

import { popText } from "../Systems/Chara/Animations/popText";
import { pickRandom } from "../utils";
import { FORCE_ID_CPU, FORCE_ID_PLAYER } from "../Scenes/Battleground/constants";
import { addStatus, endStatus, getState, State } from "./State";
import { makeUnit, Unit } from "./Unit";
import { makeAttackEvent, makeUnitEvent, UNIT_EVENTS, UnitEvents } from "./UnitEvents";
import { getChara, summonChara } from "../Scenes/Battleground/Systems/CharaManager";
import { getColumnNeighbors } from "./Board";
import { slash } from "../Systems/Chara/Skills/slash";
import BattlegroundScene from "../Scenes/Battleground/BattlegroundScene";
import { shoot } from "../Systems/Chara/Skills/shoot"; // Assuming this import is correct
import { healing } from "../Systems/Chara/Skills/healing";
import { healingWave } from "../Systems/Chara/Skills/healingWave";
import { arcaneMissiles } from "../Systems/Chara/Skills/arcaneMissiles";
import { haste } from "../Systems/Chara/Skills/haste";
import { slow } from "../Systems/Chara/Skills/slow";
import { updatePlayerGoldIO } from "./Force";
import * as UnitEvents_ from "./UnitEvents"; // Adjusted imports

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

// --- Relic Event Types (New) ---
export type RelicBattleStartCallback = (relicTraitData: TraitData) => void; // Or IO if async behavior is needed
export type RelicBattleStartEvent = { fn: RelicBattleStartCallback };
export const makeRelicBattleStartEvent = (fn: RelicBattleStartCallback): RelicBattleStartEvent => ({ fn });

export type RelicEvents = {
	onBattleStart: RelicBattleStartEvent[];
	// Add other relic-specific events here if needed
};

export const RELIC_EVENT_KEYS: readonly (keyof RelicEvents)[] = ["onBattleStart"] as const;

export const createEmptyRelicEvents = (): RelicEvents => {
	const events = {} as RelicEvents;
	(RELIC_EVENT_KEYS as Array<keyof RelicEvents>).forEach(key => {
		events[key] = [];
	});
	return events;
};
// --- End Relic Event Types ---

export type TraitData = { // Moved TraitData definition higher for visibility with RelicEvents
	id: TraitId;
	[key: string]: any;
};

export type TraitSpec = { // Renamed from Trait to TraitSpec
	id: TraitId;
	name: string;
	description: string;
	categories: TraitCategory[];
	unitEvents: UnitEvents;     // For when this trait is on a Unit
	relicEvents: RelicEvents;   // For when this trait is on a Relic
};

const makeTraitSpec = ( // Renamed from makeTrait
	{
		id,
		name,
		description,
		categories,
		unitEvents = {},
		relicEvents = {}
	}: {
		id: TraitId;
		name: string;
		description: string;
		categories: TraitCategory[];
		unitEvents?: Partial<UnitEvents>;
		relicEvents?: Partial<RelicEvents>;
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
		relicEvents: {
			...createEmptyRelicEvents(),
			...relicEvents
		}
	});

export const LONE_WOLF: TraitSpec = makeTraitSpec({
	id: "lone_wolf" as TraitId,
	name: "Lone Wolf",
	description: "+30 HP when alone in a row",
	categories: [TRAIT_CATEGORY_DEFENSIVE, TRAIT_CATEGORY_PERSONALITY, TRAIT_CATEGORY_HP],
	unitEvents: {
		onEnterPosition: [makeUnitEvent((unit) => async () => {
			const neighboringUnits = state.battleData.units
				.filter((u) => {
					u.position.x === unit.position.x && u.id !== unit.id
				});
			if (neighboringUnits.length === 0) {
				await popText({ text: "+Shy", targetId: unit.id, speed: 2 });
				getChara(unit.id).updateUnitAttribute("maxHp", 30);
			}
		})],
		onLeavePosition: [makeUnitEvent((unit) => async () => {
			const neighboringUnits = state.battleData.units
				.filter((u) => {
					u.position.x === unit.position.x && u.id !== unit.id
				});
			if (neighboringUnits.length === 0) {
				await popText({ text: "-Shy", targetId: unit.id, speed: 2 });
				getChara(unit.id).updateUnitAttribute("maxHp", -30);
			}
		})]
	}
})

export const VANGUARD: TraitSpec = makeTraitSpec({
	id: "vanguard" as TraitId,
	name: "Vanguard",
	description: "+10 attack when in the front row",
	categories: [TRAIT_CATEGORY_ATTACK, TRAIT_CATEGORY_PERSONALITY, TRAIT_CATEGORY_OFFENSIVE],
	unitEvents: {
		onEnterPosition: [makeUnitEvent((unit) => async () => {
			const frontline = LINES[unit.force].FRONT;
			if (unit.position.x !== frontline) return;

			await popText({ text: "+Vanguard", targetId: unit.id });
			getChara(unit.id).updateUnitAttribute("attackPower", 5);
		})],
		onLeavePosition: [makeUnitEvent((unit) => async () => {
			const frontline = LINES[unit.force].FRONT;
			if (unit.position.x !== frontline) return;

			await popText({ text: "-Vanguard", targetId: unit.id });
			getChara(unit.id).updateUnitAttribute("attackPower", -5);
		})]
	}
});

export const BATTLE_HUNGER: TraitSpec = makeTraitSpec({
	id: "battle_hunger" as TraitId,
	name: "Battle Hunger",
	categories: [TRAIT_CATEGORY_ATTACK, TRAIT_CATEGORY_PERSONALITY, TRAIT_CATEGORY_OFFENSIVE],
	description: "+1 attack on each attack",
	unitEvents: {
		onAttackByMe: [makeAttackEvent((unit, _target) => async () => {
			await popText({ text: "On attack: Battle Hunger", targetId: unit.id, speed: 2 });
			getChara(unit.id).updateUnitAttribute("attackPower", 1);
		})]
	}
});

export const SHARP_EYES: TraitSpec = makeTraitSpec({
	id: "sharp_eyes" as TraitId,
	name: "Sharp Eyes",
	description: "Increases critical hit chance by 10%",
	categories: [TRAIT_CATEGORY_ATTACK, TRAIT_CATEGORY_OFFENSIVE, TRAIT_CATEGORY_VISION],
	unitEvents: {
		onEnterPosition: [makeUnitEvent((unit) => async () => {
			await popText({ text: "+Sharp Eyes", targetId: unit.id });
			getChara(unit.id).updateUnitAttribute("crit", 10);
		})],
		onLeavePosition: [makeUnitEvent((unit) => async () => {
			await popText({ text: "-Sharp Eyes", targetId: unit.id });
			getChara(unit.id).updateUnitAttribute("crit", -10);
		})]
	}
});

export const TAUNT: TraitSpec = makeTraitSpec({
	id: "taunt" as TraitId,
	name: "Taunt",
	description: "If in range, enemies will attack this unit",
	categories: [TRAIT_CATEGORY_DEFENSIVE, TRAIT_CATEGORY_PERSONALITY],
	unitEvents: {}
});

export const PROTECTOR: TraitSpec = makeTraitSpec({
	id: "protector" as TraitId,
	name: "Protector",
	description: "Units in the same column have +5 defense",
	categories: [TRAIT_CATEGORY_DEFENSIVE, TRAIT_CATEGORY_PERSONALITY],
	unitEvents: {
		onEnterPosition: [makeUnitEvent((unit) => async () => {
			const neighboringUnits = state.battleData.units
				.filter(u => {
					u.position.x === unit.position.x
				})
			if (neighboringUnits.length > 0) {
				await popText({ text: "+Protector", targetId: unit.id, speed: 2 });

				getChara(unit.id).updateUnitAttribute("defense", 10);
			}
		})],
		onLeavePosition: [makeUnitEvent((unit) => async () => {
			const neighboringUnits = state.battleData.units
				.filter(u => {
					u.position.x === unit.position.x
				})
			if (neighboringUnits.length > 0) {
				await popText({ text: "-Protector", targetId: unit.id, speed: 2 });
				getChara(unit.id).updateUnitAttribute("defense", -10);
			}
		})]
	}
});

export const SNIPER = makeTraitSpec({
	id: "sniper" as TraitId,
	name: "Sniper",
	description: "When placed in the back row, this unit gains +10 attack",
	categories: [TRAIT_CATEGORY_OFFENSIVE],
	unitEvents: {
		onEnterPosition: [makeUnitEvent(unit => async () => {
			if (!isInBackline(unit)) return;

			await popText({ text: "+Sniper", targetId: unit.id, speed: 2 });
			getChara(unit.id).updateUnitAttribute("attackPower", 10);
		})],
		onLeavePosition: [makeUnitEvent(unit => async () => {
			if (!isInBackline(unit)) return;

			await popText({ text: "-Sniper", targetId: unit.id, speed: 2 });
			getChara(unit.id).updateUnitAttribute("attackPower", -10);
		})]
	}
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

export const BERSERK = makeTraitSpec({
	id: "berserk" as TraitId,
	name: "Berserk",
	description: "When your health dropd below 50% HP for the first time, gain +15 Atk for the rest of combat",
	categories: [TRAIT_CATEGORY_OFFENSIVE],
	unitEvents: {
		onHalfHP: [makeUnitEvent((unit) => async () => {
			const hasBerserk = unit.statuses["berserk"];
			if (hasBerserk) return;
			await popText({ text: "On Half HP: Berserk", targetId: unit.id, speed: 2 });
			getChara(unit.id).updateUnitAttribute("attackPower", 15);
			addStatus(unit, "berserk");
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
						updatePlayerGoldIO(scene, 1); // Use the scene instance initialized in this module
					}
				})]
	}
});

export const INITIATIVE = makeTraitSpec({
	id: "initiative" as TraitId,
	name: "Initiative",
	description: "Hastes for 3s when combat starts",
	categories: [TRAIT_CATEGORY_OFFENSIVE],
	unitEvents: {
		// onBattleStart: [(unit) => async () => {
		// 	// TODO: create haste fn to apply value and display effect
		// 	popText({ text: "Initiative", targetId: unit.id, speed: 2 });
		// 	unit.hasted = 3000;
		// }]
	}
})

export const SPLASH = makeTraitSpec({
	id: "splash" as TraitId,
	name: "Splash",
	description: "40% of this unit’s Atk is dealt as damage to each adjacent enemy when you attack.",
	categories: [TRAIT_CATEGORY_OFFENSIVE],
	unitEvents: {
		// onAttackByMe: [(unit, target, damage, isCritical) => async () => {
		// 	const neighboringUnits = state.battleData.units
		// 		.filter(u => u.position.x === target.position.x && u.id !== unit.id);
		// 	for (const neighboringUnit of neighboringUnits) {
		// 		await getChara(neighboringUnit.id).damageUnit(damage * 0.4, isCritical);
		// 	}
		// }]
	}
});

export const STEALTH = makeTraitSpec({
	id: "stealth" as TraitId,
	name: "Stealth",
	description: "After attacking, become untargetable for 1s",
	categories: [TRAIT_CATEGORY_OFFENSIVE],
	unitEvents: {}
});

export const ASSASSIN = makeTraitSpec({
	id: "assassin" as TraitId,
	name: "Assassin",
	description: "First attack deals double damage",
	categories: [TRAIT_CATEGORY_OFFENSIVE],
	unitEvents: {
		onBattleStart: [makeUnitEvent((unit) => async () => {
			addStatus(unit, "double_damage");
		})],
		onAfterAttackByMe: [makeAttackEvent((unit) => async () => {
			if (!unit.statuses["double_damage"]) return;
			endStatus(unit.id, "double_damage");
		})]
	}
});

export const RALLY = makeTraitSpec({
	id: "rally" as TraitId,
	name: "Rally",
	description: "At the start of combat, grants +5 Atk to all allied units in the same column.",
	categories: [TRAIT_CATEGORY_OFFENSIVE],
	unitEvents: {
		onBattleStart: [makeUnitEvent((unit) => async () => {
			const neighboringUnits = getColumnNeighbors(state, unit)
			for (const neighboringUnit of neighboringUnits) {
				await popText({ text: "+Rally", targetId: neighboringUnit.id, speed: 2 });
				getChara(neighboringUnit.id).updateUnitAttribute("attackPower", 5)
			}
		})]
	}
});

export const EVADE = makeTraitSpec({
	id: "evade" as TraitId,
	name: "Evade",
	description: "Adds a 20% chance to dodge an attack",
	categories: [TRAIT_CATEGORY_DEFENSIVE],
	unitEvents: {
		onBattleStart: [makeUnitEvent((unit) => async () => {
			getChara(unit.id).updateUnitAttribute("evade", 20);
		})]
	}
});

export const CURSE = makeTraitSpec({
	id: "curse" as TraitId,
	name: "Curse",
	description: "Reduces the target's damage by 5 on each attack",
	categories: [TRAIT_CATEGORY_DEFENSIVE],
	unitEvents: {
		onAfterAttackByMe: [
			makeAttackEvent(
				(_unit, target, _damage, _critical, evaded) => async () => {
					if (evaded) return;

					await popText({ text: "Curse", targetId: target.id, speed: 2 });
					getChara(target.id).updateUnitAttribute("defense", -5);
				})
		]
	}
});

export const LIFESTEAL = makeTraitSpec({
	id: "lifesteal" as TraitId,
	name: "Lifesteal",
	description: "Heals 50% of the damage dealt",
	categories: [TRAIT_CATEGORY_DEFENSIVE],
	unitEvents: {
		onAfterAttackByMe: [
			makeAttackEvent((unit, _target, _damage, _critical, evaded) => async () => {
				if (evaded) return;
				await popText({ text: "Lifesteal", targetId: unit.id, speed: 2 });
				//healUnit(unit, damage * 0.5);
			})]
	}
});

export const LACERATE = makeTraitSpec({
	id: "lacerate" as TraitId,
	name: "Lacerate",
	description: "For 2 turns: deals 10 damage to the target at the end of each turn",
	categories: [TRAIT_CATEGORY_OFFENSIVE],
	unitEvents: {
		onAfterAttackByMe: [makeAttackEvent((_unit, target) => async () => {
			// TODO: implement status
			await popText({ text: "Lacerate", targetId: target.id, speed: 2 });
			addStatus(target, "lacerate", 2, makeUnitEvent(u => async () => {
				await popText({ text: "Lacerate", targetId: u.id, speed: 2 });
				//damageUnit(u.id, 10);
			}));
		})]
	}
});

export const BURN = makeTraitSpec({
	id: "burn" as TraitId,
	name: "Burn",
	description: "For 2 turns: deals 5 damage to the target at the end of each turn",
	categories: [TRAIT_CATEGORY_OFFENSIVE],
	unitEvents: {
		onAfterAttackByMe:
			[makeAttackEvent((_unit, target) => async () => {
				// TODO: implement status
				await popText({ text: "Burn", targetId: target.id, speed: 2 });
				addStatus(target, "burn", 2, makeUnitEvent(u => async () => {
					await popText({ text: "Burn", targetId: u.id, speed: 2 });
					//damageUnit(u.id, 5);
				}));
			})]
	}
});

export const REGENERATE = makeTraitSpec({
	id: "regenerate" as TraitId,
	name: "Regenerate",
	description: "Heals 15 HP at the end of each turn",
	categories: [TRAIT_CATEGORY_DEFENSIVE],
	unitEvents: {
		onTurnEnd: [makeUnitEvent((unit) => async () => {
			await popText({ text: "Regenerate", targetId: unit.id, speed: 2 });
			//healUnit(unit, 15);
		})]
	}
});

export const SPLIT_BLOB = makeTraitSpec({
	id: "split_blob" as TraitId,
	name: "Split Blob",
	description: "When this unit dies, it splits into 2 Tiny Blobs",
	categories: [TRAIT_CATEGORY_DEFENSIVE],
	unitEvents: {
		onDeath: [makeUnitEvent((unit) => async () => {

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

				console.log(slot)
				// TODO: mke this part of triat
				// const newUnit = makeUnit(unit.force, , asVec2(slot))

				// console.log("SPLIT_BLOB:: newUnit", newUnit.id);
				// state.battleData.units.push(newUnit);
				// await summonChara(newUnit)
			}

		})]
	}
});

export const REBORN = makeTraitSpec({
	id: "reborn" as TraitId,
	name: "Reborn",
	description: "When this unit dies, it is revived with 1 HP",
	categories: [TRAIT_CATEGORY_DEFENSIVE],
	unitEvents: {
		onDeath: [makeUnitEvent((unit) => async () => {

			if (unit.statuses["reborn"]) return; // already reborn

			// create a new unit with the same id and position
			const newUnit = makeUnit(unit.force, unit.cardId, unit.position);
			newUnit.hp = 1;
			addStatus(newUnit, "reborn");

			state.battleData.units.push(newUnit);

			popText({ text: "Reborn", targetId: unit.id, speed: 2 });

			summonChara(newUnit, false, false);

		})]
	}
});

export const UNDEAD = makeTraitSpec({
	id: "undead" as TraitId,
	name: "Undead",
	description: "This unit cannot be healed, but can be revived. It also immune to mind control and death effects.",
	categories: [TRAIT_CATEGORY_TRIBE],
	unitEvents: {}
});

export const UNDEAD_STRENGTH = makeTraitSpec({
	id: "undead_strength" as TraitId,
	name: "Undead Strength",
	description: "Allied undead units gain +20 attack and HP",
	categories: [TRAIT_CATEGORY_OFFENSIVE, TRAIT_CATEGORY_DEFENSIVE],
	unitEvents: {
		onBattleStart: [makeUnitEvent((unit) => async () => {
			const allies = state.battleData.units.filter(u => u.force === unit.force && u.id !== unit.id);
			const undeadAllies = allies.filter(u => u.traits.some(t => t.id === UNDEAD.id));
			for (const undead of undeadAllies) {
				await popText({ text: "+Undead Strength", targetId: undead.id, speed: 2 });
				// updateUnitAttribute(undead, "attackPower", 20);
				// updateUnitAttribute(undead, "maxHp", 20);
			}
		})]
	}
});

export const SUMMON_SKELETON = makeTraitSpec({
	id: "summon_skeleton" as TraitId,
	name: "Summon Skeleton",
	description: "Summons a skeleton to fight on your side",
	categories: [TRAIT_CATEGORY_COMPANION],
	unitEvents: {
		onAction: [makeUnitEvent(unit => async () => {
			const chara = getChara(unit.id);
			console.log(chara)
		})]
	}
});

export const REDUCE_CD = makeTraitSpec({
	id: "reduce_cd" as TraitId,
	name: "Reduce Cooldown",
	description: "Reduces all heroes' cooldowns",
	categories: [TRAIT_CATEGORY_COMPANION],
	relicEvents: { // Example: This trait's effect is for relics
		onBattleStart: [
			makeRelicBattleStartEvent((_traitData) => { // Assuming it doesn't need specific traitData for this effect
				getState().battleData.units.forEach(u => {
					u.cooldown = u.cooldown * 1.2;
				});
			})
		]
	}
});

export const INCREASE_MAX_HP = makeTraitSpec({
	id: "increase_max_hp" as TraitId,
	name: "Increase Max HP",
	description: "Increases all heroes' max HP",
	categories: [TRAIT_CATEGORY_COMPANION],
	relicEvents: { // Example: This trait's effect is for relics
		onBattleStart: [
			makeRelicBattleStartEvent(
				(_traitData) => { // Assuming it doesn't need specific traitData for this effect
					getState().battleData.units.forEach(u => {
						u.maxHp = u.maxHp * 1.2;
						u.hp = u.maxHp;
						const chara = getChara(u.id);
						chara.updateHpDisplay();
					});
				})]
	}
});

// TODO: remove this, use module import
export const traitSpecs: { [id: TraitId]: TraitSpec } = {
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
	[SUMMON_SKELETON.id]: SUMMON_SKELETON,
	[UNDEAD.id]: UNDEAD,
	[UNDEAD_STRENGTH.id]: UNDEAD_STRENGTH,
	[MELEE.id]: MELEE,
	[RANGED.id]: RANGED,
	[HEAL.id]: HEAL,
	[HEALING_WAVE.id]: HEALING_WAVE,
	[ARCANE_MISSILES.id]: ARCANE_MISSILES,
	[HASTE.id]: HASTE,
	[INITIATIVE.id]: INITIATIVE,
	[SUPPORT.id]: SUPPORT,
	[SLOW.id]: SLOW,
	[PLUNDER.id]: PLUNDER,
	[REDUCE_CD.id]: REDUCE_CD,
	[INCREASE_MAX_HP.id]: INCREASE_MAX_HP,
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
