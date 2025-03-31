// traits are a way to add special abilities or characteristics to units

import { snakeDistanceBetween } from "./Geometry";
import { State } from "./State";
import { Unit } from "./Unit";

export type TraitId = string & { __traitId: never };

// the units provided in the event handlers are temporary (don't need cleanup)
type Trait = {
	id: TraitId;
	name: string;
	description: string;
	onAcquire?: (state: State, unit: Unit) => Unit;
	onRemove?: (state: State, unit: Unit) => Unit;
	onTurnStart?: (state: State, unit: Unit) => Unit;
	onTurnEnd?: (state: State, unit: Unit) => Unit;
	onAttackByMe?: (state: State, unit: Unit, target: Unit) => Unit;
	onDefendByMe?: (state: State, unit: Unit, attacker: Unit) => Unit;
	onBattleStart?: (state: State, unit: Unit) => Unit;
	onBattleEnd?: (state: State, unit: Unit) => Unit;
	onUnitKillByMe?: (state: State, unit: Unit, target: Unit) => Unit;
	onUnitKill?: (state: State, unit: Unit, target: Unit) => Unit;
	onAlliedKilled?: (state: State, unit: Unit, target: Unit) => Unit;
	onEnemyKilled?: (state: State, unit: Unit, target: Unit) => Unit;
};

export const SHY: Trait = {
	id: "shy" as TraitId,
	name: "Shy",
	description: "+3 defense when aline in a row",
	onBattleStart: (state, unit) => {
		const neighboringUnits = state.battleData.units.filter((u) => {
			const distace = snakeDistanceBetween(
				u.position)(
					unit.position
				);
			return distace < 2 && u.id !== unit.id;
		});
		if (neighboringUnits.length === 0) {
			unit.defense += 1;
		}
		return unit;
	},
}

export const BRAVE: Trait = {
	id: "brave" as TraitId,
	name: "Brave",
	description: "+10 attack when in the front row",
	onBattleStart: (state, unit) => {
		if (unit.position.y === 0) {
			unit.attack += 1;
		}
		return unit;
	},
	onAttackByMe: (state, unit, target) => {
		if (unit.position.y === 0) {
			unit.attack += 100;
		}
		return unit;
	}
}

export const COWARD: Trait = {
	id: "coward" as TraitId,
	name: "Coward",
	description: "+2 defense when in the back row",
	onBattleStart: (state, unit) => {
		if (unit.position.y === 1) {
			unit.defense += 1;
		}
		return unit;
	},
}

export const OPTIMISTIC: Trait = {
	id: "optimistic" as TraitId,
	name: "Optimistic",
	description: "+1 attack if it is in the front row",
	onBattleStart: (state, unit) => {
		if (unit.position.y === 0) {
			unit.attack += 1;
		}
		return unit;
	},
}

// ---- Movement Traits ----
export const SWIFT: Trait = {
	id: "swift" as TraitId,
	name: "Swift",
	description: "This unit moves quickly, gaining an extra movement point each turn.",
	// Gives +1 movement at the start of each turn
};

export const TELEPORTER: Trait = {
	id: "teleporter" as TraitId,
	name: "Teleporter",
	description: "This unit can teleport to any empty tile once per battle.",
	// Would allow unit to move to any empty tile once per battle
};

// ---- Dark Traits ----
export const VAMPIRIC: Trait = {
	id: "vampiric" as TraitId,
	name: "Vampiric",
	description: "This unit heals for 10% of the damage it deals.",
	// Heals based on damage dealt during attacks
};

export const CURSED: Trait = {
	id: "cursed" as TraitId,
	name: "Cursed",
	description: "This unit has reduced health but gains +2 attack when below 50% health.",
	// Reduces max health but provides attack bonus when health is low
};

// ---- Holy Traits ----
export const BLESSED: Trait = {
	id: "blessed" as TraitId,
	name: "Blessed",
	description: "This unit regenerates 5% of its health at the start of each turn.",
	// Regenerates health at the start of each turn
};

export const GUARDIAN: Trait = {
	id: "guardian" as TraitId,
	name: "Guardian",
	description: "Nearby ally units gain +1 defense.",
	// Provides defense bonus to nearby allies
};

// ---- Natural Traits ----
export const TOXIC: Trait = {
	id: "toxic" as TraitId,
	name: "Toxic",
	description: "This unit's attacks poison enemies, dealing 1 damage per turn for 3 turns.",
	// Applies poison effect to enemies on attack
};

export const THORNY: Trait = {
	id: "thorny" as TraitId,
	name: "Thorny",
	description: "When attacked, this unit deals 2 damage back to the attacker.",
	// Deals damage to attackers when defending
};

// ---- Mental Traits ----
export const STRATEGIC: Trait = {
	id: "strategic" as TraitId,
	name: "Strategic",
	description: "This unit gains +1 attack for each ally adjacent to its target.",
	// Attack bonus based on allies near the target
};

export const INTIMIDATING: Trait = {
	id: "intimidating" as TraitId,
	name: "Intimidating",
	description: "Enemy units adjacent to this unit have -1 attack.",
	// Reduces attack of nearby enemies
};

export const KIND: Trait = {
	id: "kind" as TraitId,
	name: "Kind",
	description: "+1 attack when in the back row",
	onBattleStart: (state, unit) => {
		if (unit.position.y === 1) {
			unit.attack += 1;
		}
		return unit;
	},
}

export const CUNNING: Trait = {
	id: "cunning" as TraitId,
	name: "Cunning",
	description: "+1 attack when in the front row",
	onBattleStart: (state, unit) => {
		if (unit.position.y === 0) {
			unit.attack += 1;
		}
		return unit;
	},
}

export const GREEDY: Trait = {
	id: "greedy" as TraitId,
	name: "Greedy",
	description: "+1 attack when in the front row",
	onBattleStart: (state, unit) => {
		if (unit.position.y === 0) {
			unit.attack += 1;
		}
		return unit;
	},
}

export const LAZY: Trait = {
	id: "lazy" as TraitId,
	name: "Lazy",
	description: "+1 attack when in the back row",
	onBattleStart: (state, unit) => {
		if (unit.position.y === 1) {
			unit.attack += 1;
		}
		return unit;
	},
}
export const LOYAL: Trait = {
	id: "loyal" as TraitId,
	name: "Loyal",
	description: "+1 attack when in the back row",
	onBattleStart: (state, unit) => {
		if (unit.position.y === 1) {
			unit.attack += 1;
		}
		return unit;
	},
}

export const CLUMSY: Trait = {
	id: "clumsy" as TraitId,
	name: "Clumsy",
	description: "+1 attack when in the back row",
	onBattleStart: (state, unit) => {
		if (unit.position.y === 1) {
			unit.attack += 1;
		}
		return unit;
	},
}

export const BRILLIANT: Trait = {
	id: "brilliant" as TraitId,
	name: "Brilliant",
	description: "+1 attack when in the back row",
	onBattleStart: (state, unit) => {
		if (unit.position.y === 1) {
			unit.attack += 1;
		}
		return unit;
	},
}
