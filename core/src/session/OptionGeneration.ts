/**
 * Encounter and Shop Option Generation
 *
 * Pure functions for generating available player choices during different game phases.
 * Deterministic based on session seed to ensure reproducibility across replays.
 */

import * as Models from "../Models";
import * as Card from "../Entities/Card";
import { CardDefinition } from "../Models";
import * as Random from "../math/Random";
import type { EncounterId } from "../types/action";
import { ENCOUNTER_BY_ID } from "../content/encounters";
import { LOSSES_TO_GAME_OVER } from "../math/Constants";
import { AWAKEN_POWER_LIST } from "../content/awakenPowers";
import type { AwakenPower } from "../content/awakenPowers";

type EncounterFilterType =
  | "damage"
  | "heal"
  | "shield"
  | "regen"
  | "poison"
  | "haste"
  | "slow"
  | "charge"
  | "increase_power"
  | "increase_critical"
  | "silver"
  | "gold"
  | "reaction_damage"
  | "reaction_shield"
  | "reaction_heal";

/** Describes a known encounter with its filter type for shop generation. */
type EncounterDefinition = {
  id: EncounterId;
  filterType: EncounterFilterType | null;
};

const ENCOUNTERS: EncounterDefinition[] = [
  { id: "upgrade_unit", filterType: null },
  { id: "armory", filterType: "damage" },
  { id: "healing_tent", filterType: "heal" },
  { id: "frontier_fort", filterType: "shield" },
  { id: "forest_pools", filterType: "regen" },
  { id: "toxic_chamber", filterType: "poison" },
  { id: "trial_circuit", filterType: "haste" },
  { id: "trappers_guild", filterType: "slow" },
  { id: "thunder_spire", filterType: "charge" },
  { id: "commanders_tent", filterType: "increase_power" },
  { id: "assassins_hideout", filterType: "increase_critical" },
  { id: "power_distributor", filterType: null },
  { id: "power_absorber", filterType: null },
  { id: "silver_shop", filterType: "silver" },
  { id: "gold_shop", filterType: "gold" },
  // ── New encounter types (2026-08-18, P1 slice) ──────────────────────
  { id: "rest_inn", filterType: null },
  { id: "gamblers_shrine", filterType: null },
  { id: "dark_ritual", filterType: null },
  { id: "scrap_salvage", filterType: null },
  { id: "soul_trade", filterType: "gold" },
  { id: "runesmith_damage", filterType: "reaction_damage" },
  { id: "runesmith_shield", filterType: "reaction_shield" },
  { id: "runesmith_heal", filterType: "reaction_heal" },
  // ── Wacky content slice (2026-08-19, Tier A encounters) ──────────────
  // NOTE: `oracles_riddle` was pulled from the pool (2026-08-25) pending
  // rework — it needs improvement before returning. `chaos_altar` (random
  // orb) was removed (2026-08-26): it gave the player no feedback, needs
  // a roulette-style reveal to return.
  { id: "roulette_wheel", filterType: null },
];

const ENCOUNTER_IDS: EncounterId[] = ENCOUNTERS.map((e) => e.id);

/**
 * Whether an encounter may appear in the current round, based on the
 * `minRound`/`maxRound` metadata in `content/encounters.ts`. Encounters
 * without metadata are always eligible. This is the round "firewall" that
 * keeps gated encounters (dark_ritual, soul_trade, runesmith shops, tier
 * shops) out of rounds they were not designed for (docs/new-encounter-types.md
 * §4.1/§4.3 — the full wave-split pools build on top of this).
 */
function isEncounterEligibleForRound(id: EncounterId, round: number): boolean {
  const meta = ENCOUNTER_BY_ID[id];
  if (!meta) return true;
  if (meta.minRound !== undefined && round < meta.minRound) return false;
  if (meta.maxRound !== undefined && round > meta.maxRound) return false;
  return true;
}

/**
 * Session-dependent eligibility — an encounter only appears when it can
 * actually do something in the player's current run state:
 * - `soul_trade` / `roulette_wheel`: blocked at 1 life left — their
 *   SessionTransitions guards reject a trade/spin that would reach
 *   LOSSES_TO_GAME_OVER, so offering them there would be a dead option.
 * - `rest_inn`: blocked at full lives — there is no loss to restore.
 */
function isEncounterEligibleForSession(
  id: EncounterId,
  session: Models.SessionData,
): boolean {
  if (
    (id === "soul_trade" || id === "roulette_wheel") &&
    session.losses + 1 >= LOSSES_TO_GAME_OVER
  ) {
    return false;
  }
  if (id === "rest_inn" && session.losses <= 0) {
    return false;
  }
  return true;
}

