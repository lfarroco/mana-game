/**
 * Unit type — a runtime instance created from a CardDefinition.
 */

import type { Effect, EffectReaction } from "./effect";

export type Unit = {
  id: string;
  cardId: string;
  pic: string;
  force: string;
  position: [number, number];

  rank: number;

  power: number;
  bonusPower: number;

  critical?: number;
  bonusCritical?: number;

  // Core attributes
  life: number;
  maxLife: number;
  shield: number;
  cooldown: number;
  evade: number;

  effects: Effect[];
  reactions: EffectReaction[];

  charge: number; // each tick the unit's charge accumulates here; when it reaches cooldown, the unit can act
  refresh: number; // post-action recovery time; must be 0 to act even if charged

  hasted: number;
  slowed: number;

  isCore: boolean;
};
