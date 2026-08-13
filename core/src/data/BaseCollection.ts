import { CORE_CARDS } from "./cards/coreCards";
import { BRONZE_CARDS } from "./cards/bronzeCards";
import { SILVER_CARDS } from "./cards/silverCards";
import { GOLD_CARDS } from "./cards/goldCards";
import * as Models from "../Models";

// Tier design + balance conventions: docs/card-design-philosophy.md
// AP math (effect costs, trigger frequencies): docs/unit-balance.md
// Effect/reaction/targeting builders live in ./effectBuilders (shared with tests).

// Cards are defined by tier in data/cards/ and aggregated here so the public
// ALL_CARDS / CARDS_BY_ID exports stay stable.
const cards: Models.CardDefinition[] = [
  ...CORE_CARDS,
  ...BRONZE_CARDS,
  ...SILVER_CARDS,
  ...GOLD_CARDS,
];

/**
 * Static card lookup (immutable).
 * This replaces the old dynamic-registration pattern — cards are defined here
 * once and consumed directly, with no startup registration step needed.
 *
 * Tests that need custom cards should use Card.setCardsMap() / Card.resetCardsMap().
 */
export const ALL_CARDS: readonly Models.CardDefinition[] = cards;

export const CARDS_BY_ID: ReadonlyMap<string, Models.CardDefinition> = new Map(
  cards.map((c) => [c.id, c]),
);