export function createEncounterOptions(session: Models.SessionData): {
  options: Models.PhaseOption[];
  encounterHistory: EncounterId[];
} {
  // Initialize encounter history if it doesn't exist
  const history = session.encounter_history
    ? [...session.encounter_history]
    : [];

  // Get the last 12 encounters (4 phases × 3 options each)
  const recentlyShownEncounters = new Set(history.slice(-12));

  const seedNum = Random.stringToSeed(session.seed);
  const shuffled = Random.shuffleWithSeed(ENCOUNTER_IDS, seedNum);

  // Round firewall: drop encounters whose minRound/maxRound window does not
  // include the current round (e.g. dark_ritual at round 1, rest_inn past
  // round 6).
  const roundEligible = shuffled.filter((id) =>
    isEncounterEligibleForRound(id, session.round),
  );

  // Session firewall: drop encounters that can't be used in the current run
  // state (soul_trade / roulette_wheel at 1 life left, rest_inn at full
  // lives) so the options never include dead picks.
  const sessionEligible = roundEligible.filter((id) =>
    isEncounterEligibleForSession(id, session),
  );

  // Filter out recently shown encounters
  const availableEncounters = sessionEligible.filter(
    (id) => !recentlyShownEncounters.has(id),
  );

  // If we don't have enough encounters (very rare), use all session-eligible
  // encounters (still respecting the round + session firewalls).
  const encountersToShow =
    availableEncounters.length >= 3 ? availableEncounters : sessionEligible;
  const selectedOptions = encountersToShow.slice(0, 3);

  // Return the updated history alongside the options
  return {
    options: selectedOptions.map((id) => ({ id })),
    encounterHistory: [...history, ...selectedOptions] as EncounterId[],
  };
}

/**
 * Look up the filter type for a given encounter id.
 */
function getEncounterFilterType(
  encounterId: string | null,
): EncounterFilterType | "" {
  if (!encounterId) return "";

  // A11 redesign (docs/wacky-content-plan.md): roulette result encounters are
  // reveal-only (never part of the generated pool), so their filters are
  // hardcoded here instead of added to the ENCOUNTERS generation table.
  if (encounterId === "roulette_gold_shop") return "gold";

  const def = ENCOUNTERS.find((e) => e.id === encounterId);
  return def?.filterType ?? "";
}

function getCardRank(card: CardDefinition): number {
  return card.rank ?? 1;
}

/**
 * Tier-based shop pricing: bronze 10, silver 15, gold 25.
 * Higher-tier cards are stronger but cost proportionally more, so
 * picking a gold card out of a wildcard encounter is a real investment.
 */
function getCardCost(card: CardDefinition): number {
  const rank = getCardRank(card);
  if (rank >= 3) return 25;
  if (rank === 2) return 15;
  return 10;
}

function cardMatchesEffectType(
  card: CardDefinition,
  filterType: Exclude<
    EncounterFilterType,
    "silver" | "gold" | "reaction_damage" | "reaction_shield" | "reaction_heal"
  >,
): boolean {
  return (
    card.effects?.some((effect) => effect.id === filterType) ||
    card.reactions?.some((reaction) =>
      reaction.effects?.some((effect) => effect.id === filterType),
    )
  );
}

/**
 * Filter cards by reaction trigger — the "silver identity" filter.
 *
 * A card qualifies only if it has a reaction that actually triggers on the
 * given effect (`reactions[].effectId === trigger`). A direct effect (a card
 * that merely does damage/shield/heal) does NOT make a card a "reacts to X"
 * pick. Generic `effectId: "all"` reactions are excluded too: they fire on
 * every basic ability, so admitting them would surface generic-good tempo
 * cards (e.g. `cadence_warden`) in every themed runesmith shop regardless of
 * the trigger — which reads wrong next to a "reacts to damage" header and
 * violates the silver "one archetype, no generic good" rule
 * (docs/card-system-risks-and-roadmap.md). Only silver (rank 2) cards are
 * returned: this is the targeted way to find synergy picks.
 */
function filterByReactionTrigger(
  cards: CardDefinition[],
  trigger: "damage" | "shield" | "heal",
): CardDefinition[] {
  return cards.filter(
    (card) =>
      getCardRank(card) === 2 &&
      card.reactions?.some((reaction) => reaction.effectId === trigger),
  );
}

