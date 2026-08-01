/**
 * Event — re-export of the typed pub/sub primitive from @mana/core.
 *
 * The framework builds on the same event primitive the rest of the codebase
 * uses, so screens and the ScreenManager share one event model.
 */
export type { Event } from "@mana/core/Event";
export { createEvent } from "@mana/core/Event";