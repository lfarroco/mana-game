/// <reference types="jest" />

import {
	emptyProgress,
	gateCompletion,
	isGateSatisfied,
	recordProgress,
	type SlideProgress,
} from "./slideProgress";

const withEvents = (...events: Parameters<typeof recordProgress>[1][]): SlideProgress =>
	events.reduce<SlideProgress>(
		(progress, event) => recordProgress(progress, event),
		emptyProgress()
	);

describe("tutorial slide progress", () => {
	it("starts empty and satisfied only without a gate", () => {
		const progress = emptyProgress();
		expect(progress.casts.size).toBe(0);
		expect(progress.ticks).toBe(0);
		expect(progress.selections.size).toBe(0);
		expect(progress.flags.size).toBe(0);
		expect(isGateSatisfied(undefined, progress)).toBe(true);
	});

	describe("cast gates", () => {
		const gate = { kind: "cast", abilityIds: ["shield", "damage"] } as const;

		it("is unsatisfied until every listed ability was cast", () => {
			expect(isGateSatisfied(gate, emptyProgress())).toBe(false);
			expect(isGateSatisfied(gate, withEvents({ kind: "cast", id: "shield" }))).toBe(false);
			expect(
				isGateSatisfied(
					gate,
					withEvents({ kind: "cast", id: "shield" }, { kind: "cast", id: "damage" })
				)
			).toBe(true);
		});

		it("ignores casts of abilities the gate does not ask for", () => {
			expect(isGateSatisfied(gate, withEvents({ kind: "cast", id: "poison" }))).toBe(false);
		});

		it("counts a repeated cast once", () => {
			const progress = withEvents({ kind: "cast", id: "shield" }, { kind: "cast", id: "shield" });
			expect(progress.casts.size).toBe(1);
			expect(isGateSatisfied({ kind: "cast", abilityIds: ["shield", "damage"] }, progress)).toBe(
				false
			);
		});
	});

	describe("tick gates", () => {
		const gate = { kind: "ticks", count: 2 } as const;

		it("opens only after the requested number of ticks", () => {
			expect(isGateSatisfied(gate, emptyProgress())).toBe(false);
			expect(isGateSatisfied(gate, withEvents({ kind: "tick" }))).toBe(false);
			expect(isGateSatisfied(gate, withEvents({ kind: "tick" }, { kind: "tick" }))).toBe(true);
		});

		it("stays open past the requested count", () => {
			const progress = withEvents({ kind: "tick" }, { kind: "tick" }, { kind: "tick" });
			expect(isGateSatisfied(gate, progress)).toBe(true);
			expect(isGateSatisfied({ kind: "ticks", count: 3 }, progress)).toBe(true);
		});
	});

	describe("selection gates", () => {
		const gate = { kind: "selections", count: 2 } as const;

		it("opens once enough distinct rows were tapped", () => {
			expect(isGateSatisfied(gate, withEvents({ kind: "select", id: "cast" }))).toBe(false);
			expect(
				isGateSatisfied(
					gate,
					withEvents({ kind: "select", id: "cast" }, { kind: "select", id: "react" })
				)
			).toBe(true);
		});

		it("does not count the same row twice", () => {
			const progress = withEvents({ kind: "select", id: "cast" }, { kind: "select", id: "cast" });
			expect(isGateSatisfied(gate, progress)).toBe(false);
		});
	});

	describe("flag gates", () => {
		const gate = { kind: "flags", flags: ["placed"] } as const;

		it("opens when every named interaction was completed", () => {
			expect(isGateSatisfied(gate, emptyProgress())).toBe(false);
			expect(isGateSatisfied(gate, withEvents({ kind: "flag", id: "placed" }))).toBe(true);
			expect(isGateSatisfied(gate, withEvents({ kind: "flag", id: "other" }))).toBe(false);
		});

		it("treats a gate with no flags as already satisfied", () => {
			expect(isGateSatisfied({ kind: "flags", flags: [] }, emptyProgress())).toBe(true);
		});
	});

	it("returns the same object when an event changes nothing", () => {
		const progress = withEvents({ kind: "cast", id: "damage" });
		expect(recordProgress(progress, { kind: "cast", id: "damage" })).toBe(progress);
		expect(recordProgress(progress, { kind: "flag", id: "placed" })).not.toBe(progress);
	});

	describe("gateCompletion", () => {
		it("reports 1 for a slide with no gate", () => {
			expect(gateCompletion(undefined, emptyProgress())).toBe(1);
		});

		it("tracks each gate kind proportionally", () => {
			expect(
				gateCompletion(
					{ kind: "cast", abilityIds: ["a", "b"] },
					withEvents({ kind: "cast", id: "a" })
				)
			).toBe(0.5);
			expect(gateCompletion({ kind: "ticks", count: 4 }, withEvents({ kind: "tick" }))).toBe(0.25);
			expect(
				gateCompletion({ kind: "selections", count: 2 }, withEvents({ kind: "select", id: "x" }))
			).toBe(0.5);
			expect(gateCompletion({ kind: "flags", flags: [] }, emptyProgress())).toBe(1);
		});

		it("never exceeds 1", () => {
			const progress = withEvents({ kind: "tick" }, { kind: "tick" }, { kind: "tick" });
			expect(gateCompletion({ kind: "ticks", count: 2 }, progress)).toBe(1);
		});
	});
});
