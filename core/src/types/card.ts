/**
 * Card definition types — blueprints for game entities.
 */

import type { Effect, EffectReaction } from "./effect";

/**
 * Designer-facing archetype tags.
 *
 * These are a pure authoring aid — optional, never read at runtime and never
 * enforced by tests. Their purpose is to make the pool's archetype coverage
 * visible at a glance (e.g. "we have 10 disablers but only 2 chargers") and to
 * steer new card designs toward known archetypes rather than generic good
 * stuff. When tagging a card, prefer tags that reflect the card's *identity*
 * (how it wins / what it enables), not its basic action type.
 *
 * Vocabulary maps to mechanics used across the pool:
 * - grow_over_time: permanent increase_power / increase_critical stacking
 * - disabler: enemy debuffs (slow, decrease_power on enemies)
 * - charger: grants charge (self or ally)
 * - haster: grants haste
 * - crit_battery: crit-focused (increase_critical, on_crit reactions)
 * - type_engine: build-around — allAlliesOfType / every_100_X / on_battle_start engines
 * - cross_force: reactions with triggerTeam: "enemy"
 * - power_redistribution: distribute_power / absorb_power
 * - risk_reward: probabilistic or self-harming payoff
 * - team_buff: buffs row/column/allies (increase_power / haste to allies)
 */
export const CARD_TAGS = [
  "grow_over_time",
  "disabler",
  "charger",
  "haster",
  "crit_battery",
  "type_engine",
  "cross_force",
  "power_redistribution",
  "risk_reward",
  "team_buff",
] as const;

export type CardTag = (typeof CARD_TAGS)[number];

/**
 * The core ("crystal") themes — the filter key for themed core-upgrade-orb
 * generation and for the crystal-selection UI (e.g. "this is a heal crystal").
 *
 * The six original themes each map 1:1 to a basic-action family (docs
 * core-unit-onboarding.md §2). New cores may extend the list with a
 * non-basic-action identity theme: `overflow` (Radiant Crystal, CUB-G1) keys
 * off the over-heal/overflow identity while its baseline action is `heal`;
 * `thorns` (Verdant Crystal, CUB-G2) keys off the retaliate-when-hit identity
 * while its baseline action is `shield`.
 */
export const CORE_THEMES = [
  "regen",
  "damage",
  "shield",
  "heal",
  "poison",
  "haste",
  "overflow",
  "thorns",
] as const;

export type CoreTheme = (typeof CORE_THEMES)[number];

export type CardDefinition = {
  id: string;
  pic: string;
  power?: number;
  cooldown: number;
  effects: Effect[];
  reactions: EffectReaction[];
  isCore?: boolean;
  locked?: boolean;
  rank?: number;
  life?: number;
  critical?: number;
  /** Designer aid: one-line intent — card goal, archetype, when it shines. */
  description?: string;
  /** Designer aid: archetype labels from the CARD_TAGS vocabulary. */
  tags?: CardTag[];
  /**
   * Core-only: the basic-action family this crystal is themed around.
   * Used as the single filter key for themed core-upgrade-orb generation and
   * for the crystal-selection UI (see docs/core-unit-onboarding.md §2).
   */
  coreTheme?: CoreTheme;
};

export type CardCollection = {
  id: string;
  name: string;
  cards: CardDefinition[];
};
