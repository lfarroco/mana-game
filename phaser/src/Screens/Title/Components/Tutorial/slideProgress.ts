/**
 * Tutorial slide gate bookkeeping.
 *
 * The interactive slides lock **Next** until the player has actually used the
 * mechanic: cast each required ability, watch a status tick N times, tap N
 * effect rows, or complete the named interactions. This module is the single
 * interpreter of `TutorialGate` — the render layer only reports events, so the
 * "when does a slide count as understood" rule stays in one testable place.
 *
 * Pure: no Phaser, no DOM. The overlay owns one `SlideProgress` per visit.
 */

import type { TutorialGate } from "@game/content/tutorialSlides";

export interface SlideProgress {
	/** Ability ids cast at least once on this slide. */
	readonly casts: ReadonlySet<string>;
	/** Status ticks observed (poison/regen counters). */
	readonly ticks: number;
	/** Inspectable rows tapped. */
	readonly selections: ReadonlySet<string>;
	/** Named one-shot interactions completed. */
	readonly flags: ReadonlySet<string>;
}

export const emptyProgress = (): SlideProgress => ({
	casts: new Set(),
	ticks: 0,
	selections: new Set(),
	flags: new Set(),
});

export type ProgressEvent =
	| { kind: "cast"; id: string }
	| { kind: "tick" }
	| { kind: "select"; id: string }
	| { kind: "flag"; id: string };

/**
 * Apply one progress event. Returns the same object when nothing changed, so
 * callers can cheaply skip a re-render (identity comparison).
 */
export const recordProgress = (progress: SlideProgress, event: ProgressEvent): SlideProgress => {
	switch (event.kind) {
		case "cast": {
			if (progress.casts.has(event.id)) return progress;
			const casts = new Set(progress.casts);
			casts.add(event.id);
			return { ...progress, casts };
		}
		case "tick":
			return { ...progress, ticks: progress.ticks + 1 };
		case "select": {
			if (progress.selections.has(event.id)) return progress;
			const selections = new Set(progress.selections);
			selections.add(event.id);
			return { ...progress, selections };
		}
		case "flag": {
			if (progress.flags.has(event.id)) return progress;
			const flags = new Set(progress.flags);
			flags.add(event.id);
			return { ...progress, flags };
		}
	}
};

/**
 * True when the slide's gate is satisfied. A slide with no gate (the wrap-up)
 * is always satisfied — it is free play.
 */
export const isGateSatisfied = (
	gate: TutorialGate | undefined,
	progress: SlideProgress
): boolean => {
	if (!gate) return true;

	switch (gate.kind) {
		case "cast":
			return gate.abilityIds.every((id) => progress.casts.has(id));
		case "ticks":
			return progress.ticks >= gate.count;
		case "selections":
			return progress.selections.size >= gate.count;
		case "flags":
			// Every named interaction must be reported. A gate with no flags is
			// trivially satisfied (nothing to do).
			return gate.flags.every((id) => progress.flags.has(id));
	}
};

/** 0..1 completion for a gate, for a progress pip / bar. */
export const gateCompletion = (gate: TutorialGate | undefined, progress: SlideProgress): number => {
	if (!gate) return 1;

	const ratio = (done: number, total: number): number =>
		total <= 0 ? 1 : Math.min(1, done / total);

	switch (gate.kind) {
		case "cast":
			return ratio(
				gate.abilityIds.filter((id) => progress.casts.has(id)).length,
				gate.abilityIds.length
			);
		case "ticks":
			return ratio(progress.ticks, gate.count);
		case "selections":
			return ratio(progress.selections.size, gate.count);
		case "flags":
			return ratio(gate.flags.filter((id) => progress.flags.has(id)).length, gate.flags.length);
	}
};
