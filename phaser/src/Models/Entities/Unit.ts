import { v4 } from "uuid";
import { Vec2, vec2Zero } from "../Geometry.pure";
import { getCardDefinition } from "./Card";
import { Effect, EffectReaction, EffectSourcePosition } from "../../TriggerSystem/TriggerSystem";


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
 * that can change during gameplay, such as position on the board, experience points (xp),
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

  power: number;

  cooldown: number;
  crit: number;
  evade: number;

  effects: Effect[];
  reactions: EffectReaction[];

  charge: number; // each tick the job's agi is added here. when it reaches 100, the job can act
  refresh: number; // the time it takes for the job to act again. Even if charged, this must be 0

  // @deprecated - these will be moved to statusEffects
  hasted: number;
  slowed: number;

};



export const makeUnit = (force: string, cardId: string, position = vec2Zero()): Unit => {
  const card = getCardDefinition(cardId);

  // Use pure function with runtime-specific ID generation
  const pureUnit = createUnitFromCard(
    force,
    {
      id: card.id,
      name: card.name,
      pic: card.pic,
      power: card.power,
      cooldown: card.cooldown,
      effects: card.effects || [],
      reactions: card.reactions || [],
    },
    position,
    v4() // Generate unique ID for runtime
  );

  return pureUnit as Unit;
};

/**
 * Minimal card-like definition for unit creation
 */
export type CardDefinition = {
  id: string;
  name: string;
  pic: string;
  power: number;
  cooldown: number;
  effects: Effect[];
  reactions: EffectReaction[];
};

/**
 * All the required properties for a Unit, extracted for pure creation
 */
export type PureUnitData = {
  id: string;
  cardId: string;
  name: string;
  pic: string;
  force: string;
  position: Vec2;
  power: number;
  cooldown: number;
  crit: number;
  evade: number;
  charge: number;
  refresh: number;
  hasted: number;
  slowed: number;
  effects: Effect[];
  reactions: {
    position: EffectSourcePosition;
    effectId: string; // e.g. "damage", "heal", "shield", "poison", "regen", "haste", "slow", "charge"
    effects: Effect[]
  }[];
};

/**
 * Pure function to create a unit from a card definition
 * @param force The force/team the unit belongs to
 * @param cardDef The card definition to base the unit on
 * @param position The position to place the unit at
 * @param id Optional custom ID, if not provided will use cardDef.id
 * @returns A unit object with all required properties
 */
export function createUnitFromCard(
  force: string,
  cardDef: CardDefinition,
  position: Vec2 = vec2Zero(),
  id: string
): PureUnitData {

  // inject source id in the effects and reaction effects
  const updatedEffects = cardDef.effects?.map(effect => ({
    ...effect,
    sourceId: id,
  })) ?? [];

  const updatedReactions = cardDef.reactions?.map(reaction => ({
    ...reaction,
    effects: reaction.effects.map(effect => ({
      ...effect,
      sourceId: id,
    })),
  })) ?? [];

  return {
    id,
    cardId: cardDef.id,
    name: cardDef.name,
    pic: cardDef.pic,
    force,
    position,
    power: cardDef.power || 0,
    cooldown: cardDef.cooldown,
    crit: 0,
    evade: 0,
    effects: updatedEffects,
    reactions: updatedReactions,
    charge: 0,
    refresh: 0,
    hasted: 0,
    slowed: 0
  };
}

/**
 * Pure function to create a unit with custom properties
 * Useful for testing where you want full control over unit properties
 * @param baseProps Basic required properties
 * @param overrides Optional property overrides
 * @returns A unit object with all required properties
 */
export function createCustomUnit(
  baseProps: {
    id: string;
    force: string;
    position?: Vec2;
  },
  overrides: Partial<Omit<PureUnitData, 'id' | 'force' | 'position'>> = {}
): PureUnitData {
  const defaults: Omit<PureUnitData, 'id' | 'force' | 'position'> = {
    cardId: `${baseProps.id}-card`,
    name: `Unit ${baseProps.id}`,
    pic: `${baseProps.id}.png`,
    power: 25,
    cooldown: 100,
    crit: 10,
    evade: 5,
    effects: [],
    reactions: [],
    charge: 0,
    refresh: 0,
    hasted: 0,
    slowed: 0,
  };

  return {
    id: baseProps.id,
    force: baseProps.force,
    position: baseProps.position || vec2Zero(),
    ...defaults,
    ...overrides
  };
}

/**
 * Pure function to create a test unit with sensible defaults
 * This is specifically designed for testing scenarios
 * @param id The unit ID
 * @param force The force/team
 * @param position Optional position (defaults to 0,0)
 * @returns A unit suitable for testing
 */
export function createTestUnit(
  id: string,
  force: string,
  position: Vec2 = vec2Zero()
): PureUnitData {
  return createCustomUnit({ id, force, position });
}

/**
 * Common card definitions for testing
 */
export const testCardDefinitions = {
  basicWarrior: {
    id: 'basic-warrior',
    name: 'Basic Warrior',
    pic: 'warrior.png',
    power: 30,
    cooldown: 100,
    traits: []
  },
  basicHealer: {
    id: 'basic-healer',
    name: 'Basic Healer',
    pic: 'healer.png',
    power: 20,
    cooldown: 120,
    traits: []
  },
  basicTank: {
    id: 'basic-tank',
    name: 'Basic Tank',
    pic: 'tank.png',
    power: 15,
    cooldown: 80,
    traits: []
  }
} as const;