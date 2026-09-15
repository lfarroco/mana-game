/**
 * Tutorial progress store — "has this player seen the tutorial yet, and where
 * did they stop".
 *
 * Pure state machine over an injected storage adapter (the same pattern as
 * `@game/Stats/statsStore`), so it is unit-testable without a browser and the
 * client owns the only `localStorage` touch point. Every read is validated: a
 * corrupt or hostile payload must degrade to "not seen" rather than break the
 * title screen (see the storage-hardening notes in AGENTS.md).
 */

export interface TutorialStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export interface TutorialProgress {
  /** True once the player has exited the tutorial at least once. */
  readonly seen: boolean;
  /** True once the player reached the last slide. */
  readonly completed: boolean;
  /** 0-based index of the furthest slide reached. */
  readonly furthestSlide: number;
}

export const TUTORIAL_STORAGE_KEY = "mana-game-tutorial";

export const defaultTutorialProgress = (): TutorialProgress => ({
  seen: false,
  completed: false,
  furthestSlide: 0,
});

const clampSlide = (value: unknown): number =>
  typeof value === "number" && Number.isFinite(value)
    ? Math.max(0, Math.floor(value))
    : 0;

/**
 * Parse a stored payload. Anything that is not the expected shape degrades to
 * defaults field-by-field, so one bad field never discards the rest.
 */
export const parseTutorialProgress = (raw: string | null): TutorialProgress => {
  const defaults = defaultTutorialProgress();
  if (!raw) return defaults;

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return defaults;
  }

  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    return defaults;
  }

  const record = parsed as Record<string, unknown>;
  const completed = record.completed === true;
  return {
    // A completed run counts as seen even if the flag was lost.
    seen: record.seen === true || completed,
    completed,
    furthestSlide: clampSlide(record.furthestSlide),
  };
};

export interface TutorialStore {
  get(): TutorialProgress;
  /** Record that the player exited at `furthestSlide` (0-based). */
  markSeen(furthestSlide: number, totalSlides: number): TutorialProgress;
  /** Forget everything (used by tests and a future "reset tutorial" option). */
  reset(): TutorialProgress;
}

export const createTutorialStore = (
  storage: TutorialStorage,
): TutorialStore => {
  let cached: TutorialProgress | null = null;

  const read = (): TutorialProgress => {
    if (cached) return cached;
    let raw: string | null = null;
    try {
      raw = storage.getItem(TUTORIAL_STORAGE_KEY);
    } catch (error) {
      console.warn("tutorialStore", "failed to read tutorial progress", error);
    }
    cached = parseTutorialProgress(raw);
    return cached;
  };

  const write = (progress: TutorialProgress): TutorialProgress => {
    cached = progress;
    try {
      storage.setItem(TUTORIAL_STORAGE_KEY, JSON.stringify(progress));
    } catch (error) {
      // The tutorial is optional; a blocked store must never break the title.
      console.warn(
        "tutorialStore",
        "failed to persist tutorial progress",
        error,
      );
    }
    return progress;
  };

  return {
    get: read,
    markSeen: (furthestSlide, total) => {
      const lastIndex = Math.max(0, total - 1);
      const furthest = Math.min(
        Math.max(0, Math.floor(furthestSlide)),
        lastIndex,
      );
      const previous = read();
      return write({
        seen: true,
        completed: previous.completed || furthest >= lastIndex,
        furthestSlide: Math.max(previous.furthestSlide, furthest),
      });
    },
    reset: () => write(defaultTutorialProgress()),
  };
};
