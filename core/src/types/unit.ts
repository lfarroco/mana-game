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

  /**
   * Orb/encounter-granted abilities in their pristine (unscaled) shapes.
   *
   * Rank upgrades (`resetUnitEffectsToCardDefinition`) rebuild `effects` /
   * `reactions` from the card definition, which used to silently discard
   * everything an orb had granted (notably the void crystal's identity
   * effects). Entries recorded here are re-appended after the reset, so they
   * survive rank-ups. Removal paths (sacrifice orbs / sacrifice effect) must
   * drop the matching entry here too, or the ability resurrects next rank-up.
   */
  grantedEffects?: Effect[];
  grantedReactions?: EffectReaction[];

  charge: number; // each tick the unit's charge accumulates here; when it reaches cooldown, the unit can act
  refresh: number; // post-action recovery time; must be 0 to act even if charged

  hasted: number;
  slowed: number;
  /** D1 (docs/wacky-content-plan.md): ms of silence remaining — a silenced
   *  unit wastes its turn instead of casting (see CombatRunner.chargeUnits). */
  silenced: number;

  isCore: boolean;
};
