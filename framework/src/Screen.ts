/**
 * Screen — the engine-agnostic screen contract.
 *
 * A screen is a plain module exporting `{ name, init?, create, destroy? }`.
 * The ScreenManager navigates between screens; the createScreen() factory
 * produces objects that satisfy this shape while adding resource tracking.
 *
 * This file has no runtime imports (types only) so it stays unit-testable
 * without any engine mock.
 */

/** Minimal shape a screen must export to be navigable. */
export type ScreenModule = {
  name: string;
  create: () => void | Promise<void>;
  destroy?: () => void;
  init?: () => void;
  /** Optional phase-switch (e.g. options tabs). Used by deep-links. */
  go?: (phase: string) => Promise<void>;
  /** Current sub-state, if the screen supports phases. Used to avoid redundant deep-links. */
  currentPhase?: () => string | null;
  /**
   * Per-screen deep-link mapper.  Translates arbitrary route params into a
   * phase name to navigate to after create(), or null/undefined to skip.
   * Replaces the former hardcoded `"tab"` convention — each screen owns the
   * shape of its own deep-link params.
   */
  mapDeepLink?: (params: unknown) => string | null | undefined;
};
