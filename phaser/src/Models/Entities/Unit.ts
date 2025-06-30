import { v4 } from "uuid";
import { Vec2, vec2Zero } from "../Geometry";
import { TraitData } from "../../TraitSystem/Traits";
import { getCardDefinition } from "./Card";

/**
 * Represents a damage reduction effect applied by another unit.
 */
export type DamageReductionStack = {
  sourceUnitId: string;
  reductionPercent: number;
};

/**
 * Represents a morale damage reduction effect applied by a unit.
 */
export type MoraleReductionStack = {
  unitId: string;
  reductionPercent: number;
};

/**
 * Represents a temporary effect that will be reverted after a duration.
 */
export type StatusEffect = {
  type: 'haste' | 'slow' | 'freeze' | 'stun' | 'poison' | 'power_buff' | 'power_debuff' | 'fury_scaling' | 'cooldown_increase';
  remainingDuration: number;

  // For attribute modifications (power buffs/debuffs, fury scaling)
  attribute?: keyof Unit;
  amount?: number;

  // For cooldown modifications (haste/slow/freeze/stun)
  cooldownMultiplier?: number;
  originalCooldown?: number; // For freeze/stun restoration

  // For poison/DoT effects
  damagePerTick?: number;
  tickInterval?: number;
  timeSinceLastTick?: number;

  // For display and stacking
  displayName?: string;
  stackId?: string; // For effects that shouldn't stack (like fury)
  source?: string; // ID of the unit/trait that applied this effect
};

/**
 * @deprecated Use StatusEffect instead. Will be removed after migration is complete.
 */
export type TemporaryEffect = {
  effectType: 'attribute_modification' | 'cooldown_modification' | 'poison_tick' | 'freeze' | 'stun' | 'fury_scaling';
  attribute?: keyof Unit;
  amount?: number;
  remainingDuration: number;
  tickInterval?: number; // For DoT effects
  timeSinceLastTick?: number; // For DoT effects
  originalCooldown?: number; // For freeze/stun effects
  damagePerTick?: number; // For poison effects
  effectName?: string; // For display purposes
};
/**
 * Represents an "instance" of a `CardDefinition` within the game's logical state.
 * A `Unit` is an actual character or entity participating in the game, holding mutable data
 * that can change during gameplay, such as current HP, position on the board, experience points (xp),
 * status effects (like hasted, slowed), and current charge/cooldown for actions.
 * Game logic and systems primarily interact with `Unit` objects.
 * It is visually represented in the scene by a `Chara` object.
 */
export type Unit = {
  id: string;
  cardId: string;
  name: string;
  pic: string;
  force: string;
  position: Vec2;

  hp: number;
  maxHp: number;

  power: number;
  attackType: "damage" | "heal" | "armor" | null;

  cooldown: number;
  crit: number;
  evade: number;

  traits: TraitData[];

  charge: number; // each tick the job's agi is added here. when it reaches 100, the job can act
  refresh: number; // the time it takes for the job to act again. Even if charged, this must be 0

  // @deprecated - these will be moved to statusEffects
  hasted: number;
  slowed: number;

  // Defensive trait effects
  damageReductionStacks?: DamageReductionStack[];

  // New unified status effect system
  statusEffects?: StatusEffect[];

  // @deprecated - Use statusEffects instead. Will be removed after migration.
  temporaryEffects?: TemporaryEffect[];
};

export const makeUnit = (force: string, cardId: string, position = vec2Zero()): Unit => {

  const card = getCardDefinition(cardId);
  const unit = {
    ...card,
    id: v4(),
    cardId,
    force,
    position,
    maxHp: card.hp,
    crit: 0,
    evade: 0,
    xp: 0,
    attackType: card.powerType,
    power: card.power || 0,
    charge: 0,
    refresh: 0,
    hasted: 0,
    slowed: 0,
    traits: card.traits,
  }
  return unit as Unit
};