/**
 * Filter cards by effect type, supporting both direct effects and reactions.
 *
 * A15 (docs/wacky-content-plan.md): effect-type shops admit silvers from
 * round 4 on (rank ≤ 2) so silver synergy cards surface in the most common
 * shop; before that they are bronze-only. The tier shops (`silver` / `gold`)
 * and the reaction shops are rank-locked by their own branches.
 */
function filterCardsByEffect(
  cards: CardDefinition[],
  filterType: EncounterFilterType,
  round: number,
): CardDefinition[] {
  if (filterType === "silver") {
    return cards.filter((card) => getCardRank(card) === 2);
  }

  if (filterType === "gold") {
    return cards.filter((card) => getCardRank(card) === 3);
  }

  if (filterType === "reaction_damage") {
    return filterByReactionTrigger(cards, "damage");
  }

  if (filterType === "reaction_shield") {
    return filterByReactionTrigger(cards, "shield");
  }

  if (filterType === "reaction_heal") {
    return filterByReactionTrigger(cards, "heal");
  }

  const maxRank = round >= 4 ? 2 : 1;
  return cards.filter(
    (card) =>
      getCardRank(card) <= maxRank && cardMatchesEffectType(card, filterType),
  );
}

/**
 * Generate the shop card options available after an encounter.
 * - Gold shop: 1 option (high-quality unit)
 * - Silver shop: 2 options (mid-tier units)
 * - Runesmith shops: 2 silver options (reaction-trigger filtered)
 * - Other encounters: 3 options (standard selection)
 */
export function generateShopOptions(
  session: Models.SessionData,
  action: Models.Action,
): Models.PhaseOption[] {
  if (action.type !== "select_encounter") {
    throw new Error(
      `Expected action type 'select_encounter' for generating shop options, got '${action.type}'`,
    );
  }

  const { encounterId } = action;

  // Determine number of options based on shop tier
  let numOptions = 3; // Default for most encounters
  if (encounterId === "gold_shop" || encounterId === "soul_trade") {
    numOptions = 1; // Gold shop: single premium unit
  } else if (encounterId === "roulette_gold_shop") {
    numOptions = 3; // A11 wheel result: a full gold shop (three choices)
  } else if (
    encounterId === "silver_shop" ||
    encounterId === "runesmith_damage" ||
    encounterId === "runesmith_shield" ||
    encounterId === "runesmith_heal"
  ) {
    numOptions = 2; // Silver shops: two quality options
  }

  const filterType = getEncounterFilterType(encounterId);
  let filteredCards = Card.getNonCores();

  if (filterType) {
    filteredCards = filterCardsByEffect(
      filteredCards,
      filterType,
      session.round,
    );
  }

  // Filter out cards where player already has a platinum (rank 4) unit
  const playerUnits = session.team?.units || [];
  const maxRankCardIds = new Set(
    playerUnits.filter((u) => u.rank >= 4).map((u) => u.cardId),
  );
  filteredCards = filteredCards.filter((card) => !maxRankCardIds.has(card.id));

  // Derive a numeric seed from the session seed so shop contents are
  // deterministic and reproducible during server-side replay.
  // We mix the current seed with "shop" and the encounter id to ensure
  // encounter options and shop options never collide in their seed space.
  //const shopSeedInput = session.seed + "shop" + (encounterId ?? "");
  const { picked, seed } = Random.pickRandomItemsSeeded(
    session,
    filteredCards,
    numOptions,
  );
  session.seed = seed;
  const options = picked.map((card) => ({
    id: card.id,
    cost: getCardCost(card),
    recruitRank: getCardRank(card),
  }));

  return options;
}

/** Deep-equality for reactions (JSON.stringify — mirrors hasIdentityOrbApplied). */
function reactionEquals(
  a: Models.EffectReaction,
  b: Models.EffectReaction,
): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

/**
 * Generate the three "awaken power" options offered when a bronze-origin unit
 * is promoted to gold. Seeded deterministic (advances `session.seed`), deduped
 * against reactions the unit already carries so every offered power is new.
 * Falls back to any available powers (rare) when fewer than 3 remain.
 */
export function generateAwakenOptions(
  session: Models.SessionData,
  unit: Models.Unit,
): Models.PhaseOption[] {
  const available = AWAKEN_POWER_LIST.filter(
    (power) => !unit.reactions.some((r) => reactionEquals(r, power.reaction)),
  );

  if (available.length === 0) return [];

  const { picked, seed } = Random.pickRandomItemsSeeded(session, available, 3);
  session.seed = seed;

  return picked.map((power: AwakenPower) => ({ id: power.id }));
}
