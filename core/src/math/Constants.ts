export const TIMEOUT_DAMAGE_START_TIME = 30000;
export const MAX_PARTY_SIZE = 9;
export const FORCE_ID_PLAYER = "PLAYER";
export const FORCE_ID_CPU = "CPU";
export const MIN_REFRESH_MS = 200;

// Round thresholds for shop availability
export const MIN_ROUND_FOR_SILVER_SHOP = 1;
export const MIN_ROUND_FOR_GOLD_SHOP = 6;

// Favor tokens (docs/new-encounter-types.md E1): skipping encounters
// accumulates favor; at this threshold the next encounter options are
// guaranteed a silver_shop option.
export const FAVOR_TOKENS_FOR_SILVER_SHOP = 3;
// A12 (docs/wacky-content-plan.md): the Lucky Pig triples the next skip's
// favor gain.
export const LUCKY_PIG_FAVOR_GAIN = 3;

// Victory / game-over thresholds
export const WINS_TO_WIN_GAME = 10;
export const INFINITE_MODE_THRESHOLD = 10;
export const LOSSES_TO_GAME_OVER = 4;
export const STARTING_LIVES = 4;

// Victory tier thresholds
export const GOLD_VICTORY_THRESHOLD = 10;
export const SILVER_VICTORY_THRESHOLD = 8;
export const BRONZE_VICTORY_THRESHOLD = 5;

// Unit unlock thresholds
export const INFINITE_ROUND_UNLOCK_THRESHOLD = 20;
export const TOTAL_OUTPUT_UNLOCK_THRESHOLD = 10_000;
export const TOTAL_DOT_UNLOCK_THRESHOLD = 1_000;
