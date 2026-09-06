/**
 * Guest display-name generator — assigns a random `AdjectiveNounNN` handle
 * (e.g. `SwiftBadger07`) when a guest account is created without a chosen
 * name.
 *
 * Pure: randomness is injectable (`randomInt` returns 0..max-1) so tests get
 * deterministic names. The word lists stay short on purpose — every name must
 * fit the 24-character display-name limit (`playerService.validateDisplayName`)
 * with room to spare.
 */

export const GUEST_ADJECTIVES = [
  "Swift",
  "Brave",
  "Clever",
  "Sneaky",
  "Mighty",
  "Jolly",
  "Cosmic",
  "Frosty",
  "Peppy",
  "Rusty",
  "Sunny",
  "Stormy",
  "Lucky",
  "Wobbly",
  "Grizzly",
  "Nimble",
  "Dizzy",
  "Foggy",
  "Primal",
  "Quirky",
  "Rowdy",
  "Sleepy",
  "Sparky",
  "Wild",
] as const;

export const GUEST_NOUNS = [
  "Badger",
  "Mushroom",
  "Comet",
  "Pebble",
  "Fox",
  "Lantern",
  "Moth",
  "Otter",
  "Panda",
  "Raven",
  "Toad",
  "Turtle",
  "Wisp",
  "Yeti",
  "Acorn",
  "Beacon",
  "Cactus",
  "Drift",
  "Ember",
  "Fern",
  "Goblin",
  "Heron",
  "Ivy",
  "Jelly",
] as const;

export type GuestNameRandom = {
  /** Return an integer in [0, max). Defaults to Math.floor(Math.random() * max). */
  nextInt(max: number): number;
};

const defaultRandom: GuestNameRandom = {
  nextInt: (max) => Math.floor(Math.random() * max),
};

/**
 * Generate a guest handle: `Adjective + Noun + two-digit number (00-99)`.
 * The number is zero-padded so every name has the same shape.
 */
export function generateGuestName(
  random: GuestNameRandom = defaultRandom,
): string {
  const adjective = GUEST_ADJECTIVES[random.nextInt(GUEST_ADJECTIVES.length)];
  const noun = GUEST_NOUNS[random.nextInt(GUEST_NOUNS.length)];
  const number = random.nextInt(100).toString().padStart(2, "0");
  return `${adjective}${noun}${number}`;
}
